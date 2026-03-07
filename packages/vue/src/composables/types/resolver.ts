import { type z } from 'zod';

/**
 * Configuration d'un tool pour le resolver.
 */
export interface ResolverToolDefinition<TArgs = any> {
  /** Description pour le LLM */
  description: string;

  /** Schéma Zod pour validation des arguments */
  schema: z.ZodObject<any>;

  /** Niveau de risque HITL (note: 'medium' n'est pas supporté par @domos/core) */
  risk?: 'none' | 'low' | 'high' | 'critical';

  /** Handler exécuté quand le LLM appelle le tool */
  handler: (args: TArgs) => Promise<any> | any;

  /** Callback avant l'exécution */
  onBeforeCall?: (args: TArgs) => void | Promise<void>;

  /** Callback après succès */
  onAfterCall?: (args: TArgs, result: any) => void | Promise<void>;

  /** Callback en cas d'erreur */
  onError?: (args: TArgs, error: Error) => void | Promise<void>;
}

/**
 * Groupe de tools partageant un préfixe commun.
 */
export interface ResolverToolGroup {
  /** Préfixe ajouté à tous les noms de tools (ex: "cart_") */
  prefix?: string;

  /** Map des tools de ce groupe */
  tools: Record<string, ResolverToolDefinition>;
}

/**
 * Configuration complète du resolver.
 * Peut contenir plusieurs groupes de tools.
 */
export type ResolverConfig = Record<string, ResolverToolGroup>;

/**
 * Options pour useAgentToolResolver.
 */
export interface UseAgentToolResolverOptions {
  /** Désactiver temporairement tous les tools */
  disabled?: boolean;

  /** Mode debug (log tous les appels) */
  debug?: boolean;

  /**
   * Si true, les tools persistent après le démontage du composant.
   * Utile pour les tools globaux (navigation, panier, auth).
   */
  global?: boolean;

  /** Callback global avant tous les tools */
  onBeforeAnyCall?: (toolName: string, args: any) => void | Promise<void>;

  /** Callback global après tous les tools */
  onAfterAnyCall?: (toolName: string, args: any, result: any) => void | Promise<void>;

  /** Callback global en cas d'erreur */
  onErrorAnyCall?: (toolName: string, args: any, error: Error) => void | Promise<void>;
}

/**
 * Retour de useAgentToolResolver.
 */
export interface UseAgentToolResolverResult {
  /** Nombre de tools enregistrés */
  toolCount: number;

  /** Liste des noms de tools */
  toolNames: string[];
}
