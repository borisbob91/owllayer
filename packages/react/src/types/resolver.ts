import type { z } from 'zod';

/**
 * Niveau de risque d'un tool (pour HITL security)
 * Note: 'medium' n'est pas supporté par @owllayer/core
 */
export type RiskLevel = 'none' | 'low' | 'high' | 'critical';

/**
 * Définition d'un tool dans un resolver
 */
export interface ResolverToolDefinition<TArgs = any> {
  /** Description du tool pour le LLM */
  description: string;

  /** Schéma Zod des paramètres */
  schema: z.ZodObject<any>;

  /** Handler qui reçoit les args typés */
  handler: (args: TArgs) => Promise<unknown> | unknown;

  /** Niveau de risque (optionnel, défaut: 'low') */
  risk?: RiskLevel;

  /** Callback avant l'exécution de ce tool */
  onBeforeCall?: (args: TArgs) => void | Promise<void>;

  /** Callback après succès de ce tool */
  onAfterCall?: (args: TArgs, result: any) => void | Promise<void>;

  /** Callback en cas d'erreur de ce tool */
  onError?: (args: TArgs, error: Error) => void | Promise<void>;
}

/**
 * Un groupe de tools (ex: navigation, cart, checkout)
 */
export interface ResolverToolGroup {
  /** Préfixe ajouté à tous les noms de tools du groupe (ex: "cart_") */
  prefix?: string;

  tools: Record<string, ResolverToolDefinition<any>>;
}

/**
 * Configuration complète du resolver
 */
export interface ResolverConfig {
  [groupName: string]: ResolverToolGroup;
}

/**
 * Options du resolver
 */
export interface UseAgentToolResolverOptions {
  /** Préfixe global appliqué à tous les tools (prioritaire sur prefix du groupe) */
  prefix?: string;

  /** Activer les logs de debug */
  debug?: boolean;

  /** Désactiver temporairement tous les tools */
  disabled?: boolean;

  /**
   * Si true, les tools persistent après le démontage du composant.
   * Utile pour les tools globaux (navigation, panier, auth).
   */
  global?: boolean;

  /** Callback global avant tous les tool calls */
  onBeforeAnyCall?: (toolName: string, args: any) => void | Promise<void>;

  /** Callback global après tous les tool calls */
  onAfterAnyCall?: (toolName: string, args: any, result: any) => void | Promise<void>;

  /** Callback global en cas d'erreur */
  onErrorAnyCall?: (toolName: string, args: any, error: Error) => void | Promise<void>;
}

/**
 * Retour du hook useAgentToolResolver
 */
export interface UseAgentToolResolverResult {
  /** Nombre de tools enregistrés */
  toolCount: number;

  /** Liste des noms de tools enregistrés */
  toolNames: string[];
}
