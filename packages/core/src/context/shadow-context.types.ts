/**
 * ShadowContext - Representation legere de l'etat UI.
 * Synchronise entre le client et le serveur.
 */
export interface ShadowContext {
  /** URL actuelle de la page */
  url: string;

  /** Titre de la page */
  title?: string;

  /** Donnees contextuelles injectees par useAgentContext */
  data: Record<string, unknown>;

  /** Timestamp de la derniere mise a jour */
  updatedAt: number;
}

/**
 * Evenement de changement de contexte.
 */
export interface ContextChangeEvent {
  previous: ShadowContext;
  current: ShadowContext;
  changes: ContextDiffResult;
}

/**
 * Resultat d'un diff de contexte.
 */
export interface ContextDiffResult {
  urlChanged: boolean;
  titleChanged: boolean;
  dataChanges: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}
