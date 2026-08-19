import { signal, NgZone, type Signal, type WritableSignal } from '@angular/core';
import {
  OwlLayerClient,
  zodToToolParameters,
  type ClientState,
  type OwlLayerClientAnyEventListener,
  type OwlLayerClientEventListener,
  type OwlLayerClientEventType,
  type PluginMeta,
  type ToolDeclaration,
} from '@owllayer/core';
import type { OwlLayerToolArgs, OwlLayerToolDefinition, OwlLayerToolHandler } from '../types/types.js';

/**
 * OwlLayerAngularService — Façade Angular-native sur OwlLayerClient.
 *
 * Expose des signaux réactifs d'état, les méthodes de connexion, et toutes
 * les primitives de communication avec l'agent (texte, contexte, outils,
 * événements, DevTools).
 *
 * @public
 *
 * @example
 * ```typescript
 * const owllayer = injectOwlLayer();
 * await owllayer.connect();
 * console.log(owllayer.state()); // 'connected'
 * ```
 */
export class OwlLayerAngularService {
  readonly state: Signal<ClientState>;
  readonly sessionId: Signal<string | null>;
  readonly isConnected: Signal<boolean>;

  /** Expose le OwlLayerClient sous-jacent pour les composants qui en ont besoin (ex: widget). */
  get client(): OwlLayerClient {
    return this.owlLayerClient;
  }

  private readonly stateSignal: WritableSignal<ClientState>;
  private readonly sessionIdSignal: WritableSignal<string | null>;
  private readonly isConnectedSignal: WritableSignal<boolean>;

  constructor(
    private readonly owlLayerClient: OwlLayerClient,
    private readonly componentId = 'angular-sdk',
    private readonly ngZone?: NgZone
  ) {
    this.stateSignal = signal<ClientState>(this.owlLayerClient.state);
    this.sessionIdSignal = signal<string | null>(this.owlLayerClient.sessionId);
    this.isConnectedSignal = signal<boolean>(this.owlLayerClient.isConnected);

    this.state = this.stateSignal.asReadonly();
    this.sessionId = this.sessionIdSignal.asReadonly();
    this.isConnected = this.isConnectedSignal.asReadonly();

    this.owlLayerClient.on({
      onStateChange: (state) => {
        this.stateSignal.set(state);
        this.isConnectedSignal.set(this.owlLayerClient.isConnected);
      },
      onSessionId: (sessionId) => {
        this.sessionIdSignal.set(sessionId);
      },
    });
  }

  private syncSignals(): void {
    this.stateSignal.set(this.owlLayerClient.state);
    this.sessionIdSignal.set(this.owlLayerClient.sessionId);
    this.isConnectedSignal.set(this.owlLayerClient.isConnected);
  }

  /**
   * Connecte le client au serveur OwlLayer.
   *
   * @public
   *
   * @example
   * ```typescript
   * await owllayer.connect();
   * ```
   */
  async connect(): Promise<void> {
    await this.owlLayerClient.connect();
    this.syncSignals();
  }

  /**
   * Déconnecte le client du serveur OwlLayer.
   *
   * @public
   *
   * @example
   * ```typescript
   * owllayer.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    this.owlLayerClient.disconnect();
    this.syncSignals();
  }

  /**
   * Envoie un message texte à l'agent.
   *
   * @public
   *
   * @example
   * ```typescript
   * owllayer.sendText('Cherche un produit');
   * ```
   */
  sendText(text: string): void {
    this.owlLayerClient.sendText(text);
  }

  /**
   * Envoie un payload audio complet à l'agent.
   *
   * @public
   */
  sendAudio(audioBase64: string, mimeType: string): void {
    this.owlLayerClient.sendAudio(audioBase64, mimeType);
  }

  /**
   * Envoie un chunk audio en mode live.
   *
   * @public
   */
  sendAudioStream(audioBase64: string, mimeType?: string): void {
    this.owlLayerClient.sendAudioStream(audioBase64, mimeType);
  }

  /**
   * Signale la fin de la prise de parole utilisateur.
   *
   * @public
   */
  sendAudioEnd(reason?: Parameters<OwlLayerClient['sendAudioEnd']>[0]): void {
    this.owlLayerClient.sendAudioEnd(reason);
  }

  /**
   * Interrompt l'agent en cours de lecture.
   *
   * @public
   */
  sendInterrupt(): void {
    this.owlLayerClient.sendInterrupt();
  }

