import { signal, type Signal, type WritableSignal } from '@angular/core';
import {
  DomOSClient,
  zodToToolParameters,
  type ClientState,
  type DomOSClientAnyEventListener,
  type DomOSClientEventListener,
  type DomOSClientEventType,
  type PluginMeta,
  type ToolDeclaration,
} from '@domos/core';
import type { DomOSToolArgs, DomOSToolDefinition, DomOSToolHandler } from '../types/types.js';

/**
 * DomOSAngularService — Façade Angular-native sur DomOSClient.
 *
 * Expose des signaux réactifs d'état, les méthodes de connexion, et toutes
 * les primitives de communication avec l'agent (texte, contexte, outils,
 * événements, DevTools).
 *
 * @public
 *
 * @example
 * ```typescript
 * const domos = injectDomOS();
 * await domos.connect();
 * console.log(domos.state()); // 'connected'
 * ```
 */
export class DomOSAngularService {
  readonly state: Signal<ClientState>;
  readonly sessionId: Signal<string | null>;
  readonly isConnected: Signal<boolean>;

  private readonly stateSignal: WritableSignal<ClientState>;
  private readonly sessionIdSignal: WritableSignal<string | null>;
  private readonly isConnectedSignal: WritableSignal<boolean>;

  constructor(
    private readonly domosClient: DomOSClient,
    private readonly componentId = 'angular-sdk'
  ) {
    this.stateSignal = signal<ClientState>(this.domosClient.state);
    this.sessionIdSignal = signal<string | null>(this.domosClient.sessionId);
    this.isConnectedSignal = signal<boolean>(this.domosClient.isConnected);

    this.state = this.stateSignal.asReadonly();
    this.sessionId = this.sessionIdSignal.asReadonly();
    this.isConnected = this.isConnectedSignal.asReadonly();

    this.domosClient.on({
      onStateChange: (state) => {
        this.stateSignal.set(state);
        this.isConnectedSignal.set(this.domosClient.isConnected);
      },
      onSessionId: (sessionId) => {
        this.sessionIdSignal.set(sessionId);
      },
    });
  }

  private syncSignals(): void {
    this.stateSignal.set(this.domosClient.state);
    this.sessionIdSignal.set(this.domosClient.sessionId);
    this.isConnectedSignal.set(this.domosClient.isConnected);
  }

  /**
   * Connecte le client au serveur DomOS.
   *
   * @public
   *
   * @example
   * ```typescript
   * await domos.connect();
   * ```
   */
  async connect(): Promise<void> {
    await this.domosClient.connect();
    this.syncSignals();
  }

  /**
   * Déconnecte le client du serveur DomOS.
   *
   * @public
   *
   * @example
   * ```typescript
   * domos.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    this.domosClient.disconnect();
    this.syncSignals();
  }

  /**
   * Envoie un message texte à l'agent.
   *
   * @public
   *
   * @example
   * ```typescript
   * domos.sendText('Cherche un produit');
   * ```
   */
  sendText(text: string): void {
    this.domosClient.sendText(text);
  }

  /**
   * Met à jour le contexte passif envoyé à l'agent.
   *
   * @public
   *
   * @example
   * ```typescript
   * domos.updateContext({ page: 'home', userId: '42' });
   * ```
   */
  updateContext(data: Record<string, unknown>): void {
    this.domosClient.updateContext(data);
  }

  /**
   * S'abonne à un type d'événement DomOS spécifique.
   *
   * @public
   *
   * @example
   * ```typescript
   * const unsub = domos.subscribeEvent('tool_call', (e) => console.log(e));
   * // plus tard : unsub();
   * ```
   */
  subscribeEvent<TType extends DomOSClientEventType>(
    type: TType,
    listener: DomOSClientEventListener<TType>
  ): VoidFunction {
    return this.domosClient.onEvent(type, listener);
  }

  /**
   * S'abonne à tous les événements DomOS.
   *
   * @public
   *
   * @example
   * ```typescript
   * const unsub = domos.subscribeAnyEvent((e) => console.log(e.type));
   * ```
   */
  subscribeAnyEvent(listener: DomOSClientAnyEventListener): VoidFunction {
    return this.domosClient.onAnyEvent(listener);
  }

  /**
   * Enregistre un outil DomOS. Retourne une fonction de nettoyage pour le désenregistrer.
   *
   * @public
   *
   * @example
   * ```typescript
   * const dispose = domos.registerTool(
   *   { name: 'add_item', description: 'Ajouter un article', risk: 'low' },
   *   async (args) => addItem(args)
   * );
   * // plus tard : dispose();
   * ```
   */
  registerTool<TArgs extends DomOSToolArgs = DomOSToolArgs>(
    definition: DomOSToolDefinition<TArgs>,
    handler: DomOSToolHandler<TArgs>
  ): VoidFunction {
    const { componentId, global, schema, parameters, ...declaration } = definition;
    const toolDeclaration: ToolDeclaration = {
      ...declaration,
      parameters: schema
        ? zodToToolParameters(schema as unknown as Parameters<typeof zodToToolParameters>[0])
        : parameters,
    };

    this.domosClient.registerTool({
      declaration: toolDeclaration,
      handler: async (args) => handler((args ?? {}) as TArgs),
      componentId: componentId ?? this.componentId,
      global,
    });

    return () => {
      this.domosClient.unregisterTool(toolDeclaration.name);
    };
  }

  /**
   * Retourne la liste des outils enregistrés avec leurs métadonnées.
   *
   * @public
   */
  getRegisteredTools(): Array<ToolDeclaration & { source?: string; global?: boolean }> {
    return this.domosClient.toolsInfo;
  }

  /**
   * Invoque directement un outil DomOS par son nom.
   *
   * @public
   *
   * @example
   * ```typescript
   * const result = await domos.callTool('add_to_cart', { productId: '1' });
   * ```
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.domosClient.callTool(name, args);
  }

  /**
   * Retourne les métadonnées des plugins installés.
   *
   * @public
   */
  getInstalledPlugins(): PluginMeta[] {
    return this.domosClient.registeredPlugins;
  }

  /**
   * Retourne l'état courant de l'agent sous forme de chaîne.
   *
   * @public
   */
  getAgentState(): string {
    return this.domosClient.state;
  }
}
