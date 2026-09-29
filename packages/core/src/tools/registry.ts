import type { ToolDeclaration } from '../protocol/aitp.types.js';
import { DEFAULTS } from '../protocol/aitp.constants.js';
import type { ToolDefinition, ToolRegistryChange, ToolRegistryDiff } from './types.js';
import { toDeclaration } from './types.js';

/**
 * Error thrown when a registration or a replacement would exceed the tool limit.
 * It is an `Error`, so existing `catch` blocks keep working.
 */
export class ToolLimitError extends Error {
  /** Name of the refused tool (`add`); undefined for `replaceAll`. */
  readonly toolName?: string;
  /** Active limit of the registry. */
  readonly limit: number;
  /** Size of the refused list (`replaceAll`); undefined for `add`. */
  readonly count?: number;

  constructor(message: string, details: { limit: number; toolName?: string; count?: number }) {
    super(message);
    this.name = 'ToolLimitError';
    this.limit = details.limit;
    this.toolName = details.toolName;
    this.count = details.count;
  }
}

/**
 * ToolRegistry - Registre dynamique des tools.
 *
 * Gere l'ajout/suppression de tools au fil de la navigation.
 * Calcule les diffs pour envoyer uniquement les changements au serveur.
 *
 * @example
 * ```ts
 * const registry = new ToolRegistry();
 * registry.add(myTool);
 * registry.remove('myTool');
 * const diff = registry.flush(); // Retourne les changements depuis le dernier flush
 * ```
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private previousSnapshot = new Map<string, ToolDeclaration>();
  private limit: number;
  private listeners = new Set<(change: ToolRegistryChange) => void>();
  private changedAt = 0;

  constructor(maxTools: number = DEFAULTS.MAX_ACTIVE_TOOLS) {
    this.limit = maxTools;
  }

  /** Current tool limit. */
  get maxTools(): number {
    return this.limit;
  }

  /** Timestamp (ms) of the last change that was notified; 0 before the first one. */
  get lastChangedAt(): number {
    return this.changedAt;
  }

  /**
   * Subscribe to the changes of the registry. The listener is called once per
   * change that modified the content, never for a no-op.
   * @returns a function that removes the listener.
   */
  onChange(listener: (change: ToolRegistryChange) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(added: string[], removed: string[]): void {
    this.changedAt = Date.now();
    const change: ToolRegistryChange = { added, removed };
    for (const listener of this.listeners) {
      listener(change);
    }
  }

  /**
   * Enregistrer un tool. Remplace si le nom existe deja.
   * @throws Si le nombre max de tools est atteint.
   */
  add(tool: ToolDefinition): void {
    if (!this.tools.has(tool.name) && this.tools.size >= this.limit) {
      throw new ToolLimitError(
        `ToolRegistry: nombre max de tools atteint (${this.limit}). ` +
        `Impossible d'ajouter "${tool.name}".`,
        { limit: this.limit, toolName: tool.name }
      );
    }
    this.tools.set(tool.name, tool);
    this.notify([tool.name], []);
  }

  /**
   * Replace the whole content in one step. The list is checked first: when it
   * exceeds the limit, a `ToolLimitError` is thrown and nothing changes.
   * Listeners are notified once.
   */
  replaceAll(tools: ToolDefinition[]): void {
    if (tools.length > this.limit) {
      throw new ToolLimitError(
        `ToolRegistry: ${tools.length} tools recus, maximum ${this.limit}.`,
        { limit: this.limit, count: tools.length }
      );
    }
    const previous = Array.from(this.tools.keys());
    this.tools.clear();
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
    const added = Array.from(this.tools.keys());
    const removed = previous.filter((name) => !this.tools.has(name));
    if (added.length > 0 || removed.length > 0) {
      this.notify(added, removed);
    }
  }

  /**
   * Change the tool limit. When the registry holds more tools than the new
   * limit, the first ones (registration order) are kept and the others removed.
   * @returns the names of the removed tools.
   * @throws RangeError if the limit is not a positive integer.
   */
  setMaxTools(limit: number): string[] {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError(`ToolRegistry: limite invalide (${limit}), entier positif attendu.`);
    }
    this.limit = limit;
    const removed = Array.from(this.tools.keys()).slice(limit);
    for (const name of removed) {
      this.tools.delete(name);
    }
    if (removed.length > 0) {
      this.notify([], removed);
    }
    return removed;
  }

  /**
   * Supprimer un tool par son nom.
   * @returns true si le tool existait.
   */
  remove(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      this.notify([], [name]);
    }
    return removed;
  }

  /**
   * Supprimer tous les tools d'un composant (quand il se demonte).
   * Tools marked `global` are kept.
   */
  removeByComponent(componentId: string): string[] {
    const removed: string[] = [];
    for (const [name, tool] of this.tools) {
      if (tool.componentId === componentId && !tool.global) {
        this.tools.delete(name);
        removed.push(name);
      }
    }
    if (removed.length > 0) {
      this.notify([], removed);
    }
    return removed;
  }

  /**
   * Recuperer un tool par son nom.
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Verifier si un tool existe.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Recuperer tous les tools.
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Recuperer toutes les declarations (format leger sans handler).
   */
  getDeclarations(): ToolDeclaration[] {
    return this.getAll().map(toDeclaration);
  }

  /**
   * Nombre de tools enregistres.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Calculer le diff depuis le dernier flush/snapshot.
   * Retourne les tools ajoutes et supprimes.
   */
  diff(): ToolRegistryDiff {
    const currentDeclarations = new Map<string, ToolDeclaration>();
    for (const tool of this.tools.values()) {
      currentDeclarations.set(tool.name, toDeclaration(tool));
    }

    const added: ToolDeclaration[] = [];
    const removed: string[] = [];

    // Tools ajoutes ou modifies
    for (const [name, decl] of currentDeclarations) {
      const prev = this.previousSnapshot.get(name);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(decl)) {
        added.push(decl);
      }
    }

    // Tools supprimes
    for (const name of this.previousSnapshot.keys()) {
      if (!currentDeclarations.has(name)) {
        removed.push(name);
      }
    }

    return { added, removed };
  }

  /**
   * Calculer le diff ET mettre a jour le snapshot.
   * Utilise pour envoyer un CONTEXT_UPDATE au serveur.
   */
  flush(): ToolRegistryDiff {
    const result = this.diff();

    // Mettre a jour le snapshot
    this.previousSnapshot.clear();
    for (const tool of this.tools.values()) {
      this.previousSnapshot.set(tool.name, toDeclaration(tool));
    }

    return result;
  }

  /**
   * Vider le registre.
   */
  clear(): void {
    const removed = Array.from(this.tools.keys());
    this.tools.clear();
    this.previousSnapshot.clear();
    if (removed.length > 0) {
      this.notify([], removed);
    }
  }
}
