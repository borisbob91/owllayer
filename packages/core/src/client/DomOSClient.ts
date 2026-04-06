import { MessageType } from '../protocol/adtp.types.js';
import type {
  ADTPMessage,
  ToolDeclaration,
  ToolCallPayload,
  AgentResponsePayload,
  AudioStreamPayload,
  VoiceStateEventPayload,
  SystemEventPayload,
} from '../protocol/adtp.types.js';
import { Messages, encode, tryDecode } from '../protocol/adtp.serializer.js';
import { ADTP_VERSION, SDK_VERSION } from '../protocol/adtp.constants.js';
import { createLogger } from '../utils/logger.js';
import { HITLPolicy } from '../security/hitl.policy.js';
import type { ApprovalRequest } from '../security/hitl.types.js';
import { RiskLevel } from '../tools/types.js';
import { EventEmitter } from './EventEmitter.js';
import type {
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventMap,
  DomOSClientEventType,
  DomOSClientTurnSource,
} from './events.js';

const log = createLogger('DomOS:Client');
const HANDSHAKE_TIMEOUT_MS = 5000;

// ============================================================
// Types
// ============================================================

export type ClientState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface RegisteredTool {
  declaration: ToolDeclaration;
  handler: (args: any) => Promise<unknown>;
  componentId?: string;
  /**
   * Si true, ce tool ne sera JAMAIS supprime par unregisterToolsByComponent.
   * Utilise par useAgentTool({ global: true }) et useNavigationTool.
   */
  global?: boolean;
  /** Nom du plugin ayant enregistre ce tool (pour DevTools). */
  source?: string;
}

/** Metadonnees d'un plugin installe — expose par DomOSClient.registeredPlugins. */
export interface PluginMeta {
  name: string;
  version: string;
  description?: string;
}

export type ClientTransport = 'websocket' | 'webrtc';

export interface DomOSClientOptions {
  /** Endpoint du serveur DomOS (ws:// ou wss://) */
  endpoint: string;

  /** Cle API publique */
  apiKey: string;

  /** Transport a utiliser (defaut: 'websocket') */
  transport?: ClientTransport;

  /** ICE servers pour WebRTC (defaut: STUN Google) */
  iceServers?: RTCIceServer[];

  /** Reconnexion automatique */
  autoReconnect?: boolean;

  /** Delai de reconnexion (ms) */
  reconnectDelay?: number;

  /** Max tentatives de reconnexion */
  maxReconnectAttempts?: number;

  /** Mode debug */
  debug?: boolean;

  /** Activer les virtual lines (acquisition HTTP avant connexion WS) */
  virtualLines?: boolean;
}

export interface ClientEventHandlers {
  onStateChange?: (state: ClientState) => void;
  onSessionId?: (sessionId: string) => void;
  onAgentResponse?: (text: string, done: boolean) => void;
  onToolCall?: (toolCall: ToolCallPayload) => void;
  onSystemEvent?: (kind: string, message?: string) => void;
  onAudioOutput?: (audioBase64: string, mimeType: string) => void;
  /** Appele lors d'un evenement vocal (turn_complete, interrupted, waiting_for_input) */
  onVoiceStateEvent?: (event: 'turn_complete' | 'interrupted' | 'waiting_for_input', reason?: string) => void;
  onError?: (error: Error) => void;
  onToolsSync?: (tools: ToolDeclaration[]) => void;
  /** Appele quand une ligne virtuelle est acquise */
  onLineAcquired?: (lineNumber: string, waiting: boolean) => void;
  /** Appele quand toutes les lignes sont occupees (file d'attente aussi pleine) */
  onLineBusy?: () => void;
  /** Appele quand la ligne d'attente est promue et la connexion est en cours */
  onLineReady?: (lineNumber: string) => void;
  /** Appele quand une approbation HITL est requise */
  onApprovalRequest?: (request: ApprovalRequest, resolve: (approved: boolean) => void) => void;
}

// ============================================================
// DomOSClient - Client framework-agnostic
// ============================================================

/**
 * DomOSClient - Le client universel du framework DomOS.
 *
 * Gere la connexion WebSocket, le registre de tools local,
 * la synchronisation des tools avec le serveur, et le Shadow Context.
 *
 * Utilise par @domos/react et @domos/vue comme couche bas-niveau.
 *
 * @example
 * ```ts
 * const client = new DomOSClient({
 *   endpoint: 'ws://localhost:3000/domos',
 *   apiKey: 'pk_demo_local',
 * });
 *
 * client.registerTool({
 *   declaration: { name: 'greet', description: 'Dire bonjour' },
 *   handler: async () => 'Bonjour !',
 * });
 *
 * client.connect();
 * client.sendText('Bonjour agent !');
 * ```
 */
