import {
  createLogger,
  type ChatMessage,
  type LiveAdapter,
  type LiveSession,
  type LiveSessionConfig,
  type LLMAdapter,
  type LLMResponse,
  type LLMToolCall,
  type ShadowContext,
  type SpeechServiceError,
  type StreamingSTTService,
  type StreamingTTSService,
  type STTTurnEvent,
  type STTTurnStream,
  type TTSSpeechStream,
  type ToolDeclaration,
} from '@owllayer/core';

const log = createLogger('OwlLayer:StreamingPipelineLiveAdapter');

/** Format audio d'entree envoye au flux STT (voir R13 de research.md). */
const INPUT_AUDIO_MIME_TYPE = 'audio/pcm;rate=16000';

/** Nombre maximal d'appels de tools enchaines dans un meme tour. */
const DEFAULT_MAX_TOOL_CALLS_PER_TURN = 5;

/** Coupures distantes consecutives sans aucun tour avant de considerer le STT injoignable. */
const MAX_STT_CLOSURES_WITHOUT_TURN = 3;

/**
 * Options du composite {@link StreamingPipelineLiveAdapter}.
 */
export interface StreamingPipelineLiveAdapterOptions {
  /** Service STT capable d'ouvrir un flux oriente tours de parole. */
  stt: StreamingSTTService;
  /** Adaptateur LLM texte, provider-neutre. */
  llm: LLMAdapter;
  /** Service TTS capable d'ouvrir un flux de synthese vocale. */
  tts: StreamingTTSService;
  /** Nombre maximal d'appels de tools par tour. Defaut 5. */
  maxToolCallsPerTurn?: number;
  /**
   * Demarre la reponse sur `turn.tentative_end`. Defaut false.
   * Le texte et les tool calls d'une reponse speculative restent retenus jusqu'a `turn.ended`.
   */
  speculativeReplies?: boolean;
}

/** Etats internes d'un tour de la session pipeline (voir data-model.md §4). */
type PipelineTurnState =
  | 'listening'
  | 'speculative'
  | 'confirmed'
  | 'awaiting_tool'
  | 'speaking'
  | 'completed'
  | 'discarded'
  | 'interrupted';

/** Reponse LLM retenue en attendant la confirmation d'un tour speculatif. */
interface HeldSpeculativeResponse {
  /** Texte tentatif au moment de l'appel LLM speculatif — compare au texte de `turn.ended`. */
  tentativeText: string;
  response: LLMResponse;
}

/** Suivi d'un tour de parole en cours de traitement par le pipeline. */
interface PipelineTurn {
  turnIndex: number;
  state: PipelineTurnState;
  /** Transcript confirme du tour (jamais logue par defaut — cf. AUDIO_PIPELINE_RULES.md). */
  transcript: string;
  /** Nombre d'appels de tools deja emis pour ce tour. */
  toolCallCount: number;
  /** Identifiant du tool call actuellement emis, en attente de `sendToolResponse`. */
  pendingToolCallId?: string;
  /** Tool calls recus du LLM mais pas encore emis (traitement sequentiel, un a la fois). */
  queuedToolCalls: LLMToolCall[];
  /** Au moins une reponse texte a deja ete emise pour ce tour. */
  replied: boolean;
  /** Reponse LLM calculee de facon speculative, retenue jusqu'a confirmation ou abandon. */
  held?: HeldSpeculativeResponse;
}

const DEFAULT_SHADOW_CONTEXT: ShadowContext = {
  url: '',
  data: {},
  updatedAt: 0,
};

/**
 * Composite `LiveAdapter` provider-neutre : n'importe quel `StreamingSTTService` +
 * `LLMAdapter` + `StreamingTTSService` branche sur le slot `live` existant de
 * `OwlLayerServer`, sans changement AITP (voir contracts/server-voice-pipeline.md).
 */
export class StreamingPipelineLiveAdapter implements LiveAdapter {
  readonly name: string;

  constructor(private readonly options: StreamingPipelineLiveAdapterOptions) {
    this.name = `pipeline(${options.stt.name}+${options.llm.name}+${options.tts.name})`;
  }

  async createSession(config: LiveSessionConfig): Promise<LiveSession> {
    const session = new StreamingPipelineSession(this.options, config);
    await session.init();
    return session;
  }
}

/**
 * `LiveSession` interne du composite : un flux STT et un flux TTS rouverts a la demande,
 * au plus un tour actif (`confirmed | awaiting_tool | speaking`) a la fois.
 *
 * `config.onError` est reserve aux erreurs qui rendent la session inutilisable : cote
 * serveur, il supprime la session live. La session se ferme donc elle-meme juste apres.
 * Les incidents recuperables (coupure distante, echec TTS, plafond de tools) sont logues.
 */
