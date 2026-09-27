// ============================================================
// DeepgramVoiceAgentSession — session realtime Voice Agent (LiveSession)
// Cycle (donnees-modele §5) : connecting -> welcomed -> configuring -> active
// -> closing -> closed | failed. `Settings` part apres `Welcome` ; audio,
// texte et `KeepAlive` uniquement en `active`. Jamais reconnectee en interne :
// le serveur recree la session avec `conversationHistory` (recherche R10).
//
// `config.onError` supprime la session cote serveur : il n'est appele que pour
// une erreur qui rend la session inutilisable (erreur fournisseur, fermeture
// inattendue), et la session libere alors tout elle-meme. Les avertissements
// passent par l'evenement `agent.warning`.
// ============================================================

import {
  EventEmitter,
  createLogger,
  type LiveSession,
  type LiveSessionConfig,
  type SpeechServiceError,
  type ToolDeclaration,
} from '@owllayer/core';
import { createEvenByteAligner } from './audio.js';
import { handshakeHttpStatus, toSpeechServiceError } from './errors.js';
import type { DeepgramVoiceAgentEventMap } from './events.js';
import type {
  AgentConversationTextMessage,
  AgentFunctionCallCancelledMessage,
  AgentFunctionCallRequestMessage,
  AgentLatencyReportMessage,
  AgentProblemMessage,
  AgentSettingsMessage,
  AgentStartedSpeakingMessage,
  AgentThinkConfig,
} from './protocol/agent.messages.js';
import type { DeepgramConnectionLimits } from './settings.js';
import { DeepgramWebSocketConnection } from './transport/DeepgramWebSocketConnection.js';

const log = createLogger('OwlLayer:DeepgramVoiceAgent');

export const DEEPGRAM_AGENT_URL = 'wss://agent.deepgram.com/v1/agent/converse';
export const DEEPGRAM_AGENT_OUTPUT_MIME_TYPE = 'audio/pcm;rate=24000';

export type DeepgramVoiceAgentSessionState =
  | 'connecting'
  | 'welcomed'
  | 'configuring'
  | 'active'
  | 'closing'
  | 'closed'
  | 'failed';

/** Dependances de construction, fournies par `DeepgramVoiceAgentAdapter.createSession()`. */
export interface DeepgramVoiceAgentSessionOptions {
  apiKey: string;
  limits: DeepgramConnectionLimits;
  config: LiveSessionConfig;
  /** `Settings` complet (fonctions comprises) pour les tools initiaux. */
  settings: AgentSettingsMessage;
  /** Construit l'objet `think` complet pour `UpdateThink` a partir d'une liste de tools. */
  buildThink: (tools: readonly ToolDeclaration[]) => AgentThinkConfig;
}

/** Reponse intermediaire du serveur OwlLayer pendant l'approbation HITL d'un tool. */
function isPendingApprovalResult(result: unknown): boolean {
  return (
    typeof result === 'object' && result !== null && (result as { status?: unknown }).status === 'pending_approval'
  );
}

export class DeepgramVoiceAgentSession implements LiveSession {
  private _state: DeepgramVoiceAgentSessionState = 'connecting';
  private readonly connection: DeepgramWebSocketConnection;
  private readonly config: LiveSessionConfig;
  private readonly limits: DeepgramConnectionLimits;
  private readonly settings: AgentSettingsMessage;
  private readonly buildThink: (tools: readonly ToolDeclaration[]) => AgentThinkConfig;
  private readonly emitter = new EventEmitter<DeepgramVoiceAgentEventMap>();

  private handshakeTimer: ReturnType<typeof setTimeout> | undefined;
  private keepAliveTimer: ReturnType<typeof setInterval> | undefined;
  private thinkUpdateTimer: ReturnType<typeof setTimeout> | undefined;
  private started: { resolve: () => void; reject: (error: SpeechServiceError) => void } | undefined;
  private readonly ready: Promise<void>;

  private aligner = createEvenByteAligner();
  // Porte de sortie : fermee quand l'utilisateur reprend la parole, rouverte
  // quand l'agent recommence a parler (`AgentStartedSpeaking`).
  private outputGateClosed = false;
  /** Appels de fonction emis vers OwlLayer et encore sans reponse (id -> nom). */
  private readonly pendingCalls = new Map<string, string>();
  /** `UpdateThink` envoye, en attente de `ThinkUpdated`. */
  private thinkUpdatePending = false;
  /** Derniere liste de tools demandee pendant qu'un `UpdateThink` etait en attente. */
  private queuedTools: readonly ToolDeclaration[] | undefined;

