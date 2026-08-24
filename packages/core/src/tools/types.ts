import type { z } from 'zod';
import type { ToolDeclaration, ToolParameters } from '../protocol/aitp.types.js';

/**
 * Niveaux de risque d'un tool.
 * Determine le comportement du SDK client avant execution.
 */
export enum RiskLevel {
  /** Execution immediate, pas de notification (navigation, lecture) */
  NONE = 'none',

  /** Execution + notification visuelle (ajout panier) */
  LOW = 'low',

  /** Blocage + modale de confirmation (paiement, suppression) */
  HIGH = 'high',

  /** Blocage + double confirmation (suppression compte, actions irreversibles) */
  CRITICAL = 'critical',
}

/**
 * Definition complete d'un tool (cote client avec callback).
 */
export interface ToolDefinition<T = unknown> {
  /** Nom unique du tool */
  name: string;

  /** Description pour le LLM */
  description: string;

  /** Schema Zod pour la validation des arguments */
  schema?: z.ZodType<T>;

  /** Parametres au format JSON Schema (genere depuis le Zod schema) */
  parameters?: ToolParameters;

  /** Niveau de risque */
  risk: RiskLevel;

  /** Callback execute quand le LLM appelle ce tool */
  handler?: (args: T) => Promise<unknown> | unknown;

  /** Source du tool : client (composant React) ou server */
  source: 'client' | 'server';

  /** ID du composant qui a enregistre ce tool (client only) */
  componentId?: string;
}

/**
 * Resultat de l'execution d'un tool.
 */
export interface ToolExecutionResult {
  callId: string;
  name: string;
  status: 'success' | 'error' | 'pending_approval';
  result?: unknown;
  error?: string;
  duration: number; // ms
}

/**
 * Diff entre deux etats du registre de tools.
 */
export interface ToolRegistryDiff {
  added: ToolDeclaration[];
  removed: string[];
}

/**
 * Convertir un ToolDefinition en ToolDeclaration (format leger pour le protocol).
 */
export function toDeclaration(tool: ToolDefinition): ToolDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    risk: tool.risk,
  };
}
