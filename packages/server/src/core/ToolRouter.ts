import {
  Messages,
  createLogger,
  generateId,
  type AITPMessage,
  type ToolDeclaration,
  type ToolParameters,
  type ToolCallPayload,
  type ToolResultPayload,
} from '@owllayer/core';
import type { Session } from './SessionManager.js';

const log = createLogger('OwlLayer:ToolRouter');

/**
 * Handler pour un tool cote serveur.
 */
export type ServerToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export type ServerToolRisk = NonNullable<ToolDeclaration['risk']>;

export interface ServerToolDeclaration {
  name: string;
  description: string;
  parameters?: ToolParameters;
  risk: ServerToolRisk;
  handler: ServerToolHandler;
  /** API keys autorisees a voir et appeler ce tool (defaut : toutes les cles). */
  apiKeys?: string[];
}

export type ServerToolMetadata = Omit<ServerToolDeclaration, 'name' | 'handler'> & {
  name?: string;
};

/**
 * Callback pour envoyer un message au client.
 */
export type SendToClient = (connId: string, message: AITPMessage) => boolean;

/**
 * Resultat en attente d'un tool call client.
 */
interface PendingToolCall {
  callId: string;
  toolName: string;
  connId: string;
  resolve: (result: ToolResultPayload) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  sentAt: number;
}

/**
 * ToolRouter - Dispatch les appels de tools vers le client ou le serveur.
 *
 * Flux :
 * 1. Le LLM demande un tool call
 * 2. ToolRouter verifie si le tool est server-side ou client-side
 * 3. Server-side → execute le handler localement
 * 4. Client-side → envoie un TOOL_CALL au client et attend le TOOL_RESULT
 */
export class ToolRouter {
  private serverTools = new Map<string, ServerToolDeclaration>();
  private pendingCalls = new Map<string, PendingToolCall>();

  constructor(
    private sendToClient: SendToClient,
    private toolTimeoutMs: number = 10_000
  ) {}

  /**
   * Enregistrer un tool cote serveur.
   */
  registerServerTool(name: string, handler: ServerToolHandler): void;
  registerServerTool(name: string, declaration: ServerToolMetadata, handler: ServerToolHandler): void;
  registerServerTool(declaration: ServerToolDeclaration): void;
  registerServerTool(
    nameOrDeclaration: string | ServerToolDeclaration,
    declarationOrHandler?: ServerToolMetadata | ServerToolHandler,
    maybeHandler?: ServerToolHandler
  ): void {
    const declaration = this.normalizeServerToolDeclaration(
      nameOrDeclaration,
      declarationOrHandler,
      maybeHandler
    );
    this.serverTools.set(declaration.name, declaration);
    log.info(`Server tool registered: ${declaration.name}`);
  }

  /**
   * Reserver un tool serveur deja enregistre a certaines API keys.
   * Utilise par le systeme de plugins (option `apiKeys` a l'installation).
   */
  restrictServerTool(name: string, apiKeys: string[]): void {
    const tool = this.serverTools.get(name);
    if (tool) tool.apiKeys = [...apiKeys];
  }

  /**
   * Router un appel de tool.
   * @returns Le resultat du tool (server-side ou client-side).
   */
  async route(session: Session, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const callId = `call_${generateId()}`;

    // 1. Verifier si c'est un tool server-side, disponible pour la cle de la session
    const serverTool = this.serverTools.get(toolName);
    if (serverTool && this.isAvailableFor(serverTool, session.apiKey)) {
      log.debug(`Server-side tool: ${toolName} (${callId})`);
      return await this.executeServerTool(callId, serverTool, args);
    }

    // 2. Sinon, envoyer au client
    log.debug(`Client-side tool: ${toolName} (${callId})`);
    return await this.executeClientTool(session, callId, toolName, args);
  }