  constructor(options: DeepgramVoiceAgentSessionOptions) {
    this.config = options.config;
    this.limits = options.limits;
    this.settings = options.settings;
    this.buildThink = options.buildThink;
    this.ready = new Promise<void>((resolve, reject) => {
      this.started = { resolve, reject };
    });

    this.connection = new DeepgramWebSocketConnection({
      url: DEEPGRAM_AGENT_URL,
      apiKey: options.apiKey,
      openTimeoutMs: options.limits.openTimeoutMs,
      onOpen: () => this.handleOpen(),
      onJsonMessage: (message) => this.handleJsonMessage(message),
      onBinaryMessage: (data) => this.handleBinaryMessage(data),
      onClose: (code, reason) => this.handleClose(code, reason),
      onError: (error) => this.handleSocketError(error),
    });
  }

  /** Resolue a `SettingsApplied` ; rejetee (session liberee) si la poignee de main echoue. */
  waitUntilActive(): Promise<void> {
    return this.ready;
  }

  get state(): DeepgramVoiceAgentSessionState {
    return this._state;
  }

  get isActive(): boolean {
    return this._state === 'active';
  }

  async sendAudio(audioBase64: string): Promise<void> {
    if (this._state !== 'active') return;
    this.connection.send(Buffer.from(audioBase64, 'base64'));
  }

  async sendText(text: string): Promise<void> {
    if (this._state !== 'active') return;
    this.sendJson({ type: 'InjectUserMessage', content: text });
  }

  async sendToolResponse(callId: string, name: string, result: unknown): Promise<void> {
    if (this._state !== 'active') return;
    if (!this.pendingCalls.has(callId)) {
      // Appel annule par Deepgram, deja repondu ou inconnu : rien n'est envoye.
      log.debug(`FunctionCallResponse skipped for unknown or cancelled call: ${callId}`);
      return;
    }
    // Deepgram clot un appel a la premiere reponse : la reponse intermediaire d'approbation
    // n'est pas transmise, seul le resultat final (approuve ou refuse) l'est.
    if (isPendingApprovalResult(result)) return;
    this.pendingCalls.delete(callId);
    this.sendJson({
      type: 'FunctionCallResponse',
      id: callId,
      name,
      content: typeof result === 'string' ? result : JSON.stringify(result ?? null),
    });
  }

  async endAudioTurn(): Promise<void> {
    if (this._state !== 'active') return;
    this.sendJson({ type: 'ForceEndTurn' });
  }

  /** Barge-in local : l'audio de l'agent deja en vol est ignore jusqu'a sa prochaine prise de parole. */
  async interrupt(): Promise<void> {
    if (this._state !== 'active') return;
    this.closeOutputGate();
  }

  /**
   * `ThinkUpdated` ne porte pas d'identifiant : un seul `UpdateThink` a la fois.
   * Une mise a jour demandee pendant l'attente remplace la precedente en file
   * (la derniere liste de tools gagne) et part a l'acquittement.
   */
  updateTools(tools: ToolDeclaration[]): void {
    if (this._state !== 'active') return;
    if (this.thinkUpdatePending) {
      this.queuedTools = [...tools];
      return;
    }
    this.sendThinkUpdate(tools);
  }

  close(): void {
    if (this._state === 'closed' || this._state === 'closing' || this._state === 'failed') return;
    this._state = 'closing';
    this.stopTimers();
    this.connection.close();
    this.failStart(
      toSpeechServiceError({
        kind: 'local',
        code: 'REMOTE_CLOSED',
        message: 'Deepgram Voice Agent session closed before it became active.',
      }),
    );
    // Liberation immediate, sans attendre la confirmation de fermeture du socket.
    this._state = 'closed';
    this.emitter.emit('agent.closed', { fatal: false });
    this.release();
  }

  /** Abonnement type aux evenements d'observabilite (contrat public `on`/`onAny`). */
  on<TType extends keyof DeepgramVoiceAgentEventMap & string>(
    type: TType,
    listener: (payload: DeepgramVoiceAgentEventMap[TType]) => void,
  ): () => void {
    return this.emitter.on(type, listener);
  }

  onAny(listener: Parameters<EventEmitter<DeepgramVoiceAgentEventMap>['onAny']>[0]): () => void {
    return this.emitter.onAny(listener);
  }

  // ------------------------------------------------------------------
  // Poignee de main
  // ------------------------------------------------------------------

  private handleOpen(): void {
    this.handshakeTimer = setTimeout(() => {
      this.handshakeTimer = undefined;
      this.fail(toSpeechServiceError({ kind: 'timeout', operation: 'handshake' }));
    }, this.limits.handshakeTimeoutMs);
  }

