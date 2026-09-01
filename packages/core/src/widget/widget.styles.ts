import type { WidgetStylePreset, WidgetTheme } from './widget.types.js';
import { DEFAULT_THEME } from './widget.constants.js';

/**
 * Générer le CSS complet du widget avec les couleurs du thème.
 * CSS pur injecté dans le Shadow DOM — pas de dépendance Tailwind runtime.
 * Style "appel téléphonique" compact.
 */
export function generateWidgetStyles(
  theme?: Partial<WidgetTheme>,
  stylePreset: WidgetStylePreset = 'call',
  contextSelector: string = ':host'
): string {
  const t = { ...DEFAULT_THEME, ...theme };
  const presetStyles = stylePreset === 'chat'
    ? `
/* ============================================================
   PRESET: CHAT
   ============================================================ */
.owllayer-fab.owllayer-preset-chat {
  border-radius: 999px;
  padding: 10px 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 86%, #fff 14%), var(--bg));
}
.owllayer-fab.owllayer-preset-chat .owllayer-fab-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
}
.owllayer-panel.owllayer-preset-chat {
  width: 360px;
  border-radius: 20px;
  box-shadow: 0 12px 50px rgba(0, 0, 0, 0.5);
}
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header {
  background: color-mix(in srgb, var(--surface) 76%, #fff 24%);
}
`
    : stylePreset === 'travel'
      ? `
/* ============================================================
   PRESET: TRAVEL — Compact floating card (bottom-left)
   ============================================================ */

/* FAB */
.owllayer-fab.owllayer-preset-travel {
  bottom: 22px;
  left: 22px;
  right: auto;
  border-radius: 14px;
  padding: 10px 13px;
  max-width: 240px;
  background:
    linear-gradient(155deg, color-mix(in srgb, var(--bg) 78%, #0f172a 22%), var(--bg));
  border-color: color-mix(in srgb, var(--border) 72%, #0ea5e9 28%);
}
.owllayer-fab.owllayer-preset-travel .owllayer-fab-title {
  font-size: 13px;
  letter-spacing: 0.01em;
}
.owllayer-fab.owllayer-preset-travel .owllayer-fab-subtitle {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 10px;
}
.owllayer-fab.owllayer-preset-travel .owllayer-fab-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(165deg, #0ea5e9, #2563eb);
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.38);
}
.owllayer-fab.owllayer-preset-travel .owllayer-fab-badge {
  background: color-mix(in srgb, var(--accent) 58%, #38bdf8 42%);
}

/* PANEL: compact floating card — NOT full height */
.owllayer-panel.owllayer-preset-travel {
  bottom: 22px;
  left: 22px;
  right: auto;
  top: auto;
  width: 276px;
  height: auto;
  max-height: calc(100vh - 44px);
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--border) 55%, #0ea5e9 45%);
  background:
    radial-gradient(ellipse 110% 60% at 0% 100%, rgba(14, 165, 233, 0.10) 0%, transparent 65%),
    linear-gradient(175deg, color-mix(in srgb, var(--bg) 88%, #020617 12%), var(--bg));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 20px 56px rgba(2, 132, 199, 0.28),
    0 4px 16px rgba(0, 0, 0, 0.4);
  animation: owllayer-travel-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.owllayer-panel.owllayer-preset-travel.is-closing {
  animation: owllayer-travel-out 0.2s ease forwards;
}

.owllayer-panel.owllayer-preset-travel .owllayer-panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, #0ea5e9 30%);
}

.owllayer-panel.owllayer-preset-travel .owllayer-live-badge {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  color: #ecfeff;
  font-size: 9px;
}

.owllayer-panel.owllayer-preset-travel .owllayer-panel-body.owllayer-travel-body {
  padding: 14px 13px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 72%, #0ea5e9 28%);
  min-height: 138px;
  justify-content: flex-start;
}

/* Visualizer zone */
.owllayer-travel-viz {
  position: relative;
  height: 84px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.owllayer-travel-orb {
  position: absolute;
  width: 180px;
  height: 66px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(14, 165, 233, 0.17) 0%, rgba(2, 132, 199, 0.03) 50%, transparent 72%);
  transition: transform 0.35s ease, opacity 0.35s ease;
}

.owllayer-travel-wave {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 60px;
  width: 100%;
}

.owllayer-travel-bar {
  width: 3px;
  border-radius: 2px;
  min-height: 3px;
  background: linear-gradient(180deg, #60a5fa, #a78bfa);
  box-shadow: 0 0 3px rgba(96, 165, 250, 0.4);
  transition: height 80ms linear, opacity 0.25s ease, background 0.25s ease;
}

/* Muted state: amber bars at minimum height */
.owllayer-travel-wave.muted .owllayer-travel-bar {
  height: 3px !important;
  opacity: 0.35;
  background: linear-gradient(180deg, #f59e0b, #fb923c);
  box-shadow: 0 0 3px rgba(245, 158, 11, 0.3);
  animation: none !important;
}

.owllayer-travel-wave.idle .owllayer-travel-bar,
.owllayer-travel-wave.error .owllayer-travel-bar {
  animation: owllayer-travel-idle 2.8s ease-in-out infinite;
  animation-delay: calc(var(--idx) * 0.06s);
}

.owllayer-travel-wave.thinking .owllayer-travel-bar {
  animation: owllayer-travel-think 1.4s ease-in-out infinite;
  animation-delay: calc(var(--dist) * -0.042s);
}

.owllayer-travel-wave.speaking .owllayer-travel-bar {
  animation: owllayer-travel-speak 0.44s ease-in-out infinite alternate;
  animation-delay: calc(var(--idx) * 0.016s);
}

.owllayer-travel-viz.state-listening .owllayer-travel-orb {
  animation: owllayer-travel-orb 0.48s ease-in-out infinite alternate;
}
.owllayer-travel-viz.state-speaking .owllayer-travel-orb {
  animation: owllayer-travel-orb 0.3s ease-in-out infinite alternate;
}
.owllayer-travel-viz.state-thinking .owllayer-travel-orb {
  animation: owllayer-travel-orb 1.2s ease-in-out infinite alternate;
}

.owllayer-travel-status-label {
  margin-top: 7px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-size: 10px;
  color: color-mix(in srgb, var(--text-muted) 80%, #c4b5fd 20%);
}

/* Text mode messages */
.owllayer-panel.owllayer-preset-travel .owllayer-travel-messages-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.owllayer-panel.owllayer-preset-travel .owllayer-travel-messages-wrap .owllayer-messages {
  max-height: calc(100vh - 260px);
  min-height: 80px;
  padding-top: 12px;
}

.owllayer-panel.owllayer-preset-travel .owllayer-text-bar {
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, #0ea5e9 30%);
}

/* Footer: row layout for audio mode */
.owllayer-panel.owllayer-preset-travel .owllayer-panel-footer {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 10px 13px 14px;
  border-top: 1px solid color-mix(in srgb, var(--border) 70%, #0ea5e9 30%);
}

.owllayer-panel.owllayer-preset-travel .owllayer-btn-hangup {
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
}

.owllayer-panel.owllayer-preset-travel .owllayer-widget-signature {
  color: color-mix(in srgb, var(--text-muted) 72%, #38bdf8 28%);
  padding-bottom: 12px;
}

/* ---- Mute button ---- */
.owllayer-btn-mute {
  width: 42px;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  outline: none;
}
.owllayer-btn-mute:hover {
  background: var(--surface);
  border-color: color-mix(in srgb, var(--border) 60%, var(--text-muted) 40%);
  color: var(--text);
}
.owllayer-btn-mute.muted {
  background: color-mix(in srgb, #f59e0b 14%, transparent 86%);
  border-color: #f59e0b;
  color: #f59e0b;
}
.owllayer-btn-mute svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ---- Keyframes ---- */
@keyframes owllayer-travel-in {
  from { transform: translateY(14px) scale(0.97); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes owllayer-travel-out {
  from { transform: translateY(0) scale(1); opacity: 1; }
  to   { transform: translateY(14px) scale(0.97); opacity: 0; }
}
@keyframes owllayer-travel-idle {
  0%, 100% { opacity: 0.28; height: 4px; }
  50%       { opacity: 0.62; height: 13px; }
}
@keyframes owllayer-travel-think {
  0%, 100% { opacity: 0.42; height: 6px; }
  50%       { opacity: 1;    height: 36px; }
}
@keyframes owllayer-travel-speak {
  from { opacity: 0.52; height: 8px; }
  to   { opacity: 1;    height: 46px; }
}
@keyframes owllayer-travel-orb {
  from { transform: scale(0.88); opacity: 0.6; }
  to   { transform: scale(1.14); opacity: 1; }
}

@media (max-width: 480px) {
  .owllayer-panel.owllayer-preset-travel {
    width: calc(100vw - 32px);
    left: 16px;
    bottom: 16px;
  }
}
`
      : '';

  const rawCss = `
/* ============================================================
   OwlLayer Widget — Call-style compact UI
   ============================================================ */

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

${contextSelector} {
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

.owllayer-fab {
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
  animation: owllayer-slide-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
  text-decoration: none;
  outline: none;
  max-width: 300px;
}

.owllayer-fab.bottom-left {
  right: auto;
  left: 24px;
}

.owllayer-fab:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset;
}

.owllayer-fab:active {
  transform: translateY(0) scale(0.98);
}

/* Badge "1 appel manqué" */
.owllayer-fab-badge {
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
  animation: owllayer-badge-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
}

/* Contenu texte du bouton */
.owllayer-fab-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.owllayer-fab-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owllayer-fab-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}

.owllayer-fab-signature {
  margin-top: 2px;
  font-size: 10px;
  color: color-mix(in srgb, var(--text-muted) 84%, #ffffff 16%);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Icône téléphone (cercle orange) */
.owllayer-fab-icon {
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

.owllayer-fab:hover .owllayer-fab-icon {
  box-shadow: 0 4px 20px rgba(249, 115, 22, 0.5);
}

.owllayer-fab-icon svg {
  width: 20px;
  height: 20px;
  fill: #fff;
  stroke: none;
}

/* ============================================================
   CALL PANEL — Compact card
   ============================================================ */

.owllayer-panel {
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
  animation: owllayer-panel-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.owllayer-panel.bottom-left {
  right: auto;
  left: 24px;
}

.owllayer-panel.is-closing {
  animation: owllayer-panel-out 0.25s ease forwards;
}

/* --- Header --- */
.owllayer-panel-header {
  display: flex;
  align-items: center;
  padding: 16px 18px;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.owllayer-avatar {
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

.owllayer-avatar svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.owllayer-agent-info {
  flex: 1;
  min-width: 0;
}

.owllayer-agent-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owllayer-agent-status {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.owllayer-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--live);
  animation: owllayer-pulse 1.5s infinite;
}

.owllayer-status-dot.error {
  background: var(--danger);
  animation: none;
}

.owllayer-status-dot.offline {
  background: var(--text-muted);
  animation: none;
}

/* Badge LIVE */
.owllayer-live-badge {
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
.owllayer-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.owllayer-btn-header {
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

.owllayer-btn-header:hover {
  background: var(--surface);
  color: var(--text);
  border-color: var(--text-muted);
}

.owllayer-btn-header.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.owllayer-btn-header svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Tooltip on header buttons */
.owllayer-btn-header .owllayer-tooltip {
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

.owllayer-btn-header:hover .owllayer-tooltip {
  opacity: 1;
}

/* --- Body (audio zone) --- */
.owllayer-panel-body {
  padding: 28px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 80px;
}

/* Audio dots animation */
.owllayer-audio-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 24px;
}

.owllayer-audio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  transition: background 0.3s, transform 0.3s;
}

/* Idle — petits dots statiques */
.owllayer-audio-dots.idle .owllayer-audio-dot {
  opacity: 0.4;
}

/* Listening — indigo dots bouncing */
.owllayer-audio-dots.listening .owllayer-audio-dot {
  background: var(--accent);
  animation: owllayer-dot-bounce 1s ease-in-out infinite;
}

.owllayer-audio-dots.listening .owllayer-audio-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.owllayer-audio-dots.listening .owllayer-audio-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.owllayer-audio-dots.listening .owllayer-audio-dot:nth-child(4) {
  animation-delay: 0.45s;
}

.owllayer-audio-dots.listening .owllayer-audio-dot:nth-child(5) {
  animation-delay: 0.6s;
}

/* Thinking — pulse dots */
.owllayer-audio-dots.thinking .owllayer-audio-dot {
  background: var(--accent);
  animation: owllayer-dot-pulse 1.2s ease-in-out infinite;
}

.owllayer-audio-dots.thinking .owllayer-audio-dot:nth-child(2) { animation-delay: 0.2s; }
.owllayer-audio-dots.thinking .owllayer-audio-dot:nth-child(3) { animation-delay: 0.4s; }
.owllayer-audio-dots.thinking .owllayer-audio-dot:nth-child(4) { animation-delay: 0.2s; }
.owllayer-audio-dots.thinking .owllayer-audio-dot:nth-child(5) { animation-delay: 0s; }

/* Speaking — bars style animation */
.owllayer-audio-dots.speaking .owllayer-audio-dot {
  background: var(--accent);
  border-radius: 3px;
  width: 5px;
  animation: owllayer-dot-bar 0.6s ease-in-out infinite;
}

.owllayer-audio-dots.speaking .owllayer-audio-dot:nth-child(1) { animation-delay: 0s; }
.owllayer-audio-dots.speaking .owllayer-audio-dot:nth-child(2) { animation-delay: 0.1s; }
.owllayer-audio-dots.speaking .owllayer-audio-dot:nth-child(3) { animation-delay: 0.2s; }
.owllayer-audio-dots.speaking .owllayer-audio-dot:nth-child(4) { animation-delay: 0.1s; }
.owllayer-audio-dots.speaking .owllayer-audio-dot:nth-child(5) { animation-delay: 0s; }

/* Error — red static */
.owllayer-audio-dots.error .owllayer-audio-dot {
  background: var(--danger);
  opacity: 0.6;
}

/* --- Footer (raccrocher + switch) --- */
.owllayer-panel-footer {
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.owllayer-widget-signature {
  padding: 0 18px 12px;
  font-size: 10px;
  color: color-mix(in srgb, var(--text-muted) 84%, #ffffff 16%);
  text-align: center;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  user-select: none;
}

/* Bouton Raccrocher */
.owllayer-btn-hangup {
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

.owllayer-btn-hangup:hover {
  background: #dc2626;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
}

.owllayer-btn-hangup:active {
  transform: scale(0.97);
}

.owllayer-btn-hangup svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Bouton switch mode (petit lien discret) */
.owllayer-btn-switch {
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

.owllayer-btn-switch:hover {
  color: var(--text);
}

/* ============================================================
   TEXT MODE — Panel with messages
   ============================================================ */

.owllayer-panel.text-mode {
  width: 360px;
  height: 480px;
  max-height: calc(100vh - 48px);
}

/* Messages area */
.owllayer-messages {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.owllayer-messages::-webkit-scrollbar {
  width: 3px;
}

.owllayer-messages::-webkit-scrollbar-track {
  background: transparent;
}

.owllayer-messages::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 2px;
}

.owllayer-msg {
  max-width: 82%;
  padding: 9px 13px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.45;
  animation: owllayer-msg-in 0.2s ease;
  word-wrap: break-word;
}

.owllayer-msg.user {
  align-self: flex-end;
  background: var(--accent);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.owllayer-msg.agent {
  align-self: flex-start;
  background: var(--surface);
  color: var(--text);
  border-bottom-left-radius: 4px;
}

.owllayer-msg-time {
  font-size: 10px;
  margin-top: 3px;
  opacity: 0.5;
}

.owllayer-msg.user .owllayer-msg-time {
  text-align: right;
}

/* Markdown formatting in messages */
.owllayer-msg strong {
  font-weight: 700;
  color: inherit;
}
.owllayer-msg em {
  font-style: italic;
}
.owllayer-msg del {
  text-decoration: line-through;
  opacity: 0.75;
}
.owllayer-inline-code {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
  font-size: 12px;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.08);
}
.owllayer-msg.user .owllayer-inline-code {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.owllayer-code-block {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  margin: 6px 0;
  overflow-x: auto;
}
.owllayer-link {
  color: var(--accent);
  text-decoration: underline;
  font-weight: 500;
}
.owllayer-msg.user .owllayer-link {
  color: #fff;
}
.owllayer-list-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 2px 0;
}
.owllayer-bullet {
  color: var(--accent);
  font-weight: 700;
  flex-shrink: 0;
}
.owllayer-msg.user .owllayer-bullet {
  color: #fff;
}
.owllayer-num {
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
  font-size: 12px;
}
.owllayer-msg.user .owllayer-num {
  color: rgba(255, 255, 255, 0.8);
}

/* Typing indicator */
.owllayer-typing {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  align-self: flex-start;
  background: var(--surface);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
}
.owllayer-typing-label {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  font-weight: 500;
}
.owllayer-typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.owllayer-typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.6;
  animation: owllayer-dot-bounce 1.4s infinite ease-in-out both;
}
.owllayer-typing-dot:nth-child(1) { animation-delay: -0.32s; }
.owllayer-typing-dot:nth-child(2) { animation-delay: -0.16s; }
.owllayer-typing-dot:nth-child(3) { animation-delay: 0s; }

@keyframes owllayer-dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
  40% { transform: scale(1.2); opacity: 1; }
}

/* Text input bar */
.owllayer-text-bar {
  padding: 12px 18px 14px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.owllayer-text-input {
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

.owllayer-text-input::placeholder {
  color: var(--text-muted);
}

.owllayer-text-input:focus {
  border-color: var(--accent);
}

.owllayer-btn-send {
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

.owllayer-btn-send:hover {
  background: #ea580c;
}

.owllayer-btn-send:active {
  transform: scale(0.92);
}

.owllayer-btn-send:disabled {
  background: var(--border);
  cursor: not-allowed;
}

.owllayer-btn-send svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Empty state */
.owllayer-empty {
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

@keyframes owllayer-slide-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes owllayer-badge-in {
  from {
    opacity: 0;
    transform: scale(0.5) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes owllayer-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes owllayer-panel-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
}

@keyframes owllayer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes owllayer-dot-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

@keyframes owllayer-dot-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}

@keyframes owllayer-dot-bar {
  0%, 100% { transform: scaleY(1); height: 8px; }
  50% { transform: scaleY(2.5); height: 20px; }
}

@keyframes owllayer-msg-in {
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
  .owllayer-fab {
    right: 16px;
    bottom: 16px;
    left: auto;
    max-width: calc(100vw - 32px);
  }

  .owllayer-fab.bottom-left {
    right: auto;
    left: 16px;
  }

  .owllayer-panel {
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
  }

  .owllayer-panel.bottom-left {
    right: 12px;
    left: 12px;
  }

  .owllayer-panel.text-mode {
    width: auto;
    height: 60vh;
    max-height: calc(100vh - 24px);
  }
}

/* ============================================================
   LINE STATE — waiting / busy overlays
   ============================================================ */
.owllayer-line-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 18px;
  text-align: center;
  flex: 1;
  min-height: 100px;
}

.owllayer-line-overlay--busy {
  background: color-mix(in srgb, var(--danger) 10%, transparent);
}

.owllayer-line-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: owllayer-spin 0.9s linear infinite;
}

@keyframes owllayer-spin {
  to { transform: rotate(360deg); }
}

.owllayer-line-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.owllayer-line-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin: 0;
}

${presetStyles}
`;
  return rawCss;
}

/** CSS par défaut (thème par défaut) */
export const WIDGET_STYLES = generateWidgetStyles();
