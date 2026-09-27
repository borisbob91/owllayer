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
  /** Nombre d'appels de tools deja traites pour ce tour. */
  toolCallCount: number;
  /** Identifiant du tool call actuellement emis, en attente de `sendToolResponse`. */
  pendingToolCallId?: string;
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
 * `LiveSession` interne du composite : un flux STT et un flux TTS persistants
 * pour toute la duree de la session, un seul tour actif a la fois.
 */
class StreamingPipelineSession implements LiveSession {
  private sttStream!: STTTurnStream;
  private ttsStream!: TTSSpeechStream;
  private readonly tools: ToolDeclaration[];
  private readonly messages: ChatMessage[];
  private readonly maxToolCallsPerTurn: number;
  private readonly speculativeReplies: boolean;
  private currentTurn?: PipelineTurn;
  private closed = false;
  private textTurnSeq = 0;

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

    this.ttsStream = await this.deps.tts.openSpeechStream({
      voice: this.config.voice,
      languageCode: this.config.language,
      onAudio: (audioBase64, mimeType) => {
        this.config.onAudioOutput?.(audioBase64, mimeType);
      },
      onError: (error) => {
        // Règle : un échec TTS ne doit jamais faire perdre le texte déjà émis.
        this.config.onError?.(new Error(`TTS stream error: ${error.message}`));
      },
    });
  }

  get isActive(): boolean {
    return !this.closed;
  }

  /**
   * Ouvre (ou reouvre) le flux STT. Un provider sans keepalive (ex. Flux) peut fermer son
   * flux cote serveur pendant les silences ; l'audio suivant ne doit jamais partir vers un
   * flux ferme, et la session live ne doit ni se terminer ni rester inerte pour autant.
   */
  private async openSTTStream(): Promise<STTTurnStream> {
    return this.deps.stt.openTurnStream({
      mimeType: INPUT_AUDIO_MIME_TYPE,
      languageCode: this.config.language,
      onEvent: (event) => this.onSTTEvent(event),
    });
  }

  async sendAudio(audioBase64: string): Promise<void> {
    if (this.closed) return;
    if (this.sttStream.state === 'closed') {
      // Reconnexion transparente : aucun replay, l'historique/contexte reste dans `this.messages`.
      this.sttStream = await this.openSTTStream();
    }
    this.sttStream.sendAudio(audioBase64);
  }

  async endAudioTurn(): Promise<void> {
    if (this.closed) return;
    if (this.sttStream.state === 'closed') return;
    await this.sttStream.endAudioTurn();
  }

  async interrupt(): Promise<void> {
    if (this.closed) return;
    const turn = this.currentTurn;
    if (turn && this.isCancellableState(turn.state)) {
      this.discardTurn(turn, 'interrupted');
    }
    await this.ttsStream.interrupt();
    this.config.onInterrupted?.();
  }

  async sendText(text: string): Promise<void> {
    if (this.closed) return;
    // Tour utilisateur confirme sans audio (pas de phase speculative possible).
    this.textTurnSeq += 1;
    const turn: PipelineTurn = {
      turnIndex: -this.textTurnSeq,
      state: 'confirmed',
      transcript: text,
      toolCallCount: 0,
    };
    this.currentTurn = turn;
    await this.confirmTurn(turn, text);
  }

  async sendToolResponse(callId: string, _name: string, result: unknown): Promise<void> {
    if (this.closed) return;
    const turn = this.currentTurn;
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
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
      this.completeTurn(turn);
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
    if (this.currentTurn && this.isCancellableState(this.currentTurn.state)) {
      this.discardTurn(this.currentTurn, 'interrupted');
    }
    void this.sttStream?.close();
    void this.ttsStream?.close();
  }

  // ------------------------------------------------------------------
  // STT — machine a etats des tours (voir data-model.md §4)
  // ------------------------------------------------------------------

  private onSTTEvent(event: STTTurnEvent): void {
    switch (event.type) {
      case 'turn.started':
        this.onTurnStarted(event.turnIndex);
        break;
      case 'transcript.partial':
        // Pas de sortie provider-neutre pour le partiel : reserve a un usage futur (debug UI).
        break;
      case 'turn.tentative_end':
        void this.onTentativeEnd(event.turnIndex, event.text);
        break;
      case 'turn.resumed':
        this.onTurnResumed(event.turnIndex);
        break;
      case 'turn.ended':
        void this.onTurnEnded(event.turnIndex, event.text);
        break;
      case 'stream.error':
        // Tour en cours (y compris 'listening', avant toute confirmation) : signale, puis abandonne.
        this.config.onError?.(new Error(`STT stream error: ${event.error.message}`));
        if (event.fatal && this.currentTurn && !this.isTerminalState(this.currentTurn.state)) {
          this.discardTurn(this.currentTurn, 'interrupted');
        }
        break;
      case 'stream.closed':
        // 'remote' : fermeture attendue d'un provider sans keepalive (ex. Flux apres un silence) ;
        // deja signalee via 'stream.error' fatal si un tour etait en cours. La session live reste
        // active : `sendAudio` reouvrira un flux au prochain envoi (aucune reconnexion ici).
        if (event.reason !== 'client' && event.reason !== 'remote') {
          this.config.onError?.(new Error(`STT stream closed: ${event.reason}`));
        }
        break;
    }
  }

  private onTurnStarted(turnIndex: number): void {
    const previous = this.currentTurn;
    if (previous && previous.turnIndex !== turnIndex && previous.state === 'speaking') {
      // Barge-in implicite : l'utilisateur reparle pendant que l'agent parle.
      this.discardTurn(previous, 'interrupted');
      void (async () => {
        await this.ttsStream.interrupt();
        this.config.onInterrupted?.();
      })();
    }
    this.currentTurn = {
      turnIndex,
      state: 'listening',
      transcript: '',
      toolCallCount: 0,
    };
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
      if (turn.state === 'speculative') {
        this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  private onTurnResumed(turnIndex: number): void {
    const turn = this.currentTurn;
    if (!turn || turn.turnIndex !== turnIndex) return;
    // Le texte et les tool calls speculatifs ne sont jamais emis.
    this.discardTurn(turn, 'discarded');
    turn.state = 'listening';
    turn.held = undefined;
    turn.transcript = '';
    this.currentTurn = turn;
  }

  private async onTurnEnded(turnIndex: number, text: string): Promise<void> {
    const turn = this.getOrStartTurn(turnIndex);
    turn.transcript = text;
    this.config.onTranscript?.('user', text);

    if (turn.held && turn.held.tentativeText === text) {
      // Promotion de la reponse speculative : le texte confirme est identique.
      turn.state = 'confirmed';
      this.messages.push({ role: 'user', content: text });
      const response = turn.held.response;
      turn.held = undefined;
      await this.handleLLMResponse(turn, response);
      return;
    }

    // Pas de speculation retenue (ou texte different) : abandon puis appel LLM normal.
    turn.held = undefined;
    await this.confirmTurn(turn, text);
  }

  private getOrStartTurn(turnIndex: number): PipelineTurn {
    if (this.currentTurn && this.currentTurn.turnIndex === turnIndex) {
      return this.currentTurn;
    }
    const turn: PipelineTurn = { turnIndex, state: 'listening', transcript: '', toolCallCount: 0 };
    this.currentTurn = turn;
    return turn;
  }

  // ------------------------------------------------------------------
  // LLM / TTS — traitement d'un tour confirme
  // ------------------------------------------------------------------

  private async confirmTurn(turn: PipelineTurn, text: string): Promise<void> {
    turn.state = 'confirmed';
    this.messages.push({ role: 'user', content: text });

    let response: LLMResponse;
    try {
      response = await this.deps.llm.chat(this.buildLLMRequest());
    } catch (err) {
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
      this.completeTurn(turn);
      return;
    }
    if (this.isDiscardedOrInterrupted(turn)) return;
    await this.handleLLMResponse(turn, response);
  }

  /** Isole dans une fonction distincte pour eviter que TS ne figue le type litteral de `turn.state`. */
  private isDiscardedOrInterrupted(turn: PipelineTurn): boolean {
    const state: PipelineTurnState = turn.state;
    return state === 'interrupted' || state === 'discarded';
  }

  private async handleLLMResponse(turn: PipelineTurn, response: LLMResponse): Promise<void> {
    if (this.isDiscardedOrInterrupted(turn)) return;

    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolCall = response.toolCalls[0]!;
      if (turn.toolCallCount >= this.maxToolCallsPerTurn) {
        this.config.onError?.(
          new Error(`Tool-call cap reached for turn ${turn.turnIndex} (max ${this.maxToolCallsPerTurn})`)
        );
        this.completeTurn(turn);
        return;
      }
      turn.toolCallCount += 1;
      turn.state = 'awaiting_tool';
      turn.pendingToolCallId = toolCall.callId;
      this.config.onToolCall?.(toolCall);
      return;
    }

    const text = response.text ?? '';
    turn.state = 'speaking';
    if (text) {
      this.messages.push({ role: 'assistant', content: text });
      this.config.onTextOutput?.(text, true);
      try {
        this.ttsStream.appendText(text);
        await this.ttsStream.flush();
      } catch (err) {
        // Le texte est deja parti (ligne ci-dessus) : un echec TTS ne le retire pas.
        this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    } else {
      this.config.onTextOutput?.('', true);
    }
    this.completeTurn(turn);
  }

  private completeTurn(turn: PipelineTurn): void {
    if (turn.state !== 'interrupted' && turn.state !== 'discarded') {
      turn.state = 'completed';
    }
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