  /**
   * S'abonne aux chunks audio de sortie du modele.
   *
   * @public
   */
  onAudioOutput(listener: (audioBase64: string, mimeType: string) => void): VoidFunction {
    return this.owlLayerClient.onEvent('audio.output.chunk', (payload) => {
      listener(payload.audioBase64, payload.mimeType);
    });
  }

  /**
   * Met à jour le contexte passif envoyé à l'agent.
   *
   * @public
   *
   * @example
   * ```typescript
   * owllayer.updateContext({ page: 'home', userId: '42' });
   * ```
   */
  updateContext(data: Record<string, unknown>): void {
    this.owlLayerClient.updateContext(data);
  }

  /**
   * S'abonne à un type d'événement OwlLayer spécifique.
   *
   * @public
   *
   * @example
   * ```typescript
   * const unsub = owllayer.subscribeEvent('tool_call', (e) => console.log(e));
   * // plus tard : unsub();
   * ```
   */
  subscribeEvent<TType extends OwlLayerClientEventType>(
    type: TType,
    listener: OwlLayerClientEventListener<TType>
  ): VoidFunction {
    return this.owlLayerClient.onEvent(type, listener);
  }

  /**
   * S'abonne à tous les événements OwlLayer.
   *
   * @public
   *
   * @example
   * ```typescript
   * const unsub = owllayer.subscribeAnyEvent((e) => console.log(e.type));
   * ```
   */
  subscribeAnyEvent(listener: OwlLayerClientAnyEventListener): VoidFunction {
    return this.owlLayerClient.onAnyEvent(listener);
  }

  /**
   * Enregistre un outil OwlLayer. Retourne une fonction de nettoyage pour le désenregistrer.
   *
   * @public
   *
   * @example
   * ```typescript
   * const dispose = owllayer.registerTool(
   *   { name: 'add_item', description: 'Ajouter un article', risk: 'low' },
   *   async (args) => addItem(args)
   * );
   * // plus tard : dispose();
   * ```
   */
  registerTool<TArgs extends OwlLayerToolArgs = OwlLayerToolArgs>(
    definition: OwlLayerToolDefinition<TArgs>,
    handler: OwlLayerToolHandler<TArgs>
  ): VoidFunction {
    const { componentId, global, schema, parameters, ...declaration } = definition;
    const toolDeclaration: ToolDeclaration = {
      ...declaration,
      parameters: schema
        ? zodToToolParameters(schema as unknown as Parameters<typeof zodToToolParameters>[0])
        : parameters,
    };

    this.owlLayerClient.registerTool({
      declaration: toolDeclaration,
      handler: async (args) => this.ngZone
        ? this.ngZone.runOutsideAngular(() => handler((args ?? {}) as TArgs) as Promise<unknown>)
        : handler((args ?? {}) as TArgs),
      componentId: componentId ?? this.componentId,
      global,
    });

    return () => {
      this.owlLayerClient.unregisterTool(toolDeclaration.name);
    };
  }

  /**
   * Retourne la liste des outils enregistrés avec leurs métadonnées.
   *
   * @public
   */
  getRegisteredTools(): Array<ToolDeclaration & { source?: string; global?: boolean }> {
    return this.owlLayerClient.toolsInfo;
  }

  /**
   * Retourne les tools réellement exposés au serveur après résolution des collisions.
   *
   * @public
   */
  getEffectiveTools(): ToolDeclaration[] {
    return this.owlLayerClient.effectiveTools;
  }

  /**
   * Retourne les tools client ignores car un tool serveur du même nom est prioritaire.
   *
   * @public
   */
  getIgnoredClientTools(): ToolDeclaration[] {
    return this.owlLayerClient.ignoredClientTools;
  }

  /**
   * Invoque directement un outil OwlLayer par son nom.
   *
   * @public
   *
   * @example
   * ```typescript
   * const result = await owllayer.callTool('add_to_cart', { productId: '1' });
   * ```
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return this.owlLayerClient.callTool(name, args);
  }

  /**
   * Retourne les métadonnées des plugins installés.
   *
   * @public
   */
  getInstalledPlugins(): PluginMeta[] {
    return this.owlLayerClient.registeredPlugins;
  }

  /**
   * Retourne l'état courant de l'agent sous forme de chaîne.
   *
   * @public
   */
  getAgentState(): string {
    return this.owlLayerClient.state;
  }
}
