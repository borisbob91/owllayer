import type { WidgetStylePreset, WidgetTheme } from './widget.types.js';
import { DEFAULT_THEME, PRESET_THEMES } from './widget.constants.js';

/*
 * Contrat de balisage partage par les SDK (React, Vue, Svelte) :
 *
 * .owllayer-fab[.bottom-left].owllayer-preset-{call|chat|travel}
 *   .owllayer-fab-badge · .owllayer-fab-content (.owllayer-fab-title, .owllayer-fab-subtitle, .owllayer-fab-signature) · .owllayer-fab-icon
 * .owllayer-panel[.bottom-left].owllayer-preset-*.{text-mode|voice-mode}[.is-closing]
 *   .owllayer-panel-header : .owllayer-avatar.state-* · .owllayer-agent-info · .owllayer-live-badge · .owllayer-header-actions (.owllayer-btn-header, .owllayer-btn-close)
 *   .owllayer-line-overlay[.owllayer-line-overlay--busy]
 *   texte : .owllayer-messages (.owllayer-empty, .owllayer-msg.user|.agent, .owllayer-thinking-msg) · .owllayer-text-bar · .owllayer-text-footer (.owllayer-btn-chip)
 *   voix  : .owllayer-voice-stage (.owllayer-viz.state-* [--level], .owllayer-voice-status, .owllayer-transcript) · .owllayer-voice-controls (.owllayer-btn-round)
 *   .owllayer-widget-signature
 */

/**
 * Generates the widget CSS for a theme and a preset.
 * Pure CSS injected in the Shadow DOM (React) or scoped under `contextSelector` (Vue, Svelte).
 * Theme resolution: DEFAULT_THEME, then the preset palette, then the given theme.
 */
