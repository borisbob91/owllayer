import type { ToolDeclaration } from '../protocol/aitp.types.js';
import { DEFAULTS } from '../protocol/aitp.constants.js';
import type { ToolDefinition, ToolRegistryDiff } from './types.js';
import { toDeclaration } from './types.js';

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
  private maxTools: number;

  constructor(maxTools: number = DEFAULTS.MAX_ACTIVE_TOOLS) {
    this.maxTools = maxTools;
  }

  /**
   * Enregistrer un tool. Remplace si le nom existe deja.
   * @throws Si le nombre max de tools est atteint.
   */
  add(tool: ToolDefinition): void {
    if (!this.tools.has(tool.name) && this.tools.size >= this.maxTools) {
      throw new Error(
        `ToolRegistry: nombre max de tools atteint (${this.maxTools}). ` +
        `Impossible d'ajouter "${tool.name}".`
      );
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Supprimer un tool par son nom.
   * @returns true si le tool existait.
   */
  remove(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Supprimer tous les tools d'un composant (quand il se demonte).
   */
  removeByComponent(componentId: string): string[] {
    const removed: string[] = [];
    for (const [name, tool] of this.tools) {
      if (tool.componentId === componentId) {
        this.tools.delete(name);
        removed.push(name);
      }
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
    this.tools.clear();
    this.previousSnapshot.clear();
  }
}
