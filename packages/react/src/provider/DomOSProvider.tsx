import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  DomOSClient,
  createLogger,
  type ToolDeclaration,
  type ToolCallPayload,
  type ClientState,
  type RegisteredTool,
} from '@domos/core';
import { DomOSContext, type AgentState, type PendingApproval, type DomOSContextValue } from './DomOSContext.js';
import { ApprovalBanner } from '../components/hitl.ApprovalBanner.js';

const log = createLogger('DomOS:Provider');

export interface DomOSProviderProps {
  /** Cle API publique */
  apiKey: string;

  /** Endpoint WebSocket du serveur DomOS */
  endpoint: string;

  /** Configuration */
  config?: {
    /** Activer le mode vocal */
    voice?: boolean;
    /** Mode debug (logs verbeux) */
    debug?: boolean;
    /** Connexion automatique au mount */
    autoConnect?: boolean;
    /** Activer les virtual lines */
    virtualLines?: boolean;
    /** Afficher un banner d'approbation HITL par defaut */
    approvalBanner?: boolean;
  };

  /** Tools globaux persistants independants du cycle de vie des vues */
  globalTools?: Omit<RegisteredTool, 'componentId'>[];

  children: ReactNode;
}

/**
 * DomOSProvider - Provider React principal.
 *
 * Utilise DomOSClient (framework-agnostic) en interne pour gerer
 * la connexion, le registre de tools et la synchronisation serveur.
 *
 * @example
 * ```tsx
 * <DomOSProvider apiKey="pk_live_..." endpoint="wss://api.domos.ai/v1/stream" globalTools={APP_TOOLS}>
 *   <App />
 * </DomOSProvider>
 * ```
 */