class StreamingPipelineSession implements LiveSession {
  private sttStream!: STTTurnStream;
  private ttsStream!: TTSSpeechStream;
  private sttOpening?: Promise<STTTurnStream>;
  private ttsOpening?: Promise<TTSSpeechStream>;
  private readonly tools: ToolDeclaration[];
  private readonly messages: ChatMessage[];
  private readonly maxToolCallsPerTurn: number;
  private readonly speculativeReplies: boolean;
  /** Dernier tour signale par le flux STT (ecoute ou speculation). */
  private currentTurn?: PipelineTurn;
  /** Tour en cours de reponse : seul destinataire des resultats de tools. */
  private activeTurn?: PipelineTurn;
  private closed = false;
  private textTurnSeq = 0;
  /** Le flux STT courant a-t-il deja produit un evenement de tour ? */
  private sttStreamProducedTurn = false;
  /** Coupures distantes consecutives de flux STT n'ayant produit aucun tour. */
  private sttClosuresWithoutTurn = 0;

  constructor(
    private readonly deps: StreamingPipelineLiveAdapterOptions,
    private readonly config: LiveSessionConfig
  ) {
    this.tools = [...config.tools];
    this.messages = [...(config.conversationHistory ?? [])];
    this.maxToolCallsPerTurn = this.deps.maxToolCallsPerTurn ?? DEFAULT_MAX_TOOL_CALLS_PER_TURN;
    this.speculativeReplies = this.deps.speculativeReplies ?? false;
  }

  async init(): Promise<void> {
    this.sttStream = await this.openSTTStream();
    this.ttsStream = await this.openTTSStream();
  }

  get isActive(): boolean {
    return !this.closed;
  }

  private async openSTTStream(): Promise<STTTurnStream> {
    this.sttStreamProducedTurn = false;
    return this.deps.stt.openTurnStream({
      mimeType: INPUT_AUDIO_MIME_TYPE,
      languageCode: this.config.language,
      onEvent: (event) => this.onSTTEvent(event),
    });
  }

  private async openTTSStream(): Promise<TTSSpeechStream> {
    return this.deps.tts.openSpeechStream({
      voice: this.config.voice,
      languageCode: this.config.language,
      onAudio: (audioBase64, mimeType) => {
        this.config.onAudioOutput?.(audioBase64, mimeType);
      },
      onError: (error) => {
        // Un echec TTS ne fait jamais perdre le texte deja emis, ni la session.
        log.warn(`TTS stream error (${error.code ?? 'unknown'}): ${error.message}`);
      },
    });
  }

  /**
   * Flux STT utilisable : un provider sans keepalive (ex. Flux) peut fermer son flux pendant
   * un silence. L'audio suivant rouvre un seul flux, meme si plusieurs envois arrivent pendant
   * l'ouverture ; aucun audio ne part vers un flux ferme.
   */
  private async ensureSTTStream(): Promise<STTTurnStream> {
    if (this.sttStream.state !== 'closed') return this.sttStream;
    if (!this.sttOpening) {
      this.sttOpening = this.openSTTStream()
        .then((stream) => {
          // Session fermee pendant l'ouverture : le nouveau flux ne doit pas fuir.
          if (this.closed) void stream.close();
          this.sttStream = stream;
          return stream;
        })
        .finally(() => {
          this.sttOpening = undefined;
        });
    }
    return this.sttOpening;
  }

  private async ensureTTSStream(): Promise<TTSSpeechStream> {
    if (this.ttsStream.state !== 'closed') return this.ttsStream;
    if (!this.ttsOpening) {
      this.ttsOpening = this.openTTSStream()
        .then((stream) => {
          // Session fermee pendant l'ouverture : le nouveau flux ne doit pas fuir.
          if (this.closed) void stream.close();
          this.ttsStream = stream;
          return stream;
        })
        .finally(() => {
          this.ttsOpening = undefined;
        });
    }
    return this.ttsOpening;
  }

  async sendAudio(audioBase64: string): Promise<void> {
    if (this.closed) return;
    const stream = await this.ensureSTTStream();
    if (this.closed) return;
    stream.sendAudio(audioBase64);
  }

  async endAudioTurn(): Promise<void> {
    if (this.closed) return;
    if (this.sttStream.state === 'closed') return;
    await this.sttStream.endAudioTurn();
  }