export function generateWidgetStyles(
  theme?: Partial<WidgetTheme>,
  stylePreset: WidgetStylePreset = 'call',
  contextSelector: string = ':host'
): string {
  const t = { ...DEFAULT_THEME, ...PRESET_THEMES[stylePreset], ...theme };

  return `
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
  --accent-soft: color-mix(in srgb, var(--accent) 16%, transparent);
  --accent-strong: color-mix(in srgb, var(--accent) 82%, #000000);
  --on-accent: #ffffff;
  --shadow-lg: 0 24px 64px -12px rgba(2, 6, 23, 0.45), 0 0 0 1px color-mix(in srgb, var(--border) 70%, transparent);
  --shadow-md: 0 10px 30px -8px rgba(2, 6, 23, 0.4);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --edge: 24px;

  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

button { font-family: inherit; }
button:focus-visible, input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

svg.owllayer-icon, .owllayer-fab-icon svg, .owllayer-btn-header svg, .owllayer-btn-close svg,
.owllayer-btn-round svg, .owllayer-btn-send svg, .owllayer-btn-chip svg, .owllayer-avatar svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ============================================================
   LAUNCHER (bouton flottant)
   ============================================================ */

.owllayer-fab {
  position: fixed;
  bottom: var(--edge);
  right: var(--edge);
  z-index: 999999;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(290px, calc(100vw - 2 * var(--edge)));
  padding: 8px 8px 8px 16px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  user-select: none;
  animation: owllayer-launcher-in 0.5s var(--ease-spring) both;
  transition: transform 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out);
}

.owllayer-fab.bottom-left { right: auto; left: var(--edge); padding: 8px 16px 8px 8px; flex-direction: row-reverse; }
.owllayer-fab:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg), 0 0 0 6px var(--accent-soft); }
.owllayer-fab:active { transform: translateY(0) scale(0.97); }

.owllayer-fab-badge {
  position: absolute;
  top: -10px;
  left: 18px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 12px var(--accent-soft);
  animation: owllayer-pop 0.4s var(--ease-spring) 0.3s both;
}
.owllayer-fab-badge:empty { display: none; }

.owllayer-fab-content { display: flex; flex-direction: column; min-width: 0; flex: 1; text-align: left; }
.owllayer-fab-title { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.owllayer-fab-subtitle { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.owllayer-fab-signature { display: none; }

.owllayer-fab-icon {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: var(--on-accent);
}
.owllayer-fab-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--accent);
  animation: owllayer-ping 2.6s var(--ease-out) 1.2s infinite;
}
.owllayer-fab-icon svg { width: 18px; height: 18px; }
.owllayer-preset-call .owllayer-fab-icon svg { fill: currentColor; stroke: none; }

/* ============================================================
   PANEL
   ============================================================ */

.owllayer-panel {
  position: fixed;
  bottom: var(--edge);
  right: var(--edge);
  z-index: 999999;
  width: 320px;
  max-height: calc(100vh - 2 * var(--edge));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--shadow-lg);
  transform-origin: bottom right;
  animation: owllayer-panel-in 0.32s var(--ease-out) both;
}
.owllayer-panel.bottom-left { right: auto; left: var(--edge); transform-origin: bottom left; }
.owllayer-panel.is-closing { animation: owllayer-panel-out 0.22s ease-in forwards; }

/* Mode texte : panneau de conversation ; mode vocal : carte compacte a hauteur du contenu */
.owllayer-panel.text-mode { width: 360px; height: min(480px, calc(100vh - 2 * var(--edge))); }

/* --- En-tete --- */
.owllayer-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px 12px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.owllayer-avatar {
  position: relative;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
}
.owllayer-avatar svg { width: 18px; height: 18px; }
.owllayer-avatar::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}
.owllayer-avatar.state-listening::after { border-color: var(--live); animation: owllayer-breathe 1.4s ease-in-out infinite; }
.owllayer-avatar.state-speaking::after { border-color: var(--accent); animation: owllayer-breathe 0.9s ease-in-out infinite; }
.owllayer-avatar.state-thinking::after {
  border-color: var(--accent) transparent var(--accent) transparent;
  animation: owllayer-spin 1s linear infinite;
}
.owllayer-avatar.state-error::after { border-color: var(--danger); }

.owllayer-agent-info { flex: 1; min-width: 0; }
.owllayer-agent-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.owllayer-agent-status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }

.owllayer-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--live); flex-shrink: 0; }
.owllayer-status-dot.state-listening, .owllayer-status-dot.state-speaking { animation: owllayer-blink 1.2s ease-in-out infinite; }
.owllayer-status-dot.state-thinking { background: var(--accent); animation: owllayer-blink 0.8s ease-in-out infinite; }
.owllayer-status-dot.error { background: var(--danger); }
.owllayer-status-dot.offline { background: var(--text-muted); }

.owllayer-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--live) 14%, transparent);
  color: var(--live);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.owllayer-live-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: owllayer-blink 1.6s ease-in-out infinite; }

.owllayer-header-actions { display: flex; align-items: center; gap: 4px; }

.owllayer-btn-header, .owllayer-btn-close {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.owllayer-btn-header:hover, .owllayer-btn-close:hover { background: var(--surface); color: var(--text); }
.owllayer-btn-header svg, .owllayer-btn-close svg { width: 17px; height: 17px; }

.owllayer-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--text);
  color: var(--bg);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity 0.15s, transform 0.15s;
  z-index: 2;
}
.owllayer-btn-header:hover .owllayer-tooltip, .owllayer-btn-header:focus-visible .owllayer-tooltip { opacity: 1; transform: translateY(0); }

/* ============================================================
   MODE TEXTE
   ============================================================ */

.owllayer-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}
.owllayer-messages::-webkit-scrollbar { width: 4px; }
.owllayer-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.owllayer-empty {
  margin: auto;
  max-width: 260px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: owllayer-fade-up 0.4s var(--ease-out) both;
}
.owllayer-empty-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: var(--accent-soft);
  color: var(--accent);
  margin-bottom: 4px;
}
.owllayer-empty-icon svg { width: 24px; height: 24px; }
.owllayer-empty-title { font-size: 16px; font-weight: 700; }
.owllayer-empty-text { font-size: 13px; color: var(--text-muted); }

.owllayer-msg {
  max-width: 84%;
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.5;
  word-wrap: break-word;
  animation: owllayer-msg-in 0.28s var(--ease-out) both;
}
.owllayer-msg.user { align-self: flex-end; background: var(--accent); color: var(--on-accent); border-bottom-right-radius: 5px; }
.owllayer-msg.agent { align-self: flex-start; background: var(--surface); color: var(--text); border-bottom-left-radius: 5px; }
.owllayer-msg-time { margin-top: 4px; font-size: 10px; opacity: 0.55; text-align: right; }

.owllayer-msg strong { font-weight: 700; }
.owllayer-msg em { font-style: italic; }
.owllayer-msg del { text-decoration: line-through; opacity: 0.75; }
.owllayer-inline-code { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 12px; padding: 1px 5px; border-radius: 5px; background: color-mix(in srgb, var(--text) 10%, transparent); }
.owllayer-msg.user .owllayer-inline-code { background: rgba(255, 255, 255, 0.2); }
.owllayer-code-block { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 12px; padding: 8px 12px; border-radius: 10px; background: #0b1020; color: #e2e8f0; margin: 6px 0; overflow-x: auto; }
.owllayer-link { color: var(--accent); text-decoration: underline; font-weight: 500; }
.owllayer-msg.user .owllayer-link, .owllayer-msg.user .owllayer-bullet { color: var(--on-accent); }
.owllayer-list-item { display: flex; align-items: baseline; gap: 6px; margin: 2px 0; }
.owllayer-bullet { color: var(--accent); font-weight: 700; flex-shrink: 0; }
.owllayer-num { color: var(--text-muted); font-weight: 600; font-size: 12px; flex-shrink: 0; }
.owllayer-msg.user .owllayer-num { color: rgba(255, 255, 255, 0.8); }

.owllayer-thinking-msg { padding: 11px 14px; }
.owllayer-typing { display: flex; align-items: center; gap: 8px; }
.owllayer-typing-label { font-size: 12px; color: var(--text-muted); }
.owllayer-typing-dots { display: flex; gap: 4px; }
.owllayer-typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: owllayer-typing 1.2s ease-in-out infinite; }
.owllayer-typing-dot:nth-child(2) { animation-delay: 0.15s; }
.owllayer-typing-dot:nth-child(3) { animation-delay: 0.3s; }

.owllayer-text-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px;
  padding: 6px 6px 6px 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  flex-shrink: 0;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.owllayer-text-bar:focus-within { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.owllayer-text-input { flex: 1; min-width: 0; border: none; background: transparent; color: var(--text); font: inherit; font-size: 14px; padding: 6px 0; outline: none; }
.owllayer-text-input:focus-visible { outline: none; }
.owllayer-text-input::placeholder { color: var(--text-muted); }

.owllayer-btn-send {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: var(--on-accent);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), opacity 0.15s, background 0.15s;
}
.owllayer-btn-send:hover { background: var(--accent-strong); }
.owllayer-btn-send:active { transform: scale(0.92); }
.owllayer-btn-send:disabled { opacity: 0.35; cursor: default; transform: none; }
.owllayer-btn-send svg { width: 16px; height: 16px; }

.owllayer-text-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px 12px;
  flex-shrink: 0;
}
.owllayer-btn-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.owllayer-btn-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.owllayer-btn-chip svg { width: 15px; height: 15px; }

.owllayer-widget-signature {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  opacity: 0.7;
  user-select: none;
  white-space: nowrap;
}
.owllayer-panel > .owllayer-widget-signature { text-align: center; padding: 0 0 10px; }

/* ============================================================
   MODE VOCAL
   ============================================================ */

.owllayer-voice-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 16px 4px;
  gap: 10px;
}

/* Visualiseur : orbe, anneaux et barres ; --level (0..1) = niveau du micro */
.owllayer-viz {
  --level: 0;
  position: relative;
  width: 112px;
  height: 112px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.owllayer-viz-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid var(--accent);
  opacity: 0;
}
.owllayer-viz-orb {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, color-mix(in srgb, #ffffff 55%, var(--accent)) 0%, transparent 42%),
    radial-gradient(circle at 50% 50%, var(--accent) 0%, var(--accent-strong) 100%);
  box-shadow: 0 0 0 0 var(--accent-soft), 0 12px 28px -10px var(--accent);
  transition: transform 0.12s linear, box-shadow 0.3s, filter 0.3s;
}
.owllayer-viz-bars {
  position: absolute;
  bottom: -8px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 18px;
}
.owllayer-viz-bar {
  width: 2.5px;
  height: 3px;
  border-radius: 3px;
  background: var(--accent);
  opacity: 0.85;
  transition: height 0.12s linear;
}

/* Au repos : respiration lente */
.owllayer-viz.state-idle .owllayer-viz-orb { animation: owllayer-breathe 3.2s ease-in-out infinite; }
.owllayer-viz.state-idle .owllayer-viz-bar { opacity: 0.35; }

/* L'utilisateur parle : l'orbe et les barres suivent le micro, les anneaux se propagent */
.owllayer-viz.state-listening .owllayer-viz-orb {
  transform: scale(calc(0.92 + var(--level) * 0.35));
  box-shadow: 0 0 0 calc(var(--level) * 12px) var(--accent-soft), 0 12px 28px -10px var(--accent);
}
.owllayer-viz.state-listening .owllayer-viz-ring { border-color: var(--live); animation: owllayer-ripple 2.4s var(--ease-out) infinite; }
.owllayer-viz.state-listening .owllayer-viz-ring:nth-child(2) { animation-delay: 0.8s; }
.owllayer-viz.state-listening .owllayer-viz-ring:nth-child(3) { animation-delay: 1.6s; }
.owllayer-viz.state-listening .owllayer-viz-bar { background: var(--live); height: calc(3px + var(--level) * 15px * var(--w, 1)); }

/* Reflexion : orbe en retrait, anneau qui tourne */
.owllayer-viz.state-thinking .owllayer-viz-orb { transform: scale(0.82); filter: saturate(0.8); animation: owllayer-breathe 1.2s ease-in-out infinite; }
.owllayer-viz.state-thinking .owllayer-viz-ring:first-child {
  opacity: 1;
  inset: 18px;
  border-width: 2.5px;
  border-color: var(--accent) transparent transparent transparent;
  animation: owllayer-spin 0.9s linear infinite;
}
.owllayer-viz.state-thinking .owllayer-viz-bar { animation: owllayer-shimmer 1.2s ease-in-out infinite; animation-delay: calc(var(--i, 0) * 60ms); }

/* L'agent parle : orbe lumineux, ondes vers l'exterieur, barres qui dansent */
.owllayer-viz.state-speaking .owllayer-viz-orb { animation: owllayer-talk 0.5s ease-in-out infinite alternate; box-shadow: 0 0 0 7px var(--accent-soft), 0 12px 32px -8px var(--accent); }
.owllayer-viz.state-speaking .owllayer-viz-ring { animation: owllayer-ripple 1.6s var(--ease-out) infinite; }
.owllayer-viz.state-speaking .owllayer-viz-ring:nth-child(2) { animation-delay: 0.53s; }
.owllayer-viz.state-speaking .owllayer-viz-ring:nth-child(3) { animation-delay: 1.06s; }
.owllayer-viz.state-speaking .owllayer-viz-bar { animation: owllayer-dance 0.7s ease-in-out infinite alternate; animation-delay: calc(var(--i, 0) * -90ms); }

.owllayer-viz.state-error .owllayer-viz-orb { background: radial-gradient(circle, var(--danger) 0%, color-mix(in srgb, var(--danger) 70%, #000) 100%); box-shadow: none; filter: grayscale(0.2); }
.owllayer-viz.state-error .owllayer-viz-bar { background: var(--danger); opacity: 0.4; }
.owllayer-viz.is-muted .owllayer-viz-orb { filter: grayscale(0.85); opacity: 0.6; }

.owllayer-voice-status { font-size: 14px; font-weight: 600; text-align: center; min-height: 20px; margin-top: 4px; }
.owllayer-voice-status.state-listening { color: var(--live); }

/* Transcription : la conversation reste visible en mode vocal */
.owllayer-transcript {
  width: 100%;
  max-height: 104px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 2px;
  mask-image: linear-gradient(to bottom, transparent 0, #000 28px);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 28px);
}
.owllayer-transcript:empty { display: none; }
.owllayer-transcript-line {
  font-size: 12.5px;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 11px;
  max-width: 92%;
  animation: owllayer-msg-in 0.28s var(--ease-out) both;
}
.owllayer-transcript-line.user { align-self: flex-end; color: var(--text-muted); background: transparent; border: 1px dashed var(--border); }
.owllayer-transcript-line.agent { align-self: flex-start; background: var(--surface); }

.owllayer-voice-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 10px 14px 12px;
  flex-shrink: 0;
}
.owllayer-btn-round {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.15s var(--ease-spring), background 0.15s, border-color 0.15s, color 0.15s;
}
.owllayer-btn-round:hover { transform: translateY(-2px); border-color: var(--accent); }
.owllayer-btn-round:active { transform: scale(0.94); }
.owllayer-btn-round svg { width: 18px; height: 18px; }
.owllayer-btn-round:disabled { opacity: 0.45; cursor: default; transform: none; }
.owllayer-btn-round.is-active { background: var(--text); color: var(--bg); border-color: var(--text); }
.owllayer-btn-round.danger { width: 52px; height: 52px; background: var(--danger); border-color: var(--danger); color: #ffffff; box-shadow: 0 10px 24px -8px var(--danger); }
.owllayer-btn-round.danger svg { width: 22px; height: 22px; }
.owllayer-btn-round.danger:hover { background: color-mix(in srgb, var(--danger) 86%, #000); }

/* ============================================================
   LIGNES VIRTUELLES (attente, indisponible)
   ============================================================ */

.owllayer-line-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 24px;
  text-align: center;
}
.owllayer-line-spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--accent); animation: owllayer-spin 0.9s linear infinite; }
.owllayer-line-title { font-size: 15px; font-weight: 700; }
.owllayer-line-sub { font-size: 13px; color: var(--text-muted); max-width: 260px; }
.owllayer-line-overlay .owllayer-btn-chip { margin-top: 8px; }

/* ============================================================
   PRESETS
   ============================================================ */

/* call : carte sombre facon appel telephonique (palette par defaut, gabarit de base) */

/* chat : lanceur rond, panneau clair de messagerie */
.owllayer-fab.owllayer-preset-chat { padding: 0; gap: 0; border-radius: 50%; border: none; background: transparent; box-shadow: none; }
.owllayer-fab.owllayer-preset-chat .owllayer-fab-content { display: none; }
.owllayer-fab.owllayer-preset-chat .owllayer-fab-icon { width: 56px; height: 56px; box-shadow: 0 14px 34px -10px var(--accent); }
.owllayer-fab.owllayer-preset-chat .owllayer-fab-icon svg { width: 24px; height: 24px; }
.owllayer-fab.owllayer-preset-chat .owllayer-fab-badge { left: auto; right: -6px; top: -8px; }
.owllayer-fab.owllayer-preset-chat:hover { box-shadow: none; }
.owllayer-fab.owllayer-preset-chat:hover .owllayer-fab-icon { box-shadow: 0 18px 40px -10px var(--accent), 0 0 0 6px var(--accent-soft); }
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: var(--on-accent);
  border-bottom: none;
}
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header .owllayer-agent-status,
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header .owllayer-btn-header,
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header .owllayer-btn-close { color: rgba(255, 255, 255, 0.82); }
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header .owllayer-btn-header:hover,
.owllayer-panel.owllayer-preset-chat .owllayer-panel-header .owllayer-btn-close:hover { background: rgba(255, 255, 255, 0.16); color: #ffffff; }
.owllayer-panel.owllayer-preset-chat .owllayer-avatar { background: rgba(255, 255, 255, 0.18); color: #ffffff; }
.owllayer-panel.owllayer-preset-chat .owllayer-live-badge { background: rgba(255, 255, 255, 0.18); color: #ffffff; }
.owllayer-panel.owllayer-preset-chat .owllayer-status-dot { background: #4ade80; }

/* travel : verre degrade, grand orbe */
.owllayer-fab.owllayer-preset-travel,
.owllayer-panel.owllayer-preset-travel {
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 60%),
    radial-gradient(90% 70% at 0% 100%, color-mix(in srgb, var(--live) 14%, transparent) 0%, transparent 60%),
    var(--bg);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--border));
  backdrop-filter: blur(14px);
}
.owllayer-panel.owllayer-preset-travel .owllayer-panel-header { border-bottom-color: transparent; }
.owllayer-panel.owllayer-preset-travel .owllayer-viz { width: 128px; height: 128px; }
.owllayer-panel.owllayer-preset-travel .owllayer-viz-orb { width: 70px; height: 70px; }
.owllayer-panel.owllayer-preset-travel .owllayer-msg.agent,
.owllayer-panel.owllayer-preset-travel .owllayer-transcript-line.agent,
.owllayer-panel.owllayer-preset-travel .owllayer-text-bar { background: color-mix(in srgb, var(--surface) 70%, transparent); }

/* ============================================================
   ANIMATIONS
   ============================================================ */

@keyframes owllayer-launcher-in { from { opacity: 0; transform: translateY(16px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes owllayer-panel-in { from { opacity: 0; transform: translateY(14px) scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes owllayer-panel-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(12px) scale(0.95); } }
@keyframes owllayer-pop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
@keyframes owllayer-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes owllayer-msg-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes owllayer-ping { 0% { transform: scale(1); opacity: 0.6; } 70%, 100% { transform: scale(1.6); opacity: 0; } }
@keyframes owllayer-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes owllayer-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes owllayer-spin { to { transform: rotate(360deg); } }
@keyframes owllayer-ripple { 0% { transform: scale(0.55); opacity: 0.55; } 100% { transform: scale(1.05); opacity: 0; } }
@keyframes owllayer-talk { from { transform: scale(0.97); } to { transform: scale(1.08); } }
@keyframes owllayer-dance { from { height: 3px; } to { height: calc(5px + 12px * var(--w, 1)); } }
@keyframes owllayer-shimmer { 0%, 100% { height: 3px; opacity: 0.35; } 50% { height: 8px; opacity: 0.9; } }
@keyframes owllayer-typing { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }

/* ============================================================
   PETITS ECRANS ET MOUVEMENT REDUIT
   ============================================================ */

@media (max-width: 480px) {
  ${contextSelector} { --edge: 12px; }
  .owllayer-panel, .owllayer-panel.bottom-left {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    border-radius: 22px;
  }
  .owllayer-panel.text-mode { width: auto; height: min(86vh, calc(100vh - 16px)); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}
`;
}

/** CSS of the default preset (`call`) with the default theme. */
export const WIDGET_STYLES = generateWidgetStyles();
