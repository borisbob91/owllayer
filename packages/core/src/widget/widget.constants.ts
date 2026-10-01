import type { WidgetTheme, WidgetLabels, WidgetConfig, WidgetStylePreset } from './widget.types.js';

export const DEFAULT_THEME: Required<WidgetTheme> = {
  accentColor: '#f97316',
  backgroundColor: '#0f172a',
  surfaceColor: '#1e293b',
  textColor: '#f1f5f9',
  textMuted: '#94a3b8',
  dangerColor: '#ef4444',
  liveColor: '#22c55e',
  borderColor: '#334155',
  borderRadius: '16px',
};

/**
 * Default palette of each preset, applied between DEFAULT_THEME and the theme given by the application.
 * `call` keeps DEFAULT_THEME (dark, orange accent).
 */
export const PRESET_THEMES: Record<WidgetStylePreset, Partial<WidgetTheme>> = {
  call: {},
  chat: {
    accentColor: '#4f46e5',
    backgroundColor: '#ffffff',
    surfaceColor: '#f1f5f9',
    textColor: '#0f172a',
    textMuted: '#64748b',
    borderColor: '#e2e8f0',
    liveColor: '#16a34a',
    borderRadius: '18px',
  },
  travel: {
    accentColor: '#22d3ee',
    backgroundColor: '#0b1020',
    surfaceColor: '#162036',
    textColor: '#e6f1ff',
    textMuted: '#8ea3c4',
    borderColor: '#24304a',
    liveColor: '#34d399',
    borderRadius: '22px',
  },
};

export const DEFAULT_LABELS: Required<WidgetLabels> = {
  badge: '1 appel manqué',
  callToAction: 'Appeler l\'assistant',
  subtitle: 'Réponse immédiate',
  listening: 'En écoute…',
  thinking: 'Réflexion…',
  speaking: 'Parle…',
  idle: 'En ligne',
  error: 'Hors ligne',
  reconnecting: 'Reconnexion…',
  live: 'Live',
  hangUp: 'Raccrocher',
  textPlaceholder: 'Tapez votre message...',
  send: 'Envoyer',
  switchToText: 'Écrire plutôt',
  switchToVoice: 'Continuer à la voix',
  close: 'Fermer',
  muteMic: 'Couper le micro',
  unmuteMic: 'Réactiver le micro',
  emptyTitle: 'Bonjour !',
  emptyText: 'Comment puis-je vous aider ?',
  linesWaitingTitle: 'Toutes les lignes sont occupées',
  linesWaitingText: "Vous serez connecté dès qu'une ligne se libère…",
  linesBusyTitle: 'Service temporairement indisponible',
  linesBusyText: 'Toutes les lignes sont occupées. Veuillez réessayer dans quelques instants.',
};

export const DEFAULT_WIDGET_CONFIG: Required<WidgetConfig> = {
  agentName: 'Alex',
  agentTitle: 'Assistant',
  mode: 'audio',
  position: 'bottom-right',
  stylePreset: 'call',
  allowModeSwitch: true,
  fallbackToText: true,
  disableEndCallTool: false,
  theme: DEFAULT_THEME,
  labels: DEFAULT_LABELS,
};