export class DomOSClient {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private options: Required<DomOSClientOptions>;
  private handlers: ClientEventHandlers = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  // --- State ---
  private _state: ClientState = 'disconnected';
  private _sessionId: string | null = null;

  // --- Tool Registry local ---
  private tools = new Map<string, RegisteredTool>();
  private hitlPolicy = new HITLPolicy();
  private pendingApprovals = new Map<
    string,
    { toolCall: ToolCallPayload; tool: RegisteredTool; request: ApprovalRequest }
  >();

  private eventEmitter = new EventEmitter<DomOSClientEventMap>();
  private isTurnActive = false;

  // --- Plugin Registry (DevTools) ---
  private installedPlugins = new Map<string, PluginMeta>();

  // --- Shadow Context ---
  private contextData: Record<string, unknown> = {};

  // --- Virtual Lines ---
  private _lineToken: string | null = null;
  private _lineNumber: string | null = null;
  private _isWaiting = false;
  private waitingPollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: DomOSClientOptions) {
    this.options = {
      autoReconnect: true,
      reconnectDelay: 2000,
      maxReconnectAttempts: 10,
      debug: false,
      transport: 'websocket',
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      virtualLines: false,
      ...options,
    };
  }

  // ============================================================
  // Getters
  // ============================================================

  get state(): ClientState {
    return this._state;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  get isConnected(): boolean {
    return this._state === 'connected' || this._state === 'listening';
  }

  get registeredTools(): ToolDeclaration[] {
    return Array.from(this.tools.values()).map((t) => t.declaration);
  }

  /** Version enrichie pour les DevTools : inclut source (nom du plugin) et flag global. */
  get toolsInfo(): Array<ToolDeclaration & { source?: string; global?: boolean }> {
    return Array.from(this.tools.values()).map((t) => ({
      ...t.declaration,
      ...(t.source ? { source: t.source } : {}),
      ...(t.global ? { global: true } : {}),
    }));
  }

  /** Plugins installes via installPlugin() — pour DevTools. */
  get registeredPlugins(): PluginMeta[] {
    return Array.from(this.installedPlugins.values());
  }

  get toolCount(): number {
    return this.tools.size;
  }

  /** Numero de ligne virtuelle acquise */
  get lineNumber(): string | null {
    return this._lineNumber;
  }

  /** true si on est sur la ligne d'attente */
  get isWaiting(): boolean {
    return this._isWaiting;
  }

  // ============================================================
  // Event Handlers
  // ============================================================

  on(handlers: ClientEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  onEvent<TType extends DomOSClientEventType>(
    type: TType,
    listener: DomOSClientEventListener<TType>
  ): () => void {
    return this.eventEmitter.on(type, listener);
  }

  offEvent<TType extends DomOSClientEventType>(
    type: TType,
    listener: DomOSClientEventListener<TType>
  ): void {
    this.eventEmitter.off(type, listener);
  }

  onAnyEvent(listener: DomOSClientAnyEventListener): () => void {
    return this.eventEmitter.onAny(listener);
  }

  offAnyEvent(listener: DomOSClientAnyEventListener): void {
    this.eventEmitter.offAny(listener);
  }

  // ============================================================
  // Connexion
  // ============================================================

  async connect(): Promise<void> {
    if (this.ws || this.dc) {
      this.disconnect();
    }

    // Si virtual lines actives, acquerir une ligne d'abord
    if (this.options.virtualLines) {
      const acquired = await this.acquireLine();
      if (!acquired) return;
    }

    if (this.options.transport === 'webrtc') {
      this.connectWebRTC();
    } else {
      this.connectWebSocket();
    }
  }

  private connectWebSocket(): void {
    this.setState('connecting');

    const queryParts: string[] = [];
    const apiKey = this.options.apiKey?.trim();
    if (apiKey) {
      queryParts.push(`apiKey=${encodeURIComponent(apiKey)}`);
    }
    if (this._lineToken) {
      queryParts.push(`lineToken=${encodeURIComponent(this._lineToken)}`);
    }

    const sep = this.options.endpoint.includes('?') ? '&' : '?';
    const suffix = queryParts.length > 0 ? `${sep}${queryParts.join('&')}` : '';
    const url = `${this.options.endpoint}${suffix}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.log('Connexion WebSocket ouverte');

        // Envoyer HANDSHAKE_INIT
        this.send(Messages.handshakeInit(apiKey || 'anonymous', 'DomOSClient', '0x0', SDK_VERSION, ADTP_VERSION));
        this.startHandshakeTimeout();
      };

      this.ws.onmessage = (event) => {
        const message = tryDecode(String(event.data));
        if (message) {
          this.handleMessage(message);
        }
      };

      this.ws.onclose = (event) => {
        this.log(`WebSocket ferme: ${event.code} ${event.reason}`);
        this.clearHandshakeTimeout();
        this.ws = null;
        this.setState('disconnected');

        // Ne pas reconnecter sur les codes d'erreur permanents (auth rejetee, trop de connexions,
        // lineToken invalide, etc.). Retenter serait inutile et provoquerait un flood de warnings.
        const PERMANENT_FAILURE_CODES = [1003, 1008, 1011];
        const isPermanentFailure = PERMANENT_FAILURE_CODES.includes(event.code);

        if (!isPermanentFailure && this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (isPermanentFailure) {
          this.log(`Reconnexion annulee: code permanent ${event.code} — ${event.reason}`);
          // Si le lineToken est invalide (server restart) → vider le sessionStorage pour
          // que le prochain connect() manuel re-acquiere proprement une ligne fraiche.
          if (event.reason?.includes('lineToken')) {
            this.clearLineToken();
          }
          this.handlers.onSystemEvent?.('error', event.reason || `Connexion refusee (${event.code})`);
        }
      };

      this.ws.onerror = () => {
        this.log('Erreur WebSocket');
        this.clearHandshakeTimeout();
        const error = new Error('WebSocket error');
        this.emitSystemError(error.message, 'error');
        this.handlers.onError?.(error);
        this.setState('error');
      };
    } catch (err) {
      this.clearHandshakeTimeout();
      this.setState('error');
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitSystemError(error.message, 'error');
      this.handlers.onError?.(error);
    }
  }

  private async connectWebRTC(): Promise<void> {
    this.setState('connecting');

    try {
      this.pc = new RTCPeerConnection({
        iceServers: this.options.iceServers,
      });

      // Creer un DataChannel fiable et ordonne
      this.dc = this.pc.createDataChannel('adtp', { ordered: true });

      this.dc.onopen = () => {
        this.reconnectAttempts = 0;
        this.log('DataChannel ouvert');
        this.send(Messages.handshakeInit((this.options.apiKey?.trim() || 'anonymous'), 'DomOSClient', '0x0', SDK_VERSION, ADTP_VERSION));
        this.startHandshakeTimeout();
      };

      this.dc.onmessage = (event) => {
        const message = tryDecode(String(event.data));
        if (message) {
          this.handleMessage(message);
        }
      };

      this.dc.onclose = () => {
        this.log('DataChannel ferme');
        this.clearHandshakeTimeout();
        this.cleanupWebRTC();
        this.setState('disconnected');

        // DataChannel n'expose pas le code de fermeture, on reconnecte normalement
        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.dc.onerror = () => {
        this.log('Erreur DataChannel');
        this.clearHandshakeTimeout();
        const error = new Error('WebRTC DataChannel error');
        this.emitSystemError(error.message, 'error');
        this.handlers.onError?.(error);
        this.setState('error');
      };

      // Creer l'offre SDP
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Attendre les ICE candidates
      await new Promise<void>((resolve) => {
        if (!this.pc) return resolve();
        this.pc.onicegatheringstatechange = () => {
          if (this.pc?.iceGatheringState === 'complete') resolve();
        };
        setTimeout(resolve, 3000);
      });

      // Deduire l'URL de signaling depuis l'endpoint WebSocket
      const signalingUrl = this.options.endpoint
        .replace('ws://', 'http://')
        .replace('wss://', 'https://')
        .replace(/\/?$/, '/rtc');

      // Ajouter lineToken en query param si virtual lines actives
      const urlWithToken = this._lineToken 
        ? `${signalingUrl}?lineToken=${this._lineToken}`
        : signalingUrl;

      const response = await fetch(urlWithToken, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`
        },
        body: JSON.stringify({
          type: 'offer',
          sdp: this.pc.localDescription?.sdp,
        }),
      });

      if (!response.ok) {
        throw new Error(`Signaling failed: ${response.status}`);
      }

      const { sdp, candidates } = await response.json();
      await this.pc.setRemoteDescription({ type: 'answer', sdp });

      // Ajouter les ICE candidates du serveur
      for (const candidate of candidates || []) {
        await this.pc.addIceCandidate(candidate);
      }
    } catch (err) {
      this.cleanupWebRTC();
      this.clearHandshakeTimeout();
      this.setState('error');
      const error = err instanceof Error ? err : new Error(String(err));
      this.emitSystemError(error.message, 'error');
      this.handlers.onError?.(error);
    }
  }

  private cleanupWebRTC(): void {
    this.clearHandshakeTimeout();
    if (this.dc) {
      try { this.dc.close(); } catch {}
      this.dc = null;
    }
    if (this.pc) {
      try { this.pc.close(); } catch {}
      this.pc = null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearHandshakeTimeout();
    if (this.waitingPollTimer) {
      clearTimeout(this.waitingPollTimer);
      this.waitingPollTimer = null;
    }

    this.reconnectAttempts = this.options.maxReconnectAttempts; // Empecher la reconnexion

    // Liberer la ligne virtuelle
    if (this._lineToken) {
      this.releaseLine();
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.cleanupWebRTC();

    this._sessionId = null;
    this._lineToken = null;
    this._lineNumber = null;
    this._isWaiting = false;
    this.isTurnActive = false;
    this.setState('disconnected');
  }

  // ============================================================
  // Tool Registry
  // ============================================================

  /**
   * Enregistrer un tool. L'agent pourra l'appeler.
   * Apres l'enregistrement, un CONTEXT_UPDATE est envoye au serveur.
   */
  registerTool(tool: RegisteredTool): void {
    this.tools.set(tool.declaration.name, tool);
    this.log(`Tool enregistre: ${tool.declaration.name}`);

    // Sync avec le serveur
    if (this.isConnected) {
      this.syncToolsWithServer();
    }
  }

  /**
   * Desenregistrer un tool par nom.
   */
  unregisterTool(name: string): void {
    this.tools.delete(name);
    this.log(`Tool desenregistre: ${name}`);

    if (this.isConnected) {
      this.syncToolsWithServer();
    }
  }

  /**
   * Desenregistrer tous les tools d'un composant.
   */
  unregisterToolsByComponent(componentId: string): void {
    for (const [name, tool] of this.tools) {
      // Les tools globaux sont proteges : jamais supprimes par le cycle de vie des composants
      if (tool.componentId === componentId && !tool.global) {
        this.tools.delete(name);
      }
    }

    if (this.isConnected) {
      this.syncToolsWithServer();
    }
  }

  /**
   * Verifier si un tool existe.
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Enregistrer les metadonnees d'un plugin installe.
   * Appele automatiquement par installPlugin() — ne pas appeler directement.
   */
  trackPlugin(meta: PluginMeta): void {
    this.installedPlugins.set(meta.name, meta);
  }

  /**
   * Appeler directement le handler d'un tool enregistre (simulation dev).
   * Utile pour les DevTools et les tests unitaires.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`callTool: outil '${name}' non enregistre`);
    }
    return tool.handler(args);
  }

  // ============================================================
  // Shadow Context
  // ============================================================

  /**
   * Mettre a jour les donnees contextuelles.
   * Fusionne avec les donnees existantes.
   */
  updateContext(data: Record<string, unknown>): void {
    this.contextData = { ...this.contextData, ...data };

    if (this.isConnected) {
      this.syncToolsWithServer();
    }
  }

  /**
   * Remplacer toutes les donnees contextuelles.
   */
  setContext(data: Record<string, unknown>): void {
    this.contextData = data;

    if (this.isConnected) {
      this.syncToolsWithServer();
    }
  }

  getContext(): Record<string, unknown> {
    return { ...this.contextData };
  }

  // ============================================================
  // Envoyer des messages
  // ============================================================

  sendText(text: string): void {
    this.setState('thinking');
    this.send(Messages.userInputText(text));
  }

  sendAudio(audioBase64: string, mimeType?: string): void {
    this.send(Messages.userInputAudio(audioBase64, mimeType));
  }

  /**
   * Envoyer de l'audio en mode Live (streaming bidirectionnel).
   * Utilise le message AUDIO_STREAM au lieu de USER_INPUT.
   */
  sendAudioStream(audioBase64: string, mimeType = 'audio/pcm;rate=16000'): void {
    this.send(Messages.audioStream(audioBase64, mimeType));
  }

  /**
   * Signaler la fin du flux audio vocal.
   * A appeler quand l'utilisateur a fini de parler (bouton ou VAD).
   */
  sendAudioEnd(reason: 'user_stop' | 'vad' | 'timeout' = 'user_stop'): void {
    this.send(Messages.voiceInputEnd(reason));
    this.setState('thinking');
  }

  /**
   * Interrompre l'agent en train de parler (barge-in).
   */
  sendInterrupt(): void {
    this.send(Messages.voiceInterrupt());
  }

  // ============================================================
  // Sync Tools avec le serveur
  // ============================================================

  /**
   * Envoyer un CONTEXT_UPDATE avec tous les tools et le contexte.
   * Appele automatiquement apres chaque registerTool/unregisterTool
   * et a la connexion initiale (handshake).
   */
  syncToolsWithServer(): void {
    const declarations = this.registeredTools;
    const url = typeof window !== 'undefined' ? window.location.pathname : '';
    const title = typeof document !== 'undefined' ? document.title : '';

    this.send(Messages.contextUpdate(url, declarations, title, this.contextData));

    this.handlers.onToolsSync?.(declarations);
    this.emitEvent('tool.registry.synced', { tools: declarations });
    this.log(`Tools sync: ${declarations.length} tools envoyes au serveur`);
  }

  // ============================================================
  // Handlers internes
  // ============================================================

  private handleMessage(message: ADTPMessage): void {
    switch (message.type) {
      case MessageType.HANDSHAKE_ACK: {
        const payload = message.payload as any;
        this.clearHandshakeTimeout();
        this._sessionId = payload.sessionId;
        this.setState('connected');
        this.handlers.onSessionId?.(payload.sessionId);
        this.emitEvent('session.started', { sessionId: payload.sessionId });
        this.log(`Session: ${payload.sessionId}`);

        // === Sync initiale des tools au demarrage ===
        this.syncToolsWithServer();
        break;
      }

      case MessageType.TOOL_CALL: {
        const toolCall = message.payload as ToolCallPayload;
        this.handleToolCall(toolCall);
        this.handlers.onToolCall?.(toolCall);
        this.emitEvent('tool.call.requested', { toolCall });
        break;
      }

      case MessageType.AGENT_RESPONSE: {
        const payload = message.payload as AgentResponsePayload;
        if (payload.chunk) {
          this.ensureTurnStarted('server');
          this.handlers.onAgentResponse?.(payload.chunk, payload.done);
          if (payload.done) {
            this.emitEvent('agent.response.done', {
              text: payload.chunk,
              done: true,
              sessionId: this._sessionId ?? undefined,
            });
          } else {
            this.emitEvent('agent.response.delta', {
              text: payload.chunk,
              done: false,
              sessionId: this._sessionId ?? undefined,
            });
          }
        }
        if (payload.done) {
          this.isTurnActive = false;
        }
        this.setState(payload.done ? 'connected' : 'speaking');
        break;
      }

      case MessageType.AUDIO_STREAM: {
        const payload = message.payload as AudioStreamPayload;
        this.ensureTurnStarted('server');
        this.handlers.onAudioOutput?.(payload.data, payload.mimeType);
        this.emitEvent('audio.output.chunk', {
          audioBase64: payload.data,
          mimeType: payload.mimeType,
          sessionId: this._sessionId ?? undefined,
        });
        this.setState('speaking');
        break;
      }

      case MessageType.VOICE_STATE_EVENT: {
        const payload = message.payload as VoiceStateEventPayload;
        this.handlers.onVoiceStateEvent?.(payload.event, payload.reason);
        // Mise a jour automatique de l'etat client
        if (payload.event === 'turn_complete') {
          this.isTurnActive = false;
          this.emitEvent('turn.completed', {
            source: 'server',
            sessionId: this._sessionId ?? undefined,
          });
          this.setState('connected');
        } else if (payload.event === 'interrupted' || payload.event === 'waiting_for_input') {
          this.isTurnActive = false;
          if (payload.event === 'interrupted') {
            this.emitEvent('turn.interrupted', {
              source: 'server',
              reason: payload.reason,
              sessionId: this._sessionId ?? undefined,
            });
          } else {
            this.emitEvent('turn.waiting_for_input', {
              source: 'server',
              sessionId: this._sessionId ?? undefined,
            });
          }
          this.setState('listening');
        }
        break;
      }

      case MessageType.SYSTEM_EVENT: {
        const payload = message.payload as SystemEventPayload;
        this.handlers.onSystemEvent?.(payload.kind, payload.message);
        if (payload.kind === 'error') {
          this.emitSystemError(payload.message ?? 'System event error', payload.kind);
          log.error('Agent error:', payload.message);
        }
        break;
      }

      case MessageType.APPROVAL_REQUEST: {
        const payload = message.payload as any;
        const request: ApprovalRequest = {
          id: payload.callId,
          callId: payload.callId,
          toolName: payload.toolName,
          args: payload.args,
          risk: this.normalizeRisk(payload.risk),
          message: payload.message,
          requestedAt: Date.now(),
        };

        const resolveApproval = (approved: boolean) => {
          if (!approved) {
            this.send(Messages.approvalResponse(payload.callId, false, undefined, "Action refusée par l'utilisateur"));
            return;
          }
          this.send(Messages.approvalResponse(payload.callId, true));
        };

        this.handlers.onApprovalRequest?.(request, resolveApproval);
        this.emitEvent('approval.requested', {
          request,
          resolve: resolveApproval,
        });
        break;
      }
    }
  }

  private async handleToolCall(toolCall: ToolCallPayload): Promise<void> {
    const tool = this.tools.get(toolCall.name);

    if (!tool) {
      log.warn(`Tool inconnu: ${toolCall.name}`);
      this.send(Messages.toolResult(toolCall.callId, null, 'error', `Tool "${toolCall.name}" non trouve`));
      return;
    }

    this.setState('thinking');

    const risk = this.normalizeRisk(tool.declaration.risk);
    const action = this.hitlPolicy.evaluate(toolCall.callId, toolCall.name, risk, toolCall.args);

    if (action.type === 'require_approval') {
      this.pendingApprovals.set(toolCall.callId, {
        toolCall,
        tool,
        request: action.request,
      });

      // Informer le serveur/LLM que l'approbation par l'utilisateur est requise
      this.send(
        Messages.approvalRequest(
          toolCall.callId,
          action.request.toolName,
          action.request.risk,
          action.request.args,
          action.request.message
        )
      );

      // Notifier l'UI
      const resolveApproval = (approved: boolean) => {
        this.resolveApproval(toolCall.callId, approved);
      };
      this.handlers.onApprovalRequest?.(action.request, resolveApproval);
      this.emitEvent('approval.requested', {
        request: action.request,
        resolve: resolveApproval,
      });
      return;
    }

    try {
      const result = await tool.handler(toolCall.args);
      this.send(Messages.toolResult(toolCall.callId, result, 'success'));
      this.log(`Tool OK: ${toolCall.name}`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.send(Messages.toolResult(toolCall.callId, null, 'error', error));
      log.error(`Tool error: ${toolCall.name}`, error);
    }
  }

  /**
   * Resoudre une demande d'approbation HITL.
   */
  async resolveApproval(callId: string, approved: boolean): Promise<boolean> {
    const entry = this.pendingApprovals.get(callId);
    if (!entry) return false;

    this.pendingApprovals.delete(callId);

    if (!approved) {
      this.send(Messages.approvalResponse(callId, false, undefined, "Action refusée par l'utilisateur"));
      return true;
    }

    try {
      const result = await entry.tool.handler(entry.toolCall.args);
      this.send(Messages.approvalResponse(callId, true, result));
      this.log(`Tool OK (approved): ${entry.toolCall.name}`);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.send(Messages.approvalResponse(callId, true, undefined, error));
      log.error(`Tool error (approved): ${entry.toolCall.name}`, error);
      return false;
    }
  }

  private normalizeRisk(risk?: string): RiskLevel {
    switch (risk) {
      case 'low':
        return RiskLevel.LOW;
      case 'high':
        return RiskLevel.HIGH;
      case 'critical':
        return RiskLevel.CRITICAL;
      default:
        return RiskLevel.NONE;
    }
  }

  // ============================================================
  // Virtual Lines — Acquisition / Liberation HTTP
  // ============================================================

  /**
   * Deriver l'URL HTTP de base depuis l'endpoint WS.
   * ws://host:3000/domos → http://host:3000
   */
  private getHttpBaseUrl(): string {
    return this.options.endpoint
      .replace('ws://', 'http://')
      .replace('wss://', 'https://')
      .replace(/\/[^/]*$/, ''); // retirer le path (/domos)
  }

  /**
   * Cle sessionStorage pour persister le token de ligne.
   * Unique par (endpoint + apiKey) — evite les conflits multi-serveurs.
   */
  private getLineStorageKey(): string {
    return `domos_line_${this.options.endpoint}_${this.options.apiKey}`;
  }

  /**
   * Sauvegarder le token de ligne dans sessionStorage.
   * sessionStorage = dure le temps de l'onglet (pas de localStorage cross-tab).
   */
  private saveLineToken(): void {
    if (!this._lineToken || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(this.getLineStorageKey(), JSON.stringify({
        token: this._lineToken,
        lineNumber: this._lineNumber,
        isWaiting: this._isWaiting,
        acquiredAt: Date.now(),
      }));
    } catch { /* ignore (env sans sessionStorage) */ }
  }

  /**
   * Restaurer le token de ligne depuis sessionStorage.
   * @returns true si un token valide a ete restaure.
   */
  private restoreLineToken(): boolean {
    if (typeof sessionStorage === 'undefined') return false;
    try {
      const raw = sessionStorage.getItem(this.getLineStorageKey());
      if (!raw) return false;
      const saved = JSON.parse(raw) as { token: string; lineNumber: string; isWaiting: boolean; acquiredAt: number };
      if (!saved.token) return false;
      this._lineToken = saved.token;
      this._lineNumber = saved.lineNumber ?? null;
      this._isWaiting = saved.isWaiting ?? false;
      this.log(`Token de ligne restaure depuis sessionStorage: ${saved.lineNumber ?? '?'}`);
      this.emitLineStateChanged(saved.lineNumber ?? null, saved.isWaiting ?? false, saved.isWaiting ? 'waiting' : 'idle');
      return true;
    } catch { return false; }
  }

  /**
   * Supprimer le token de ligne du sessionStorage.
   */
  private clearLineToken(): void {
    this._lineToken = null;
    this._lineNumber = null;
    this._isWaiting = false;
    if (typeof sessionStorage === 'undefined') return;
    try { sessionStorage.removeItem(this.getLineStorageKey()); } catch { /* ignore */ }
  }

  /**
   * Acquerir une ligne via HTTP POST.
   * Tente d'abord de reutiliser un token existant (sessionStorage).
   * Si le token est rejete par le serveur, en acquiert un nouveau.
   */
  private async acquireLine(): Promise<boolean> {
    // Tenter de reutiliser le token existant
    if (this.restoreLineToken()) {
      this.log(`Reutilisation du token existant (pas d'acquisition reseau)`);
      this.handlers.onLineAcquired?.(this._lineNumber ?? '', this._isWaiting);
      // Si le token restaure etait en attente, reprendre le polling
      if (this._isWaiting && this._lineToken) {
        this.startWaitingPoll(this._lineToken);
      }
      return true;
    }

    return this.acquireLineFresh();
  }

  /**
   * Forcer une nouvelle acquisition (ignore le cache).
   */
  private async acquireLineFresh(): Promise<boolean> {
    const baseUrl = this.getHttpBaseUrl();
    const url = `${baseUrl}/lines/acquire?apiKey=${encodeURIComponent(this.options.apiKey)}`;

    try {
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json() as {
        success: boolean;
        lineNumber?: string;
        token?: string;
        waiting?: boolean;
        error?: string;
      };

      if (data.success) {
        this._lineToken = data.token ?? null;
        this._lineNumber = data.lineNumber ?? null;
        this._isWaiting = data.waiting || false;

        // Persister pour la duree de vie de l'onglet
        this.saveLineToken();

        this.log(`Ligne acquise: ${data.lineNumber ?? '?'}${data.waiting ? ' (attente)' : ''}`);
        this.handlers.onLineAcquired?.(data.lineNumber ?? '', data.waiting || false);
        this.emitLineStateChanged(data.lineNumber ?? null, data.waiting || false, data.waiting ? 'waiting' : 'idle');

        // Si en attente, demarrer le polling pour detecter la promotion
        if (data.waiting && data.token) {
          this.startWaitingPoll(data.token);
        }

        return true;
      } else {
        this.log(`Acquisition echouee: ${data.error ?? 'inconnu'}`);
        this.handlers.onLineBusy?.();
        this.emitLineStateChanged(null, false, 'busy');
        const error = new Error(data.error || 'Toutes les lignes occupees');
        this.emitSystemError(error.message, 'error');
        this.handlers.onError?.(error);
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log(`Erreur acquisition ligne: ${error.message}`);
      this.emitSystemError(error.message, 'error');
      this.handlers.onError?.(error);
      return false;
    }
  }

  /**
   * Demarrer le polling de statut quand en ligne d'attente.
   * Poll toutes les 2s. Quand le token est promu (state: ready), connexion automatique.
   */
  private startWaitingPoll(token: string): void {
    if (this.waitingPollTimer) {
      clearTimeout(this.waitingPollTimer);
      this.waitingPollTimer = null;
    }

    const poll = async () => {
      // Arreter si le client a ete deconnecte manuellement
      if (!this._lineToken || this._lineToken !== token) return;

      try {
        const baseUrl = this.getHttpBaseUrl();
        const res = await fetch(`${baseUrl}/lines/status?token=${encodeURIComponent(token)}`);
        const data = await res.json() as { state: 'waiting' | 'ready' | 'expired' };

        if (data.state === 'ready') {
          // Ligne promue! Le meme token est maintenant actif.
          this.log(`Ligne d'attente promue: connexion en cours...`);
          this._isWaiting = false;
          this.saveLineToken();
          this.handlers.onLineReady?.(this._lineNumber ?? '');
          this.emitLineStateChanged(this._lineNumber ?? null, false, 'idle');
          // Connexion directe sans re-acquérir (le token est déjà bon)
          this.connectWebSocket();
          return;
        }

        if (data.state === 'expired') {
          // Token expire (TTL depasse) → nettoyer
          this.log(`Ligne d'attente expiree`);
          this.clearLineToken();
          this.handlers.onLineBusy?.();
          this.emitLineStateChanged(null, false, 'busy');
          return;
        }

        // Toujours en attente → reprendre le poll dans 2s
        this.waitingPollTimer = setTimeout(poll, 2_000);
      } catch {
        // Erreur reseau transitoire → reessayer dans 3s
        this.waitingPollTimer = setTimeout(poll, 3_000);
      }
    };

    // Premier poll dans 2s
    this.waitingPollTimer = setTimeout(poll, 2_000);
  }

  /**
   * Liberer une ligne via HTTP POST (fire-and-forget).
   * Supprime aussi le token du sessionStorage.
   */
  private releaseLine(): void {
    if (!this._lineToken) return;

    const baseUrl = this.getHttpBaseUrl();
    const url = `${baseUrl}/lines/release`;
    const token = this._lineToken;

    // Clear immediatement (evite double-release)
    this.clearLineToken();

    // Fire and forget
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {
      // Ignorer les erreurs de release
    });
  }

  // ============================================================
  // Utilitaires
  // ============================================================

  private send(message: ADTPMessage): void {
    const encoded = encode(message);

    if (this.dc?.readyState === 'open') {
      this.dc.send(encoded);
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(encoded);
    }
  }

  private setState(state: ClientState): void {
    if (this._state !== state) {
      const previous = this._state;
      this._state = state;
      this.handlers.onStateChange?.(state);
      this.emitEvent('connection.state.changed', { previous, current: state });
    }
  }

  private startHandshakeTimeout(): void {
    this.clearHandshakeTimeout();

    this.handshakeTimer = setTimeout(() => {
      this.handshakeTimer = null;

      const message = `Timeout du handshake client: HANDSHAKE_ACK non recu apres ${HANDSHAKE_TIMEOUT_MS}ms`;
      const error = new Error(message);

      this.handlers.onSystemEvent?.('error', message);
      this.emitSystemError(message, 'error');
      this.handlers.onError?.(error);
      this.setState('error');

      if (this.ws) {
        this.ws.close(4000, 'Handshake timeout');
        return;
      }

      if (this.dc) {
        try { this.dc.close(); } catch {}
      }

      this.cleanupWebRTC();
    }, HANDSHAKE_TIMEOUT_MS);
  }

  private clearHandshakeTimeout(): void {
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * this.reconnectAttempts;
    this.log(`Reconnexion dans ${delay}ms (tentative ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private log(msg: string): void {
    if (this.options.debug) {
      log.debug(msg);
    }
  }

  /**
   * Detruire le client (deconnexion + nettoyage).
   */
  destroy(): void {
    this.disconnect();
    this.tools.clear();
    this.contextData = {};
    this.handlers = {};
    this.eventEmitter.clear();
    this.clearLineToken();
  }

  private emitEvent<TType extends DomOSClientEventType>(
    type: TType,
    payload: DomOSClientEventMap[TType]
  ): void {
    this.eventEmitter.emit(type, payload);
  }

  private ensureTurnStarted(source: DomOSClientTurnSource): void {
    if (this.isTurnActive) {
      return;
    }

    this.isTurnActive = true;
    this.emitEvent('turn.started', {
      source,
      sessionId: this._sessionId ?? undefined,
    });
  }

  private emitLineStateChanged(
    lineNumber: string | null,
    waiting: boolean,
    state: 'idle' | 'waiting' | 'busy'
  ): void {
    this.emitEvent('line.state.changed', {
      lineNumber,
      waiting,
      state,
    });
  }

  private emitSystemError(message: string, kind?: string): void {
    this.emitEvent('system.error', { message, kind });
  }
}

