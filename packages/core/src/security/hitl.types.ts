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

/**
 * Libelles de l'UI d'approbation HITL (tous optionnels, textes actuels par defaut).
 * Partage entre les SDK (React, Vue, Svelte, Angular, Browser) pour une configuration identique.
 */
export interface HitlLabels {
  /** Titre de la confirmation */
  title?: string;
  /** Remplace le message de la politique HITL (par defaut : message de la politique) */
  message?: string;
  /** Bouton d'approbation */
  approve?: string;
  /** Bouton de refus */
  deny?: string;
  /** Notification affichee apres un refus (banner) */
  deniedMessage?: string;
  /** Libelle affiche par nom de tool (ex. { confirm_checkout: 'Passer la commande' }) */
  toolLabels?: Record<string, string>;
}
