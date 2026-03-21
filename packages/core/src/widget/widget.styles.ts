import type { WidgetStylePreset, WidgetTheme } from './widget.types.js';
import { DEFAULT_THEME } from './widget.constants.js';

/**
 * Générer le CSS complet du widget avec les couleurs du thème.
 * CSS pur injecté dans le Shadow DOM — pas de dépendance Tailwind runtime.
 * Style "appel téléphonique" compact.
 */
export function generateWidgetStyles(
  theme?: Partial<WidgetTheme>,
  stylePreset: WidgetStylePreset = 'call'
): string {
  const t = { ...DEFAULT_THEME, ...theme };
  const presetStyles = stylePreset === 'chat'
    ? `
/* ============================================================
   PRESET: CHAT
   ============================================================ */
.domos-fab.domos-preset-chat {
  border-radius: 999px;
  padding: 10px 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 86%, #fff 14%), var(--bg));
}
.domos-fab.domos-preset-chat .domos-fab-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}
.domos-panel.domos-preset-chat {
  width: 360px;
  border-radius: 20px;
  box-shadow: 0 12px 50px rgba(0, 0, 0, 0.5);
}
.domos-panel.domos-preset-chat .domos-panel-header {
  background: color-mix(in srgb, var(--surface) 76%, #fff 24%);
}
`
    : stylePreset === 'travel'
      ? `
/* ============================================================
   PRESET: TRAVEL
   ============================================================ */
.domos-fab.domos-preset-travel {
  background: linear-gradient(165deg, color-mix(in srgb, var(--bg) 78%, #0ea5e9 22%), var(--bg));
}
.domos-fab.domos-preset-travel .domos-fab-badge {
  background: color-mix(in srgb, var(--accent) 70%, #38bdf8 30%);
}
.domos-panel.domos-preset-travel {
  border-color: color-mix(in srgb, var(--border) 70%, #0ea5e9 30%);
  box-shadow:
    0 8px 48px rgba(2, 132, 199, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}
.domos-panel.domos-preset-travel .domos-live-badge {
  background: color-mix(in srgb, var(--live) 68%, #06b6d4 32%);
}
`
      : '';

  return `
/* ============================================================
   DomOS Widget — Call-style compact UI
   ============================================================ */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:host {
  --accent: ${t.accentColor};
  --bg: ${t.backgroundColor};
  --surface: ${t.surfaceColor};
  --text: ${t.textColor};
  --text-muted: ${t.textMuted};
  --danger: ${t.dangerColor};
  --live: ${t.liveColor};
  --border: ${t.borderColor};
  --radius: ${t.borderRadius};

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

/* ============================================================
   FLOATING BUTTON — Pill card
   ============================================================ */

.domos-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  animation: domos-slide-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
  text-decoration: none;
  outline: none;
  max-width: 300px;
}

.domos-fab.bottom-left {
  right: auto;
  left: 24px;
}

.domos-fab:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

.domos-fab:active {
  transform: translateY(0) scale(0.98);
}

/* Badge "1 appel manqué" */
.domos-fab-badge {
  position: absolute;
  top: -10px;
  left: 16px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
  white-space: nowrap;
  animation: domos-badge-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}

/* Contenu texte du bouton */
.domos-fab-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.domos-fab-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domos-fab-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Icône téléphone (cercle orange) */
.domos-fab-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(249, 115, 22, 0.35);
  transition: box-shadow 0.2s;
}

.domos-fab:hover .domos-fab-icon {
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.5);
}

.domos-fab-icon svg {
  width: 20px;
  height: 20px;
  fill: #fff;
  stroke: none;
}

/* ============================================================
   CALL PANEL — Compact card
   ============================================================ */

.domos-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  width: 320px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow:
    0 8px 48px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: domos-panel-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.domos-panel.bottom-left {
  right: auto;
  left: 24px;
}

.domos-panel.is-closing {
  animation: domos-panel-out 0.25s ease forwards;
}

/* --- Header --- */
.domos-panel-header {
  display: flex;
  align-items: center;
  padding: 16px 18px;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.domos-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-muted);
}

.domos-avatar svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.domos-agent-info {
  flex: 1;
  min-width: 0;
}

.domos-agent-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.domos-agent-status {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.domos-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--live);
  animation: domos-pulse 1.5s infinite;
}

.domos-status-dot.error {
  background: var(--danger);
  animation: none;
}

.domos-status-dot.offline {
  background: var(--text-muted);
  animation: none;
}

/* Badge LIVE */
.domos-live-badge {
  font-size: 10px;
  font-weight: 800;
  color: var(--live);
  border: 1.5px solid var(--live);
  border-radius: 6px;
  padding: 2px 8px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

/* Header action buttons (switch mode, etc.) */
.domos-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.domos-btn-header {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  outline: none;
  flex-shrink: 0;
  position: relative;
}

.domos-btn-header:hover {
  background: var(--surface);
  color: var(--text);
  border-color: var(--text-muted);
}

.domos-btn-header.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.domos-btn-header svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Tooltip on header buttons */
.domos-btn-header .domos-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.domos-btn-header:hover .domos-tooltip {
  opacity: 1;
}

/* --- Body (audio zone) --- */
.domos-panel-body {
  padding: 28px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 80px;
}

/* Audio dots animation */
.domos-audio-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 24px;
}

.domos-audio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.3s, transform 0.3s;
}

/* Idle — petits dots statiques */
.domos-audio-dots.idle .domos-audio-dot {
  opacity: 0.4;
}

/* Listening — indigo dots bouncing */
.domos-audio-dots.listening .domos-audio-dot {
  background: var(--accent);
  animation: domos-dot-bounce 1s ease-in-out infinite;
}

.domos-audio-dots.listening .domos-audio-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.domos-audio-dots.listening .domos-audio-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.domos-audio-dots.listening .domos-audio-dot:nth-child(4) {
  animation-delay: 0.45s;
}

.domos-audio-dots.listening .domos-audio-dot:nth-child(5) {
  animation-delay: 0.6s;
}

/* Thinking — pulse dots */
.domos-audio-dots.thinking .domos-audio-dot {
  background: var(--accent);
  animation: domos-dot-pulse 1.2s ease-in-out infinite;
}

.domos-audio-dots.thinking .domos-audio-dot:nth-child(2) { animation-delay: 0.2s; }
.domos-audio-dots.thinking .domos-audio-dot:nth-child(3) { animation-delay: 0.4s; }
.domos-audio-dots.thinking .domos-audio-dot:nth-child(4) { animation-delay: 0.2s; }
.domos-audio-dots.thinking .domos-audio-dot:nth-child(5) { animation-delay: 0s; }

/* Speaking — bars style animation */
.domos-audio-dots.speaking .domos-audio-dot {
  background: var(--accent);
  border-radius: 3px;
  width: 5px;
  animation: domos-dot-bar 0.6s ease-in-out infinite;
}

.domos-audio-dots.speaking .domos-audio-dot:nth-child(1) { animation-delay: 0s; }
.domos-audio-dots.speaking .domos-audio-dot:nth-child(2) { animation-delay: 0.1s; }
.domos-audio-dots.speaking .domos-audio-dot:nth-child(3) { animation-delay: 0.2s; }
.domos-audio-dots.speaking .domos-audio-dot:nth-child(4) { animation-delay: 0.1s; }
.domos-audio-dots.speaking .domos-audio-dot:nth-child(5) { animation-delay: 0s; }

/* Error — red static */
.domos-audio-dots.error .domos-audio-dot {
  background: var(--danger);
  opacity: 0.6;
}

/* --- Footer (raccrocher + switch) --- */
.domos-panel-footer {
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Bouton Raccrocher */
.domos-btn-hangup {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  background: var(--danger);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
  outline: none;
  box-shadow: 0 2px 12px rgba(239, 68, 68, 0.3);
}

.domos-btn-hangup:hover {
  background: #dc2626;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
}

.domos-btn-hangup:active {
  transform: scale(0.97);
}

.domos-btn-hangup svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Bouton switch mode (petit lien discret) */
.domos-btn-switch {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  padding: 4px;
  text-align: center;
  transition: color 0.15s;
  outline: none;
}

.domos-btn-switch:hover {
  color: var(--text);
}

/* ============================================================
   TEXT MODE — Panel with messages
   ============================================================ */

.domos-panel.text-mode {
  width: 360px;
  height: 480px;
  max-height: calc(100vh - 48px);
}

/* Messages area */
.domos-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.domos-messages::-webkit-scrollbar {
  width: 3px;
}

.domos-messages::-webkit-scrollbar-track {
  background: transparent;
}

.domos-messages::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.domos-msg {
  max-width: 82%;
  padding: 9px 13px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.45;
  animation: domos-msg-in 0.2s ease;
  word-wrap: break-word;
}

.domos-msg.user {
  align-self: flex-end;
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.domos-msg.agent {
  align-self: flex-start;
  background: var(--surface);
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.domos-msg-time {
  font-size: 10px;
  margin-top: 3px;
  opacity: 0.5;
}

.domos-msg.user .domos-msg-time {
  text-align: right;
}

/* Typing indicator */
.domos-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 9px 13px;
  align-self: flex-start;
  background: var(--surface);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
}

.domos-typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: domos-dot-bounce 1.2s infinite;
}

.domos-typing-dot:nth-child(2) { animation-delay: 0.2s; }
.domos-typing-dot:nth-child(3) { animation-delay: 0.4s; }

/* Text input bar */
.domos-text-bar {
  padding: 12px 18px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.domos-text-input {
  flex: 1;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.domos-text-input::placeholder {
  color: var(--text-muted);
}

.domos-text-input:focus {
  border-color: var(--accent);
}

.domos-btn-send {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
  outline: none;
  flex-shrink: 0;
}

.domos-btn-send:hover {
  background: #ea580c;
}

.domos-btn-send:active {
  transform: scale(0.92);
}

.domos-btn-send:disabled {
  background: var(--border);
  cursor: not-allowed;
}

.domos-btn-send svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Empty state */
.domos-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px;
  text-align: center;
}

/* ============================================================
   KEYFRAMES
   ============================================================ */

@keyframes domos-slide-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes domos-badge-in {
  from {
    opacity: 0;
    transform: scale(0.5) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes domos-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes domos-panel-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
}

@keyframes domos-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes domos-dot-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

@keyframes domos-dot-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes domos-dot-bar {
  0%, 100% { transform: scaleY(1); height: 8px; }
  50% { transform: scaleY(2.5); height: 20px; }
}

@keyframes domos-msg-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================================
   RESPONSIVE — Mobile
   ============================================================ */

@media (max-width: 480px) {
  .domos-fab {
    right: 16px;
    bottom: 16px;
    left: auto;
    max-width: calc(100vw - 32px);
  }

  .domos-fab.bottom-left {
    right: auto;
    left: 16px;
  }

  .domos-panel {
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
  }

  .domos-panel.bottom-left {
    right: 12px;
    left: 12px;
  }

  .domos-panel.text-mode {
    width: auto;
    height: 60vh;
    max-height: calc(100vh - 24px);
  }
}
${presetStyles}
`;
}

/** CSS par défaut (thème par défaut) */
export const WIDGET_STYLES = generateWidgetStyles();