  private handleWelcome(): void {
    if (this._state !== 'connecting') return;
    this._state = 'welcomed';
    this.sendJson(this.settings);
    this._state = 'configuring';
  }

  private handleSettingsApplied(): void {
    if (this._state !== 'configuring') return;
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = undefined;
    }
    this._state = 'active';
    this.keepAliveTimer = setInterval(() => {
      if (this._state === 'active') this.sendJson({ type: 'KeepAlive' });
    }, this.limits.keepAliveIntervalMs);
    this.emitter.emit('agent.session.opened', {
      model: this.settings.agent.think.provider.model,
      voice: typeof this.settings.agent.speak.provider.model === 'string' ? this.settings.agent.speak.provider.model : undefined,
    });
    const started = this.started;
    this.started = undefined;
    started?.resolve();
  }

  // ------------------------------------------------------------------
  // Messages du fournisseur
  // ------------------------------------------------------------------

  private handleJsonMessage(message: unknown): void {
    const type = (message as { type?: string } | null)?.type;
    switch (type) {
      case 'Welcome':
        this.handleWelcome();
        return;
      case 'SettingsApplied':
        this.handleSettingsApplied();
        return;
      case 'Error':
        this.handleProviderError(message as AgentProblemMessage);
        return;
      case 'Warning': {
        const { code } = message as AgentProblemMessage;
        // Redige : jamais la description brute du fournisseur.
        this.emitter.emit('agent.warning', { message: `Deepgram Voice Agent reported a warning${code ? ` (${code})` : ''}.` });
        return;
      }
      default:
        break;
    }
    if (this._state !== 'active') return;
    switch (type) {
      case 'ConversationText':
        this.handleConversationText(message as AgentConversationTextMessage);
        return;
      case 'UserStartedSpeaking':
        this.closeOutputGate();
        this.config.onInterrupted?.();
        return;
      case 'AgentStartedSpeaking': {
        const latency = message as AgentStartedSpeakingMessage;
        this.outputGateClosed = false;
        this.emitter.emit('agent.latency.reported', {
          totalLatencyMs: latency.total_latency,
          ttsLatencyMs: latency.tts_latency,
        });
        return;
      }
      case 'AgentAudioDone':
        this.config.onWaitingForInput?.();
        return;
      case 'FunctionCallRequest':
        this.handleFunctionCallRequest(message as AgentFunctionCallRequestMessage);
        return;
      case 'FunctionCallCancelled':
        this.handleFunctionCallCancelled(message as AgentFunctionCallCancelledMessage);
        return;
      case 'ThinkUpdated':
        this.handleThinkUpdated();
        return;
      case 'LatencyReport': {
        const latency = message as AgentLatencyReportMessage;
        this.emitter.emit('agent.latency.reported', {
          totalLatencyMs: latency.total_latency,
          ttsLatencyMs: latency.tts_latency,
        });
        return;
      }
      case 'InjectionRefused':
        this.emitter.emit('agent.warning', { message: 'Deepgram Voice Agent refused an injected message.' });
        return;
      default:
        return;
    }
  }

  private handleConversationText(message: AgentConversationTextMessage): void {
    if (message.role === 'user') {
      this.config.onTranscript?.('user', message.content);
      return;
    }
    this.config.onTextOutput?.(message.content, true);
    this.config.onTranscript?.('agent', message.content);
  }

  private handleFunctionCallRequest(message: AgentFunctionCallRequestMessage): void {
    for (const call of message.functions ?? []) {
      if (call.client_side === false) {
        // Une fonction executee par Deepgram n'a pas ete declaree par OwlLayer (jamais d'endpoint).
        this.emitter.emit('agent.warning', { message: `Ignored a server-side function call: ${call.name}.` });
        continue;
      }
      let args: Record<string, unknown>;
      try {
        const parsed: unknown = call.arguments ? JSON.parse(call.arguments) : {};
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('arguments must be a JSON object');
        }
        args = parsed as Record<string, unknown>;
      } catch {
        // Arguments illisibles : l'agent recoit une erreur, le tool n'est jamais execute.
        this.sendJson({
          type: 'FunctionCallResponse',
          id: call.id,
          name: call.name,
          content: JSON.stringify({ error: 'Invalid JSON arguments.' }),
        });
        continue;
      }
      this.pendingCalls.set(call.id, call.name);
      this.config.onToolCall?.({ callId: call.id, name: call.name, args });
    }
  }

  private handleFunctionCallCancelled(message: AgentFunctionCallCancelledMessage): void {
    const callIds = (message.functions ?? []).map((fn) => fn.id).filter((id) => this.pendingCalls.delete(id));
    if (callIds.length === 0) return;
    this.config.onToolCallCancelled?.(callIds);
    this.emitter.emit('agent.tool.cancelled', { callIds });
  }

  private sendThinkUpdate(tools: readonly ToolDeclaration[]): void {
    this.thinkUpdatePending = true;
    this.sendJson({ type: 'UpdateThink', think: this.buildThink(tools) });
    this.thinkUpdateTimer = setTimeout(() => {
      this.thinkUpdateTimer = undefined;
      this.emitter.emit('agent.warning', { message: 'Deepgram Voice Agent did not acknowledge the tool update.' });
      this.finishThinkUpdate();
    }, this.limits.acknowledgementTimeoutMs);
  }

  private handleThinkUpdated(): void {
    if (!this.thinkUpdatePending) return;
    this.finishThinkUpdate();
  }

  private finishThinkUpdate(): void {
    if (this.thinkUpdateTimer) {
      clearTimeout(this.thinkUpdateTimer);
      this.thinkUpdateTimer = undefined;
    }
    this.thinkUpdatePending = false;
    const next = this.queuedTools;
    this.queuedTools = undefined;
    if (next && this._state === 'active') {
      this.sendThinkUpdate(next);
    }
  }

  private handleBinaryMessage(data: Buffer): void {
    if (this._state !== 'active' || this.outputGateClosed) return;
    const aligned = this.aligner(data);
    if (aligned.length > 0) {
      this.config.onAudioOutput?.(aligned.toString('base64'), DEEPGRAM_AGENT_OUTPUT_MIME_TYPE);
    }
  }

  private closeOutputGate(): void {
    this.outputGateClosed = true;
    this.aligner = createEvenByteAligner();
  }

  // ------------------------------------------------------------------
  // Erreurs et fermeture
  // ------------------------------------------------------------------

  private handleProviderError(message: AgentProblemMessage): void {
    this.fail(
      toSpeechServiceError({
        kind: 'local',
        code: 'PROVIDER_UNAVAILABLE',
        message: `Deepgram Voice Agent reported an error${message.code ? ` (${message.code})` : ''}.`,
      }),
    );
  }

  private handleSocketError(error: Error): void {
    const status = handshakeHttpStatus(error);
    if (this._state === 'connecting' && status !== undefined) {
      // Ouverture refusee (ex. cle invalide) : signalee avec son statut, pas comme une coupure.
      this.fail(toSpeechServiceError({ kind: 'http', status }));
      return;
    }
    if (this._state === 'connecting' && error.message.includes('timed out')) {
      this.fail(toSpeechServiceError({ kind: 'timeout', operation: 'open' }));
      return;
    }
    this.emitter.emit('agent.error', { error, message: error.message });
  }

  /** Fermeture non demandee par OwlLayer (les fermetures locales ont deja tout libere). */
  private handleClose(code: number, reason: string): void {
    if (this._state === 'closed' || this._state === 'failed' || this._state === 'closing') return;
    const wasActive = this._state === 'active';
    this._state = 'closed';
    this.stopTimers();
    const error = toSpeechServiceError({ kind: 'wsClose', code });
    if (wasActive) {
      this.config.onError?.(error);
      this.config.onClose?.();
    } else {
      this.failStart(error);
    }
    this.emitter.emit('agent.closed', { code, reason, fatal: true });
    this.release();
  }

  /** Erreur fatale : signalee une seule fois (creation rejetee ou `onError`), puis tout est libere. */
  private fail(error: SpeechServiceError): void {
    if (this._state === 'closed' || this._state === 'failed' || this._state === 'closing') return;
    const wasActive = this._state === 'active';
    this._state = 'failed';
    this.stopTimers();
    this.emitter.emit('agent.error', { error, message: error.message });
    if (wasActive) {
      this.config.onError?.(error);
      this.config.onClose?.();
    } else {
      this.failStart(error);
    }
    this.connection.close();
    this.release();
  }

  private failStart(error: SpeechServiceError): void {
    const started = this.started;
    this.started = undefined;
    started?.reject(error);
  }

  private stopTimers(): void {
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = undefined;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
    if (this.thinkUpdateTimer) {
      clearTimeout(this.thinkUpdateTimer);
      this.thinkUpdateTimer = undefined;
    }
  }

  private release(): void {
    this.pendingCalls.clear();
    this.queuedTools = undefined;
    this.thinkUpdatePending = false;
    this.emitter.clear();
  }

  private sendJson(message: unknown): void {
    this.connection.send(JSON.stringify(message));
  }
}
