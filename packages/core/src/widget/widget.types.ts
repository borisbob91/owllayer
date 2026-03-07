// ============================================================
// Widget Types — Types partagés pour le widget DomOS
// Style "appel téléphonique" compact
// Utilisés par React, Vue, Svelte, etc.
// ============================================================

/** Mode d'interaction */
export type WidgetMode = 'audio' | 'text';

/** Position du bouton flottant */
export type WidgetPosition = 'bottom-right' | 'bottom-left';

/** État visuel du widget */
export type WidgetVisualState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

/** Configuration du thème */
export interface WidgetTheme {
  /** Couleur d'accent principale (badge, icônes actifs) */
  accentColor?: string;          // default: '#f97316' (orange)
  /** Couleur de fond du bouton et panneau */
  backgroundColor?: string;      // default: '#0f172a' (slate-900)
  /** Couleur de fond secondaire */
  surfaceColor?: string;         // default: '#1e293b' (slate-800)
  /** Couleur du texte principal */
  textColor?: string;            // default: '#f1f5f9'
  /** Couleur du texte secondaire */
  textMuted?: string;            // default: '#94a3b8'
  /** Couleur du bouton raccrocher */
  dangerColor?: string;          // default: '#ef4444'
  /** Couleur du badge LIVE */
  liveColor?: string;            // default: '#22c55e'
  /** Couleur des bordures */
  borderColor?: string;          // default: '#334155'
  /** Border radius général */
  borderRadius?: string;         // default: '16px'
}

/** Labels (i18n) */
export interface WidgetLabels {
  /** Texte du badge sur le bouton (ex: "1 appel manqué") */
  badge?: string;
  /** Call to action principal (ex: "Appeler le CEO") */
  callToAction?: string;
  /** Sous-titre du bouton (ex: "Réponse immédiate") */
  subtitle?: string;
  /** Statut: en écoute */
  listening?: string;
  /** Statut: réflexion */
  thinking?: string;
  /** Statut: l'agent parle */
  speaking?: string;
  /** Statut: prêt */
  idle?: string;
  /** Statut: erreur */
  error?: string;
  /** Statut: reconnexion */
  reconnecting?: string;
  /** Badge LIVE */
  live?: string;
  /** Bouton raccrocher */
  hangUp?: string;
  /** Placeholder du champ texte */
  textPlaceholder?: string;
  /** Texte du bouton envoyer */
  send?: string;
}

/** Message dans l'historique du widget */
export interface WidgetMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

/** Configuration complète du widget */
export interface WidgetConfig {
  /** Nom de l'agent affiché dans le header (ex: "Alex") */
  agentName?: string;
  /** Titre/rôle de l'agent (ex: "CEO", "Vendeur") */
  agentTitle?: string;
  /** Mode par défaut : audio ou texte */
  mode?: WidgetMode;
  /** Position du bouton */
  position?: WidgetPosition;
  /** Permettre la bascule audio ↔ texte */
  allowModeSwitch?: boolean;
  /** Basculer auto en texte si erreur micro */
  fallbackToText?: boolean;
  /** Thème visuel */
  theme?: WidgetTheme;
  /** Labels / i18n */
  labels?: WidgetLabels;
}
