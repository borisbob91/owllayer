'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import {
  OwlLayerClient,
  createLogger,
  installPlugin,
  type OwlLayerClientAnyEventListener,
  type OwlLayerClientEventListener,
  type OwlLayerClientEventType,
  type EffectiveToolsPayload,
  type ToolDeclaration,
  type ToolCallPayload,
  type ClientState,
  type RegisteredTool,
  type WidgetConfig,
  type PluginEntry,
} from '@owllayer/core';
import { OwlLayerContext, type AgentState, type PendingApproval, type OwlLayerContextValue, type HitlLabels } from './OwlLayerContext.js';
import { ApprovalBanner } from '../components/hitl.ApprovalBanner.js';
import { ApprovalModal } from '../components/hitl.ApprovalModal.js';
import { WidgetInner } from '../components/widget/WidgetInner.js';

const log = createLogger('OwlLayer:Provider');

export interface OwlLayerProviderProps {
  /** Cle API publique */
  apiKey: string;

  /** Endpoint WebSocket du serveur OwlLayer */
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
      /** Libelles de l'UI d'approbation (tous optionnels) */
      labels?: HitlLabels;
    };
    /** Auto-monter le widget par defaut (v1: React uniquement) */
    widget?: {
      enabled: boolean;
      config?: WidgetConfig;
    };
  };

  /** Tools globaux persistants independants du cycle de vie des vues */
  globalTools?: Omit<RegisteredTool, 'componentId'>[];

  /** Plugins a installer au demarrage (voir @owllayer/core OwlLayerClientPlugin) */
  plugins?: PluginEntry[];

  children: ReactNode;
}

/**
 * OwlLayerProvider - Provider React principal.
 *
 * Utilise OwlLayerClient (framework-agnostic) en interne pour gerer
 * la connexion, le registre de tools et la synchronisation serveur.
 *
 * @example
 * ```tsx
 * <OwlLayerProvider apiKey="pk_live_..." endpoint="wss://api.owllayer.ai/v1/stream" globalTools={APP_TOOLS}>
 *   <App />
 * </OwlLayerProvider>
 * ```
 */
export function OwlLayerProvider({ apiKey, endpoint, config = {}, globalTools = [], plugins = [], children }: OwlLayerProviderProps) {
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
  const [lineState, setLineState] = useState<'idle' | 'waiting' | 'busy'>('idle');
  const [agentError, setAgentError] = useState<string | null>(null);
  const [toolSurface, setToolSurface] = useState<EffectiveToolsPayload>({
    effectiveTools: [],
    serverTools: [],
    clientTools: [],
    ignoredClientTools: [],
  });

  // Ref pour stocker les listeners audio output (mode Live)
  const audioOutputListenersRef = useRef(new Set<(audioBase64: string, mimeType: string) => void>());
  // Buffer court pour eviter de perdre les premiers chunks audio si le callback n'est pas encore branche.
  const pendingAudioChunksRef = useRef<Array<{ audioBase64: string; mimeType: string }>>([]);

  // --- OwlLayerClient instance ---
  const clientRef = useRef<OwlLayerClient | null>(null);

  // Creer le client une seule fois
  if (!clientRef.current) {
    clientRef.current = new OwlLayerClient({
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
      onEffectiveTools: (surface: EffectiveToolsPayload) => {
        setToolSurface(surface);
        if (debug && surface.ignoredClientTools.length > 0) {
          log.warn(`Tools client ignores par collision serveur: ${surface.ignoredClientTools.map((tool) => tool.name).join(', ')}`);
        }
      },
      onLineAcquired: (ln: string, waiting: boolean) => {
        setLineNumber(ln);
        setIsWaiting(waiting);
        setLineState(waiting ? 'waiting' : 'idle');
      },
      onLineBusy: () => {
        setLineNumber(null);
        setIsWaiting(false);
        setLineState('busy');
      },
      onLineReady: (_ln: string) => {
        setIsWaiting(false);
        setLineState('idle');
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

    let lastPath = window.location.pathname;
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path === lastPath) return;
      lastPath = path;
      // Session etablie suffit : l'agent peut etre 'thinking' (navigation par un tool)
      if (client.sessionId !== null) {
        client.syncToolsWithServer();
      }
    };

    // React Router (navigate(), <Link>) utilise pushState/replaceState, qui ne
    // declenchent pas popstate : on les enveloppe pour detecter ces navigations.
    const { history } = window;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const patchedPushState: History['pushState'] = function (this: History, ...args) {
      originalPushState.apply(this, args);
      handleUrlChange();
    };
    const patchedReplaceState: History['replaceState'] = function (this: History, ...args) {
      originalReplaceState.apply(this, args);
      handleUrlChange();
    };
    history.pushState = patchedPushState;
    history.replaceState = patchedReplaceState;
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      // Ne pas ecraser un wrapper pose apres le notre par une autre bibliotheque
      if (history.pushState === patchedPushState) history.pushState = originalPushState;
      if (history.replaceState === patchedReplaceState) history.replaceState = originalReplaceState;
    };
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

  const subscribeEvent = useCallback(
    <TType extends OwlLayerClientEventType>(type: TType, listener: OwlLayerClientEventListener<TType>) => {
      client.onEvent(type, listener);
      return () => {
        client.offEvent(type, listener);
      };
    },
    [client]
  );

  const subscribeAnyEvent = useCallback(
    (listener: OwlLayerClientAnyEventListener) => {
      client.onAnyEvent(listener);
      return () => {
        client.offAnyEvent(listener);
      };
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
  const value: OwlLayerContextValue = {
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
    toolSurface,
    getEffectiveTools: useCallback(() => client.effectiveTools, [client]),
    getIgnoredClientTools: useCallback(() => client.ignoredClientTools, [client]),
    callTool: useCallback(
      (name: string, args: Record<string, unknown>) => client.callTool(name, args),
      [client]
    ),
    getInstalledPlugins: useCallback(() => client.registeredPlugins, [client]),
    subscribeEvent,
    subscribeAnyEvent,
    updateContext,
    sendText,
    sendAudio,
    sendAudioStream,
    sendAudioEnd,
    sendInterrupt,
    onAudioOutput,
    pendingApproval,
    hitlLabels: hitl?.labels,
    lastResponse,
    voiceEnabled,
    setVoiceEnabled,
    debug,
    lineNumber,
    isWaiting,
    lineState,
    agentError,
    clearAgentError: () => setAgentError(null),
  };

  return (
    <OwlLayerContext.Provider value={value}>
      {children}
      {widget?.enabled ? <WidgetInner config={widget.config ?? {}} /> : null}
      {hitlUi === 'modal' ? <ApprovalModal /> : null}
      {hitlUi === 'banner' ? <ApprovalBanner /> : null}
    </OwlLayerContext.Provider>
  );
}