export function DomOSProvider({ apiKey, endpoint, config = {}, globalTools = [], children }: DomOSProviderProps) {
  const {
    voice = false,
    debug = false,
    autoConnect = true,
    virtualLines = false,
    approvalBanner = true,
  } = config;

  // --- State ---
  const [agentState, setAgentState] = useState<AgentState>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(voice);
  const [lineNumber, setLineNumber] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Ref pour stocker le callback audio output (mode Live)
  const audioOutputCallbackRef = useRef<((audioBase64: string, mimeType: string) => void) | null>(null);
  // Buffer court pour eviter de perdre les premiers chunks audio si le callback n'est pas encore branche.
  const pendingAudioChunksRef = useRef<Array<{ audioBase64: string; mimeType: string }>>([]);

  // --- DomOSClient instance ---
  const clientRef = useRef<DomOSClient | null>(null);

  // Creer le client une seule fois
  if (!clientRef.current) {
    clientRef.current = new DomOSClient({
      endpoint,
      apiKey,
      debug,
      autoReconnect: true,
      virtualLines,
    });

    // Enregistrer les tools globaux avec un ID statique de protection
    if (globalTools.length > 0) {
      log.info(`Enregistrement de ${globalTools.length} tools globaux (persistants).`);
      globalTools.forEach(tool => {
        clientRef.current!.registerTool({
          ...tool,
          global: true // Protection reelle via le flag core — no componentId hack
        });
      });
    }
  }

  const client = clientRef.current;

  // --- Brancher les event handlers ---
  useEffect(() => {
    client.on({
      onStateChange: (state: ClientState) => {
        setAgentState(state as AgentState);
      },
      onSessionId: (id: string) => {
        setSessionId(id);
      },
      onAgentResponse: (text: string, done: boolean) => {
        setLastResponse(text);
        setAgentState(done ? 'connected' : 'speaking');
      },
      onSystemEvent: (kind: string, message?: string) => {
        if (kind === 'error') {
          log.error('Agent error:', message ?? '');
          setAgentError(message ?? 'Erreur inconnue');
        }
      },
      onAudioOutput: (audioBase64: string, mimeType: string) => {
        const callback = audioOutputCallbackRef.current;

        if (callback) {
          callback(audioBase64, mimeType);
          return;
        }

        const queue = pendingAudioChunksRef.current;
        queue.push({ audioBase64, mimeType });

        // Eviter un buffer infini si le callback n'est jamais branche.
        if (queue.length > 24) {
          queue.splice(0, queue.length - 24);
        }

        if (debug) {
          log.debug(`Chunk audio mis en file d'attente (${queue.length}) en attente du callback.`);
        }
      },
      onToolsSync: (tools: ToolDeclaration[]) => {
        if (debug) {
          log.debug(`Tools syncs avec le serveur: ${tools.length} tools`);
        }
      },
      onLineAcquired: (ln: string, waiting: boolean) => {
        setLineNumber(ln);
        setIsWaiting(waiting);
      },
      onLineBusy: () => {
        setLineNumber(null);
        setIsWaiting(false);
      },
      onApprovalRequest: (request, resolve) => {
        setPendingApproval({
          callId: request.callId,
          toolName: request.toolName,
          args: request.args,
          message: request.message,
          resolve: (approved: boolean) => {
            resolve(approved);
            setPendingApproval(null);
          },
        });
      },
    });
  }, [client, debug]);

  // Auto-connect / cleanup
  useEffect(() => {
    if (autoConnect) {
      client.connect();
    }

    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, []);

  // Sync context quand l'URL change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      if (client.isConnected) {
        client.syncToolsWithServer();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [client]);

  // --- API pour les hooks ---

  const registerTool = useCallback(
    (componentId: string, declaration: ToolDeclaration, handler: (args: any) => Promise<unknown>, isGlobal?: boolean) => {
      client.registerTool({ declaration, handler, componentId, global: isGlobal });

      if (debug) {
        log.debug(`Tool enregistre: ${declaration.name} (composant: ${componentId}${isGlobal ? ', GLOBAL' : ''})`);
      }
    },
    [client, debug]
  );

  const unregisterTool = useCallback(
    (name: string) => {
      client.unregisterTool(name);

      if (debug) {
        log.debug(`Tool desenregistre: ${name}`);
      }
    },
    [client, debug]
  );

  const unregisterToolsByComponent = useCallback(
    (componentId: string) => {
      client.unregisterToolsByComponent(componentId);

      if (debug) {
        log.debug(`Tous les tools du composant desenregistres: ${componentId}`);
      }
    },
    [client, debug]
  );

  const updateContext = useCallback(
    (data: Record<string, unknown>) => {
      client.updateContext(data);
    },
    [client]
  );

  const sendText = useCallback(
    (text: string) => {
      setLastResponse(null);
      client.sendText(text);
    },
    [client]
  );

  const sendAudio = useCallback(
    (audioBase64: string, mimeType?: string) => {
      client.sendAudio(audioBase64, mimeType);
    },
    [client]
  );

  const sendAudioStream = useCallback(
    (audioBase64: string, mimeType?: string) => {
      client.sendAudioStream(audioBase64, mimeType);
    },
    [client]
  );

  const sendAudioEnd = useCallback(
    (reason?: 'user_stop' | 'vad' | 'timeout') => {
      client.sendAudioEnd(reason);
    },
    [client]
  );

  const onAudioOutput = useCallback(
    (callback: (audioBase64: string, mimeType: string) => void) => {
      audioOutputCallbackRef.current = callback;

      const queue = pendingAudioChunksRef.current;
      if (queue.length === 0) return;

      const buffered = queue.splice(0, queue.length);
      for (const chunk of buffered) {
        callback(chunk.audioBase64, chunk.mimeType);
      }

      if (debug) {
        log.debug(`Playback: ${buffered.length} chunk(s) audio rejoues depuis le buffer.`);
      }
    },
    [debug]
  );

  // --- Valeur du contexte ---
  const value: DomOSContextValue = {
    agentState,
    sessionId,
    shadowContext: {
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      title: typeof document !== 'undefined' ? document.title : '',
      data: {},
      updatedAt: Date.now(),
    },
    registerTool,
    unregisterTool,
    unregisterToolsByComponent,
    updateContext,
    sendText,
    sendAudio,
    sendAudioStream,
    sendAudioEnd,
    onAudioOutput,
    pendingApproval,
    lastResponse,
    voiceEnabled,
    setVoiceEnabled,
    debug,
    lineNumber,
    isWaiting,
    agentError,
    clearAgentError: () => setAgentError(null),
  };

  return (
    <DomOSContext.Provider value={value}>
      {children}
      {approvalBanner ? <ApprovalBanner /> : null}
    </DomOSContext.Provider>
  );
}
