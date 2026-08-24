export const WIDGET_STYLES = `
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.owllayer-widget-container, .owllayer-widget-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-soft: rgba(37, 99, 235, 0.08);
  --bg-panel: #ffffff;
  --bg-surface: #f8fafc;
  --bg-bubble-user: linear-gradient(135deg, #2563eb, #3b82f6);
  --bg-bubble-agent: #f1f5f9;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --border: rgba(148, 163, 184, 0.3);
  --shadow: 0 20px 60px -10px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(148, 163, 184, 0.15);
  --live: #10b981;
  --danger: #ef4444;
}

/* =========================================
   Panel
   ========================================= */
.widget-modal {
  position: fixed;
  bottom: 88px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 48px);
  background: var(--bg-panel);
  border-radius: 20px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999999;
  animation: modalEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform-origin: bottom right;
}

/* Audio mode: compact auto-height */
.widget-modal.audio-mode {
  height: auto;
}

/* Text mode: fixed height with scrollable messages */
.widget-modal.text-mode {
  height: 520px;
  max-height: calc(100vh - 140px);
}

.widget-modal.is-closing {
  animation: modalExit 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes modalEnter {
  from { opacity: 0; transform: scale(0.93) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes modalExit {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to   { opacity: 0; transform: scale(0.95) translateY(12px); pointer-events: none; }
}

/* =========================================
   Floating Button
   ========================================= */
.floating-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
  z-index: 999999;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
}
.floating-button:hover {
  transform: translateY(-3px) scale(1.05);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.45);
}

/* =========================================
   Header
   ========================================= */
.owllayer-panel-header {
  padding: 14px 18px;
  background: linear-gradient(to bottom, #ffffff, #f8fafc);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.header-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--live);
  animation: statusPulse 2s ease-in-out infinite;
}
.status-dot.error   { background: var(--danger); animation: none; }
.status-dot.offline { background: var(--text-muted); animation: none; }

@keyframes statusPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
}

.close-button {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.close-button:hover {
  background: #f1f5f9;
  color: var(--text-main);
}

/* =========================================
   Message List
   ========================================= */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
  min-height: 0;
  background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 40%);
}
.message-list::-webkit-scrollbar { width: 3px; }
.message-list::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.4); border-radius: 2px; }

/* Empty state */
.message-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 32px 24px;
  opacity: 0.65;
}
.message-empty svg {
  width: 36px;
  height: 36px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.message-empty p {
  font-size: 13px;
  line-height: 1.5;
}

/* Bubbles */
.message {
  max-width: 82%;
  display: flex;
  flex-direction: column;
  animation: msgIn 0.2s ease;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.message.user      { align-self: flex-end; }
.message.assistant,
.message.agent     { align-self: flex-start; }

.message-content {
  padding: 9px 13px;
  font-size: 13.5px;
  line-height: 1.5;
  border-radius: 14px;
  word-wrap: break-word;
}
.message.user .message-content {
  background: var(--bg-bubble-user);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.message.assistant .message-content,
.message.agent .message-content {
  background: var(--bg-bubble-agent);
  color: var(--text-main);
  border-bottom-left-radius: 4px;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 12px;
  background: currentColor;
  margin-left: 2px;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}

.message-time {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 4px;
  opacity: 0.7;
}
.message.user .message-time { align-self: flex-end; }

/* =========================================
   Chat Input
   ========================================= */
.chat-input-wrapper {
  padding: 12px 18px 14px;
  background: #ffffff;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.chat-input-container {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--bg-surface);
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 14px;
  padding: 4px 4px 4px 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.chat-input-container:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
  background: #fff;
}

.chat-input-container textarea {
  flex: 1;
  border: none;
  background: transparent;
  resize: none;
  max-height: 100px;
  font-size: 13.5px;
  line-height: 1.5;
  padding: 7px 0;
  outline: none;
  color: var(--text-main);
  font-family: inherit;
}
.chat-input-container textarea::placeholder { color: var(--text-muted); }

.icon-button {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.icon-button:hover { background: #e2e8f0; color: var(--text-main); }

.icon-button.send-button {
  background: var(--primary);
  color: white;
}
.icon-button.send-button:disabled {
  background: transparent;
  color: rgba(148, 163, 184, 0.5);
  cursor: not-allowed;
}
.icon-button.send-button:not(:disabled):hover {
  background: var(--primary-hover);
  transform: scale(1.05);
}

/* =========================================
   Signature
   ========================================= */
.owllayer-widget-signature {
  text-align: center;
  padding: 6px 0 8px;
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0.5;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  user-select: none;
}

/* =========================================
   Voice Mode
   ========================================= */
.voice-mode-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px 18px 16px;
  background: linear-gradient(160deg, #f0f7ff 0%, #ffffff 60%);
}

.audio-orb-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  position: relative;
}

.audio-orb {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  position: relative;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.6);
}
.audio-orb.listening {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
  animation: orbFloat 3s ease-in-out infinite;
}
.audio-orb.thinking {
  background: linear-gradient(135deg, #c4b5fd, #7c3aed);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
}
.audio-orb.speaking {
  background: linear-gradient(135deg, #6ee7b7, #10b981);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
}

@keyframes orbFloat {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

.orb-ring {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: 0;
}
.audio-orb.listening .orb-ring { color: #3b82f6; animation: ripple 2s ease-out infinite; }
.audio-orb.listening .orb-ring:nth-child(3) { animation-delay: -0.7s; }
.audio-orb.listening .orb-ring:nth-child(4) { animation-delay: -1.4s; }

.audio-orb.speaking .orb-ring { color: #10b981; animation: ripple 1.4s ease-out infinite; }
.audio-orb.speaking .orb-ring:nth-child(3) { animation-delay: -0.5s; }
.audio-orb.speaking .orb-ring:nth-child(4) { animation-delay: -1s; }

.audio-orb.thinking .orb-ring {
  color: #7c3aed;
  border-style: dashed;
  border-width: 2px;
  animation: spin 3s linear infinite;
  opacity: 0.3;
}
.audio-orb.thinking .orb-ring:nth-child(3) { animation-duration: 2s; animation-delay: -0.5s; opacity: 0.15; }
.audio-orb.thinking .orb-ring:nth-child(4) { display: none; }

@keyframes ripple {
  0%   { transform: scale(0.85); opacity: 0.6; }
  100% { transform: scale(1.6);  opacity: 0; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* =========================================
   Voice Controls
   ========================================= */
.voice-controls {
  padding: 14px 18px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  background: #ffffff;
  flex-shrink: 0;
}

.voice-btn-large {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
}
.voice-btn-large:hover { transform: scale(1.1); }

.voice-btn-hangup {
  background: var(--danger);
  color: white;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
}
.voice-btn-hangup:hover {
  background: #dc2626;
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.voice-btn-secondary {
  background: var(--bg-surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}
.voice-btn-secondary:hover {
  background: #e2e8f0;
  color: var(--text-main);
}

/* =========================================
   Responsive
   ========================================= */
@media (max-width: 480px) {
  .widget-modal {
    right: 12px;
    bottom: 80px;
    left: 12px;
    width: auto;
  }
  .widget-modal.text-mode {
    height: 65vh;
  }
}
`;
