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

const log = createLogger('DomOS:Client');

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
  /** Appele quand toutes les lignes sont occupees */
  onLineBusy?: () => void;
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

  // --- Shadow Context ---
  private contextData: Record<string, unknown> = {};

  // --- Virtual Lines ---
  private _lineToken: string | null = null;
  private _lineNumber: string | null = null;
  private _isWaiting = false;

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
      };

      this.ws.onmessage = (event) => {
        const message = tryDecode(String(event.data));
        if (message) {
          this.handleMessage(message);
        }
      };

      this.ws.onclose = (event) => {
        this.log(`WebSocket ferme: ${event.code} ${event.reason}`);
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
        this.handlers.onError?.(new Error('WebSocket error'));
        this.setState('error');
      };
    } catch (err) {
      this.setState('error');
      this.handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
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
      };

      this.dc.onmessage = (event) => {
        const message = tryDecode(String(event.data));
        if (message) {
          this.handleMessage(message);
        }
      };

      this.dc.onclose = () => {
        this.log('DataChannel ferme');
        this.cleanupWebRTC();
        this.setState('disconnected');

        // DataChannel n'expose pas le code de fermeture, on reconnecte normalement
        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.dc.onerror = () => {
        this.log('Erreur DataChannel');
        this.handlers.onError?.(new Error('WebRTC DataChannel error'));
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
      this.setState('error');
      this.handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private cleanupWebRTC(): void {
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
    this.log(`Tools sync: ${declarations.length} tools envoyes au serveur`);
  }

  // ============================================================
  // Handlers internes
  // ============================================================

  private handleMessage(message: ADTPMessage): void {
    switch (message.type) {
      case MessageType.HANDSHAKE_ACK: {
        const payload = message.payload as any;
        this._sessionId = payload.sessionId;
        this.setState('connected');
        this.handlers.onSessionId?.(payload.sessionId);
        this.log(`Session: ${payload.sessionId}`);

        // === Sync initiale des tools au demarrage ===
        this.syncToolsWithServer();
        break;
      }

      case MessageType.TOOL_CALL: {
        const toolCall = message.payload as ToolCallPayload;
        this.handleToolCall(toolCall);
        this.handlers.onToolCall?.(toolCall);
        break;
      }

      case MessageType.AGENT_RESPONSE: {
        const payload = message.payload as AgentResponsePayload;
        if (payload.chunk) {
          this.handlers.onAgentResponse?.(payload.chunk, payload.done);
        }
        this.setState(payload.done ? 'connected' : 'speaking');
        break;
      }

      case MessageType.AUDIO_STREAM: {
        const payload = message.payload as AudioStreamPayload;
        this.handlers.onAudioOutput?.(payload.data, payload.mimeType);
        this.setState('speaking');
        break;
      }

      case MessageType.VOICE_STATE_EVENT: {
        const payload = message.payload as VoiceStateEventPayload;
        this.handlers.onVoiceStateEvent?.(payload.event, payload.reason);
        // Mise a jour automatique de l'etat client
        if (payload.event === 'turn_complete') {
          this.setState('connected');
        } else if (payload.event === 'interrupted' || payload.event === 'waiting_for_input') {
          this.setState('listening');
        }
        break;
      }

      case MessageType.SYSTEM_EVENT: {
        const payload = message.payload as SystemEventPayload;
        this.handlers.onSystemEvent?.(payload.kind, payload.message);
        if (payload.kind === 'error') {
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

        this.handlers.onApprovalRequest?.(request, (approved) => {
          if (!approved) {
            this.send(Messages.approvalResponse(payload.callId, false, undefined, "Action refusée par l'utilisateur"));
            return;
          }
          this.send(Messages.approvalResponse(payload.callId, true));
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
      this.handlers.onApprovalRequest?.(action.request, (approved) => {
        this.resolveApproval(toolCall.callId, approved);
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
        return true;
      } else {
        this.log(`Acquisition echouee: ${data.error ?? 'inconnu'}`);
        this.handlers.onLineBusy?.();
        this.handlers.onError?.(new Error(data.error || 'Toutes les lignes occupees'));
        return false;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log(`Erreur acquisition ligne: ${error.message}`);
      this.handlers.onError?.(error);
      return false;
    }
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
      this._state = state;
      this.handlers.onStateChange?.(state);
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
    this.clearLineToken();
  }
}

