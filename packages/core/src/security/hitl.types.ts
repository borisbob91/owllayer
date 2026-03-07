import { RiskLevel } from '../tools/types.js';

/**
 * Demande d'approbation utilisateur.
 * Generee quand un tool avec risk >= HIGH est appele.
 */
export interface ApprovalRequest {
  /** ID unique de la demande */
  id: string;

  /** ID de l'appel de tool correspondant */
  callId: string;

  /** Nom du tool */
  toolName: string;

  /** Arguments de l'appel */
  args: Record<string, unknown>;

  /** Niveau de risque */
  risk: RiskLevel;

  /** Message affiche a l'utilisateur */
  message: string;

  /** Timestamp de la demande */
  requestedAt: number;
}

/**
 * Reponse de l'utilisateur a une demande d'approbation.
 */
export interface ApprovalResponse {
  /** ID de la demande */
  requestId: string;

  /** Approuve ou refuse */
  approved: boolean;

  /** Timestamp de la reponse */
  respondedAt: number;
}
