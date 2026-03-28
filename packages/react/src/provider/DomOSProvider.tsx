'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  DomOSClient,
  createLogger,
  installPlugin,
  type ToolDeclaration,
  type ToolCallPayload,
  type ClientState,
  type RegisteredTool,
  type WidgetConfig,
  type PluginEntry,
} from '@domos/core';
import { DomOSContext, type AgentState, type PendingApproval, type DomOSContextValue } from './DomOSContext.js';
import { ApprovalBanner } from '../components/hitl.ApprovalBanner.js';
import { ApprovalModal } from '../components/hitl.ApprovalModal.js';
import { WidgetInner } from '../components/widget/WidgetInner.js';

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
    /** Legacy: Afficher un banner d'approbation HITL */
    approvalBanner?: boolean;
    /** UI HITL provider-level */
    hitl?: {
      /** Type d'UI pour les approvals high/critical */
      ui?: 'modal' | 'banner' | 'none';
    };
    /** Auto-monter le widget par defaut (v1: React uniquement) */
    widget?: {
      enabled: boolean;
      config?: WidgetConfig;
    };
  };

  /** Tools globaux persistants independants du cycle de vie des vues */
  globalTools?: Omit<RegisteredTool, 'componentId'>[];

  /** Plugins a installer au demarrage (voir @domos/core DomOSClientPlugin) */
  plugins?: PluginEntry[];

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
export function DomOSProvider({ apiKey, endpoint, config = {}, globalTools = [], plugins = [], children }: DomOSProviderProps) {
  const {
    voice = false,
    debug = false,
    autoConnect = true,
    virtualLines = false,
    approvalBanner,
    hitl,
    widget,
  } = config;
  const hitlUi = hitl?.ui ?? (approvalBanner === undefined ? 'modal' : (approvalBanner ? 'banner' : 'none'));

  // --- State ---
  const [agentState, setAgentState] = useState<AgentState>('disconnected');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(voice);
  const [lineNumber, setLineNumber] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Ref pour stocker les listeners audio output (mode Live)
  const audioOutputListenersRef = useRef(new Set<(audioBase64: string, mimeType: string) => void>());
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
    // Register plugins
    if (plugins.length > 0) {
      plugins.forEach(([plugin, pluginConfig]) => {
        installPlugin(clientRef.current!, plugin, pluginConfig);
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
        const listeners = audioOutputListenersRef.current;

        if (listeners.size > 0) {
          for (const listener of listeners) {
            listener(audioBase64, mimeType);
          }
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
        const safeRisk: 'high' | 'critical' = request.risk === 'critical' ? 'critical' : 'high';
        setPendingApproval({
          callId: request.callId,
          toolName: request.toolName,
          args: request.args,
          message: request.message,
          risk: safeRisk,
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

  const sendInterrupt = useCallback(() => {
    client.sendInterrupt();
  }, [client]);

  const onAudioOutput = useCallback(
    (callback: (audioBase64: string, mimeType: string) => void) => {
      audioOutputListenersRef.current.add(callback);

      const queue = pendingAudioChunksRef.current;
      if (queue.length > 0) {
        const buffered = queue.splice(0, queue.length);
        for (const chunk of buffered) {
          callback(chunk.audioBase64, chunk.mimeType);
        }

        if (debug) {
          log.debug(`Playback: ${buffered.length} chunk(s) audio rejoues depuis le buffer.`);
        }
      }

      return () => {
        audioOutputListenersRef.current.delete(callback);
      };
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
    getRegisteredTools: useCallback(() => client.toolsInfo, [client]),
    callTool: useCallback(
      (name: string, args: Record<string, unknown>) => client.callTool(name, args),
      [client]
    ),
    getInstalledPlugins: useCallback(() => client.registeredPlugins, [client]),
    updateContext,
    sendText,
    sendAudio,
    sendAudioStream,
    sendAudioEnd,
    sendInterrupt,
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
      {widget?.enabled ? <WidgetInner config={widget.config ?? {}} /> : null}
      {hitlUi === 'modal' ? <ApprovalModal /> : null}
      {hitlUi === 'banner' ? <ApprovalBanner /> : null}
    </DomOSContext.Provider>
  );
}