  /**
   * Recevoir un TOOL_RESULT du client.
   * @param fromConnId Connexion emettrice : si elle est fournie, elle doit etre celle
   *   qui a recu le TOOL_CALL (une autre session ne peut pas injecter de resultat).
   */
  handleToolResult(result: ToolResultPayload, fromConnId?: string): void {
    const pending = this.pendingCalls.get(result.callId);
    if (!pending) {
      log.warn(`TOOL_RESULT for unknown call: ${result.callId}`);
      return;
    }
    if (fromConnId !== undefined && pending.connId !== fromConnId) {
      log.warn(`TOOL_RESULT rejected: ${result.callId} belongs to another connection`);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingCalls.delete(result.callId);

    const duration = Date.now() - pending.sentAt;
    log.debug(`Tool result received: ${pending.toolName} (${duration}ms)`);

    pending.resolve(result);
  }

  /**
   * Prolonger le timeout d'attente d'un tool en attente d'approbation humaine (HITL).
   */
  extendTimeoutForApproval(callId: string, timeoutMs = 120_000, fromConnId?: string): void {
    const pending = this.pendingCalls.get(callId);
    if (!pending) return;
    if (fromConnId !== undefined && pending.connId !== fromConnId) return;

    clearTimeout(pending.timeout);
    pending.timeout = setTimeout(() => {
      this.pendingCalls.delete(callId);
      pending.reject(new Error(`Tool "${pending.toolName}" approval timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    log.debug(`Timeout extended for HITL approval: ${pending.toolName} (${callId}, +${timeoutMs}ms)`);
  }

  private async executeServerTool(
    callId: string,
    tool: ServerToolDeclaration,
    args: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const result = await tool.handler(args);
      log.debug(`Server tool OK: ${tool.name}`, result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      log.error(`Server tool error: ${tool.name}`, error);
      throw new Error(`Tool "${tool.name}" failed: ${error}`);
    }
  }

  private executeClientTool(
    session: Session,
    callId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResultPayload> {
    return new Promise((resolve, reject) => {
      // Envoyer le TOOL_CALL au client
      const message = Messages.toolCall(callId, toolName, args);
      const sent = this.sendToClient(session.connId, message);

      if (!sent) {
        reject(new Error(`Failed to send TOOL_CALL to client (session: ${session.id})`));
        return;
      }

      // Attendre le TOOL_RESULT avec timeout
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(callId);
        reject(new Error(`Tool "${toolName}" timed out after ${this.toolTimeoutMs}ms`));
      }, this.toolTimeoutMs);

      this.pendingCalls.set(callId, {
        callId,
        toolName,
        connId: session.connId,
        resolve,
        reject,
        timeout,
        sentAt: Date.now(),
      });
    });
  }

  /**
   * Nombre d'appels en attente.
   */
  get pendingCount(): number {
    return this.pendingCalls.size;
  }

  /**
   * Verifier si un tool est enregistre cote serveur.
   */
  hasServerTool(name: string): boolean {
    return this.serverTools.has(name);
  }

  /**
   * Retirer un tool cote serveur.
   * Utilise par le systeme de plugins pour la desinstallation isolee.
   */
  unregisterServerTool(name: string): void {
    this.serverTools.delete(name);
  }

  /**
   * Executer un tool cote serveur (sans router vers client).
   */
  async runServerTool(callId: string, name: string, args: Record<string, unknown>, apiKey?: string): Promise<unknown> {
    const tool = this.serverTools.get(name);
    if (!tool || (apiKey !== undefined && !this.isAvailableFor(tool, apiKey))) {
      throw new Error(`Tool "${name}" non trouve cote serveur`);
    }
    return await this.executeServerTool(callId, tool, args);
  }

  /**
   * Noms des tools enregistres cote serveur.
   */
  getServerToolNames(): string[] {
    return Array.from(this.serverTools.keys());
  }

  /**
   * Declaration d'un tool serveur ; avec `apiKey`, undefined si le tool est reserve a d'autres cles.
   */
  getServerToolDeclaration(name: string, apiKey?: string): ToolDeclaration | undefined {
    const tool = this.serverTools.get(name);
    if (!tool) return undefined;
    if (apiKey !== undefined && !this.isAvailableFor(tool, apiKey)) return undefined;
    return this.toToolDeclaration(tool);
  }

  /**
   * Declarations des tools serveur ; avec `apiKey`, seulement ceux ouverts a cette cle.
   */
  getServerToolDeclarations(apiKey?: string): ToolDeclaration[] {
    return Array.from(this.serverTools.values())
      .filter((tool) => apiKey === undefined || this.isAvailableFor(tool, apiKey))
      .map((tool) => this.toToolDeclaration(tool));
  }

  private isAvailableFor(tool: ServerToolDeclaration, apiKey: string): boolean {
    return !tool.apiKeys || tool.apiKeys.includes(apiKey);
  }

  /**
   * Annuler tous les appels en attente (deconnexion).
   */
  cancelAll(): void {
    for (const [callId, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(`Tool "${pending.toolName}" annule (deconnexion)`));
    }
    this.pendingCalls.clear();
  }

  /**
   * Annuler les appels en attente pour une connexion.
   */
  cancelByConnection(connId: string): void {
    for (const [callId, pending] of this.pendingCalls) {
      if (pending.connId !== connId) continue;
      clearTimeout(pending.timeout);
      pending.reject(new Error(`Tool "${pending.toolName}" annule (deconnexion)`));
      this.pendingCalls.delete(callId);
    }
  }

  private normalizeServerToolDeclaration(
    nameOrDeclaration: string | ServerToolDeclaration,
    declarationOrHandler?: ServerToolMetadata | ServerToolHandler,
    maybeHandler?: ServerToolHandler
  ): ServerToolDeclaration {
    if (typeof nameOrDeclaration !== 'string') {
      return {
        ...nameOrDeclaration,
        risk: nameOrDeclaration.risk ?? 'none',
      };
    }

    const name = nameOrDeclaration;

    if (typeof declarationOrHandler === 'function') {
      return {
        name,
        description: `Server-side tool "${name}"`,
        risk: 'none',
        handler: declarationOrHandler,
      };
    }

    if (!declarationOrHandler || typeof maybeHandler !== 'function') {
      throw new Error(`Server tool "${name}" requiert un handler`);
    }

    return {
      name,
      description: declarationOrHandler.description,
      parameters: declarationOrHandler.parameters,
      risk: declarationOrHandler.risk ?? 'none',
      handler: maybeHandler,
      apiKeys: declarationOrHandler.apiKeys,
    };
  }

  private toToolDeclaration(tool: ServerToolDeclaration): ToolDeclaration {
    return {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      risk: tool.risk,
    };
  }
}