  async interrupt(): Promise<void> {
    if (this.closed) return;
    for (const turn of [this.activeTurn, this.currentTurn]) {
      if (turn && this.isCancellableState(turn.state)) {
        this.discardTurn(turn, 'interrupted');
      }
    }
    this.activeTurn = undefined;
    await this.interruptPlayback();
  }

  async sendText(text: string): Promise<void> {
    if (this.closed) return;
    // Tour utilisateur confirme sans audio (pas de phase speculative possible).
    this.textTurnSeq += 1;
    const turn = this.createTurn(-this.textTurnSeq);
    await this.confirmTurn(turn, text);
  }

  async sendToolResponse(callId: string, _name: string, result: unknown): Promise<void> {
    if (this.closed) return;
    const turn = this.activeTurn;
    if (!turn || turn.state !== 'awaiting_tool' || turn.pendingToolCallId !== callId) {
      // Identifiant annule ou tour devenu obsolete : reponse tardive ignoree.
      log.debug(`sendToolResponse ignored (stale or cancelled): ${callId}`);
      return;
    }
    turn.pendingToolCallId = undefined;
    turn.state = 'confirmed';

    let response: LLMResponse;
    try {
      response = await this.deps.llm.handleToolResult(callId, result, this.tools);
    } catch (err) {
      this.failTurn(turn, err);
      return;
    }
    await this.handleLLMResponse(turn, response);
  }

