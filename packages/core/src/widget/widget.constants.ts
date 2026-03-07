import type { WidgetTheme, WidgetLabels, WidgetConfig } from './widget.types.js';

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

export const DEFAULT_LABELS: Required<WidgetLabels> = {
  badge: '1 appel manqu\u00e9',
  callToAction: 'Appeler l\'assistant',
  subtitle: 'R\u00e9ponse imm\u00e9diate',
  listening: 'EN \u00c9COUTE...',
  thinking: 'R\u00c9FLEXION...',
  speaking: 'PARLE...',
  idle: 'PR\u00caT',
  error: 'HORS LIGNE',
  reconnecting: 'RECONNEXION...',
  live: 'LIVE',
  hangUp: 'Raccrocher',
  textPlaceholder: 'Tapez votre message...',
  send: 'Envoyer',
};

export const DEFAULT_WIDGET_CONFIG: Required<WidgetConfig> = {
  agentName: 'Alex',
  agentTitle: 'Assistant',
  mode: 'audio',
  position: 'bottom-right',
  allowModeSwitch: true,
  fallbackToText: true,
  theme: DEFAULT_THEME,
  labels: DEFAULT_LABELS,
};