  updateTools(tools: ToolDeclaration[]): void {
    this.tools.length = 0;
    this.tools.push(...tools);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const turn of [this.activeTurn, this.currentTurn]) {
      if (turn && this.isCancellableState(turn.state)) {
        this.discardTurn(turn, 'interrupted');
      }
    }
    this.activeTurn = undefined;
    void this.sttStream?.close();
    void this.ttsStream?.close();
  }

  // ------------------------------------------------------------------
  // STT — machine a etats des tours (voir data-model.md §4)
  // ------------------------------------------------------------------

  private onSTTEvent(event: STTTurnEvent): void {
    if (this.closed) return;
    switch (event.type) {
      case 'turn.started':
        this.markSTTTurn();
        this.onTurnStarted(event.turnIndex);
        break;
      case 'transcript.partial':
        // Pas de sortie provider-neutre pour le partiel : reserve a un usage futur (debug UI).
        this.markSTTTurn();
        break;
      case 'turn.tentative_end':
        this.markSTTTurn();
        void this.onTentativeEnd(event.turnIndex, event.text);
        break;
      case 'turn.resumed':
        this.markSTTTurn();
        this.onTurnResumed(event.turnIndex);
        break;
      case 'turn.ended':
        this.markSTTTurn();
        void this.onTurnEnded(event.turnIndex, event.text);
        break;
      case 'stream.error':
        this.onSTTStreamError(event.error, event.fatal);
        break;
      case 'stream.closed':
        // Deja traite par 'stream.error' quand la fermeture n'est pas volontaire.
        log.debug(`STT stream closed: ${event.reason}`);
        break;
    }
  }

  private markSTTTurn(): void {
    this.sttStreamProducedTurn = true;
    this.sttClosuresWithoutTurn = 0;
  }

  private onSTTStreamError(error: SpeechServiceError, fatal: boolean): void {
    if (!fatal) {
      log.warn(`STT stream warning (${error.code ?? 'unknown'}): ${error.message}`);
      return;
    }
    // L'enonce en cours d'ecoute est perdu ; un tour deja en reponse n'est pas concerne.
    const turn = this.currentTurn;
    if (turn && (turn.state === 'listening' || turn.state === 'speculative')) {
      this.discardTurn(turn, 'discarded');
    }
    if (error.code === 'REMOTE_CLOSED') {
      if (!this.sttStreamProducedTurn) {
        this.sttClosuresWithoutTurn += 1;
      }
      // Une coupure apres un vrai echange se rouvre au prochain audio ; des coupures repetees
      // sans aucun tour signalent une connexion impossible (cle, reseau) : on arrete la.
      if (this.sttClosuresWithoutTurn < MAX_STT_CLOSURES_WITHOUT_TURN) {
        log.warn('STT stream closed by the provider; it will reopen with the next audio.');
        return;
      }
    }
    this.failSession(new Error(`STT stream error: ${error.message}`));
  }

  private onTurnStarted(turnIndex: number): void {
    const previous = this.currentTurn;
    if (previous && previous.turnIndex !== turnIndex && previous.state === 'speculative') {
      this.discardTurn(previous, 'discarded');
    }
    const active = this.activeTurn;
    if (active && active.turnIndex !== turnIndex && active.state === 'speaking') {
      // Barge-in : l'utilisateur reparle pendant que l'agent parle.
      this.discardTurn(active, 'interrupted');
      this.activeTurn = undefined;
      void this.interruptPlayback();
    }
    this.currentTurn = this.createTurn(turnIndex);
  }

  private async onTentativeEnd(turnIndex: number, text: string): Promise<void> {
    const turn = this.getOrStartTurn(turnIndex);
    if (turn.state !== 'listening') return;
    turn.transcript = text;

    if (!this.speculativeReplies) return;

    turn.state = 'speculative';
    try {
      // Requete transitoire : le texte tentatif n'est pas encore commis a l'historique.
      const response = await this.deps.llm.chat(this.buildLLMRequest(text));
      // Le tour a pu changer d'etat pendant l'appel LLM (resume/interrompu) : verifier avant de retenir.
      if (turn.state !== 'speculative') return;
      turn.held = { tentativeText: text, response };
    } catch (err) {
      // L'appel sera refait sur `turn.ended` : l'echec speculatif n'est pas signale.
      log.debug(`Speculative LLM call failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private onTurnResumed(turnIndex: number): void {
    const turn = this.currentTurn;
    if (!turn || turn.turnIndex !== turnIndex) return;
    // Le texte et les tool calls speculatifs ne sont jamais emis.
    this.discardTurn(turn, 'discarded');
    this.currentTurn = this.createTurn(turnIndex);
  }

  private async onTurnEnded(turnIndex: number, text: string): Promise<void> {
    const turn = this.getOrStartTurn(turnIndex);
    if (this.isTerminalState(turn.state) || turn.state === 'confirmed') return;
    turn.transcript = text;
    this.config.onTranscript?.('user', text);

    const held = turn.held;
    turn.held = undefined;
    if (held && held.tentativeText === text) {
      // Promotion de la reponse speculative : le texte confirme est identique.
      this.activate(turn);
      this.messages.push({ role: 'user', content: text });
      await this.handleLLMResponse(turn, held.response);
      return;
    }

    // Pas de speculation retenue (ou texte different) : appel LLM normal.
    await this.confirmTurn(turn, text);
  }

  private createTurn(turnIndex: number): PipelineTurn {
    return { turnIndex, state: 'listening', transcript: '', toolCallCount: 0, queuedToolCalls: [], replied: false };
  }

  private getOrStartTurn(turnIndex: number): PipelineTurn {
    if (this.currentTurn && this.currentTurn.turnIndex === turnIndex) {
      return this.currentTurn;
    }
    this.currentTurn = this.createTurn(turnIndex);
    return this.currentTurn;
  }

  // ------------------------------------------------------------------
  // LLM / TTS — traitement d'un tour confirme
  // ------------------------------------------------------------------

  /** Un seul tour actif : le tour precedent encore en reponse est interrompu. */
  private activate(turn: PipelineTurn): void {
    const previous = this.activeTurn;
    if (previous && previous !== turn && this.isCancellableState(previous.state)) {
      const wasSpeaking = previous.state === 'speaking';
      this.discardTurn(previous, 'interrupted');
      if (wasSpeaking) {
        void this.interruptPlayback();
      }
    }
    turn.state = 'confirmed';
    this.activeTurn = turn;
  }

  private async confirmTurn(turn: PipelineTurn, text: string): Promise<void> {
    this.activate(turn);
    this.messages.push({ role: 'user', content: text });

    let response: LLMResponse;
    try {
      response = await this.deps.llm.chat(this.buildLLMRequest());
    } catch (err) {
      this.failTurn(turn, err);
      return;
    }
    await this.handleLLMResponse(turn, response);
  }

  private async handleLLMResponse(turn: PipelineTurn, response: LLMResponse): Promise<void> {
    if (this.isDiscardedOrInterrupted(turn)) return;

    const toolCalls = response.toolCalls ?? [];
    if (toolCalls.length > 0) {
      // Les appels enchaines passent avant les appels deja en file (meme ordre que le mode texte).
      turn.queuedToolCalls.unshift(...toolCalls);
    } else if (response.text) {
      await this.speak(turn, response.text);
      if (this.isDiscardedOrInterrupted(turn)) return;
    }

    const next = turn.queuedToolCalls.shift();
    if (next) {
      if (turn.toolCallCount >= this.maxToolCallsPerTurn) {
        log.warn(`Tool-call cap reached for turn ${turn.turnIndex} (max ${this.maxToolCallsPerTurn}), ignoring: ${next.name}`);
        turn.queuedToolCalls.length = 0;
        this.finishTurn(turn);
        return;
      }
      turn.toolCallCount += 1;
      turn.state = 'awaiting_tool';
      turn.pendingToolCallId = next.callId;
      this.config.onToolCall?.(next);
      return;
    }
    this.finishTurn(turn);
  }

  private async speak(turn: PipelineTurn, text: string): Promise<void> {
    turn.state = 'speaking';
    turn.replied = true;
    this.messages.push({ role: 'assistant', content: text });
    this.config.onTextOutput?.(text, true);
    this.config.onTranscript?.('agent', text);
    try {
      const tts = await this.ensureTTSStream();
      if (this.isDiscardedOrInterrupted(turn)) return;
      tts.appendText(text);
      await tts.flush();
    } catch (err) {
      // Le texte est deja parti : un echec TTS ne le retire pas et ne ferme pas la session.
      log.warn(`TTS failed for turn ${turn.turnIndex}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Fin du tour : le client quitte l'etat d'attente meme sans reponse texte. */
  private finishTurn(turn: PipelineTurn): void {
    if (this.isDiscardedOrInterrupted(turn)) return;
    if (!turn.replied) {
      this.config.onTextOutput?.('', true);
    }
    turn.state = 'completed';
    if (this.activeTurn === turn) {
      this.activeTurn = undefined;
    }
  }

  /** Echec LLM : le tour se termine, l'erreur est signalee sans fermer la session. */
  private failTurn(turn: PipelineTurn, err: unknown): void {
    if (this.isDiscardedOrInterrupted(turn)) return;
    log.error(`LLM call failed for turn ${turn.turnIndex}: ${err instanceof Error ? err.message : String(err)}`);
    this.finishTurn(turn);
  }

  /** Erreur rendant la session inutilisable : signalee une fois, puis la session se ferme. */
  private failSession(error: Error): void {
    if (this.closed) return;
    this.config.onError?.(error);
    this.close();
  }

  private async interruptPlayback(): Promise<void> {
    if (this.ttsStream.state !== 'closed') {
      await this.ttsStream.interrupt();
    }
    this.config.onInterrupted?.();
  }

  /** Isole dans une fonction distincte pour eviter que TS ne fige le type litteral de `turn.state`. */
  private isDiscardedOrInterrupted(turn: PipelineTurn): boolean {
    const state: PipelineTurnState = turn.state;
    return state === 'interrupted' || state === 'discarded';
  }

  private isCancellableState(state: PipelineTurnState): boolean {
    return state === 'speculative' || state === 'confirmed' || state === 'awaiting_tool' || state === 'speaking';
  }

  private isTerminalState(state: PipelineTurnState): boolean {
    return state === 'completed' || state === 'discarded' || state === 'interrupted';
  }

  /** Abandonne un tour : notifie l'annulation des tool calls retenus ou en attente. */
  private discardTurn(turn: PipelineTurn, finalState: 'discarded' | 'interrupted'): void {
    const cancelledIds: string[] = [];
    if (turn.pendingToolCallId) {
      cancelledIds.push(turn.pendingToolCallId);
      turn.pendingToolCallId = undefined;
    }
    if (turn.held?.response.toolCalls?.length) {
      for (const call of turn.held.response.toolCalls) {
        cancelledIds.push(call.callId);
      }
    }
    turn.held = undefined;
    turn.queuedToolCalls.length = 0;
    turn.state = finalState;
    if (cancelledIds.length > 0) {
      this.config.onToolCallCancelled?.(cancelledIds);
    }
  }

  /**
   * `extraUserText` ajoute un message utilisateur transitoire (non commis a l'historique) —
   * utilise pour l'appel LLM speculatif de `turn.tentative_end`. Sans argument, la requete
   * utilise l'historique deja commis (cas des tours confirmes, ou le texte a ete pousse avant).
   */
  private buildLLMRequest(extraUserText?: string) {
    // Toujours une copie : `this.messages` continue d'evoluer (tour suivant) apres cet appel,
    // un appelant qui garde une reference a `messages` ne doit pas voir de mutation tardive.
    const messages = extraUserText
      ? [...this.messages, { role: 'user', content: extraUserText } as ChatMessage]
      : [...this.messages];
    return {
      messages,
      tools: this.tools,
      context: DEFAULT_SHADOW_CONTEXT,
      systemPrompt: this.config.systemPrompt,
    };
  }
}
