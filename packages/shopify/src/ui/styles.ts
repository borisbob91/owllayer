/** CSS injected into the ShopifyWidget Shadow DOM. No external dependencies. */
export const WIDGET_CSS = `
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }

:host { all: initial; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }

/* ── Scrollbar ─────────────────────────────────────────────────────────────── */
*::-webkit-scrollbar { width: 4px; height: 4px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

/* ── Animations ────────────────────────────────────────────────────────────── */
@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pop-in {
  0%   { transform: scale(0.7); opacity: 0; }
  70%  { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes orb-bar {
  0%, 100% { transform: scaleY(0.3); }
  50%       { transform: scaleY(1); }
}
@keyframes orb-bar-talk {
  0%, 100% { transform: scaleY(0.4); }
  25%       { transform: scaleY(0.9); }
  75%       { transform: scaleY(1); }
}
@keyframes ripple {
  0%   { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes float-btn-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.5); }
  50%       { box-shadow: 0 0 0 14px rgba(249,115,22,0); }
}
@keyframes widget-open {
  from { opacity: 0; transform: scale(0.95) translateY(12px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-6px); }
}

/* ── Utility ────────────────────────────────────────────────────────────────── */
.anim-fade-in   { animation: fade-in 0.25s ease both; }
.anim-slide-up  { animation: slide-up 0.3s cubic-bezier(0.22,1,0.36,1) both; }
.anim-pop-in    { animation: pop-in 0.3s cubic-bezier(0.22,1,0.36,1) both; }
.anim-spin      { animation: spin 0.8s linear infinite; }
.anim-pulse     { animation: pulse 1.5s ease-in-out infinite; }

/* ── Floating button ────────────────────────────────────────────────────────── */
.float-btn {
  position: fixed; right: 24px; bottom: 24px; z-index: 2147483640;
  width: 58px; height: 58px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 28px rgba(249,115,22,0.4);
  transition: transform 0.2s, background 0.2s;
  outline: none;
}
.float-btn:hover { transform: scale(1.08); }
.float-btn:active { transform: scale(0.95); }
.float-btn.open {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
  animation: none;
}
.float-btn.idle-glow { animation: float-btn-glow 2.5s ease-in-out infinite; }
.float-btn-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid rgba(249,115,22,0.5);
  animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;
  pointer-events: none;
}
.float-btn-badge {
  position: absolute; top: -3px; right: -3px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #22c55e; border: 2px solid #0b1220;
  animation: pulse 2s ease-in-out infinite;
}
.float-tooltip {
  position: absolute; bottom: calc(100% + 10px); right: 0;
  background: #fff; color: #0f172a;
  padding: 7px 13px; border-radius: 10px;
  font-size: 13px; font-weight: 600; white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  animation: fade-in 0.2s ease both;
  pointer-events: none;
}
.float-tooltip::after {
  content: ''; position: absolute; top: 100%; right: 18px;
  border: 6px solid transparent; border-top-color: #fff;
}

/* ── Widget panel ───────────────────────────────────────────────────────────── */
.widget-panel {
  position: fixed; right: 24px; bottom: 96px; z-index: 2147483639;
  background: #0b1220; color: #e2e8f0;
  border: 1px solid #1e293b; border-radius: 20px;
  box-shadow: 0 20px 64px rgba(2,6,23,0.6);
  overflow: hidden;
  display: flex; flex-direction: column;
  font-size: 14px; line-height: 1.5;
  animation: widget-open 0.3s cubic-bezier(0.22,1,0.36,1) both;
  transition: width 0.4s cubic-bezier(0.22,1,0.36,1), height 0.4s cubic-bezier(0.22,1,0.36,1);
}
.widget-panel.compact {
  width: min(92vw, 360px);
  height: min(80vh, 580px);
  flex-direction: column;
}
.widget-panel.expanded {
  width: min(96vw, 800px);
  height: min(82vh, 580px);
  flex-direction: row;
}
@media (max-width: 640px) {
  .widget-panel { right: 0; bottom: 0; border-radius: 20px 20px 0 0; width: 100% !important; height: 70vh !important; flex-direction: column !important; }
}

/* ── Voice sidebar (left when expanded, top when compact) ───────────────────── */
.voice-sidebar {
  background: #0d1526; border-right: 1px solid #1e293b;
  display: flex; flex-direction: column; align-items: center; flex-shrink: 0;
  transition: width 0.4s, min-width 0.4s, padding 0.4s;
}
.compact .voice-sidebar {
  flex-direction: row; width: 100%; min-width: unset;
  border-right: none; border-bottom: 1px solid #1e293b;
  padding: 12px 16px; gap: 12px; align-items: center;
}
.expanded .voice-sidebar {
  width: 260px; min-width: 260px;
  padding: 28px 16px; gap: 16px; justify-content: center;
}

/* ── Voice Orb ──────────────────────────────────────────────────────────────── */
.orb-wrap {
  position: relative; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: width 0.4s, height 0.4s;
}
.compact .orb-wrap { width: 52px; height: 52px; }
.expanded .orb-wrap { width: 120px; height: 120px; }

.orb {
  width: 100%; height: 100%; border-radius: 50%;
  border: 3px solid #334155;
  background: #111827;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative; overflow: visible;
}
.orb.listening {
  border-color: #818cf8;
  box-shadow: 0 0 28px rgba(129,140,248,0.45);
}
.orb.speaking {
  border-color: #f97316;
  box-shadow: 0 0 28px rgba(249,115,22,0.45);
}
.orb.thinking {
  border-color: #0ea5e9;
  box-shadow: 0 0 20px rgba(14,165,233,0.35);
}
.orb.error { border-color: #ef4444; }

.orb-bars { display: flex; align-items: center; gap: 3px; height: 40%; }
.orb-bar {
  border-radius: 2px; background: #475569; transform-origin: center bottom;
  transition: background 0.3s;
}
.compact .orb-bars { gap: 2px; }
.compact .orb-bar { width: 3px; height: 14px; }
.expanded .orb-bar { width: 4px; height: 32px; }

.orb.listening .orb-bar { background: #818cf8; }
.orb.speaking  .orb-bar { background: #f97316; }
.orb.thinking  .orb-bar { background: #0ea5e9; }

.orb.listening .orb-bar:nth-child(1) { animation: orb-bar 0.6s ease-in-out infinite 0.0s; }
.orb.listening .orb-bar:nth-child(2) { animation: orb-bar 0.6s ease-in-out infinite 0.1s; }
.orb.listening .orb-bar:nth-child(3) { animation: orb-bar 0.6s ease-in-out infinite 0.05s; }
.orb.listening .orb-bar:nth-child(4) { animation: orb-bar 0.6s ease-in-out infinite 0.15s; }
.orb.listening .orb-bar:nth-child(5) { animation: orb-bar 0.6s ease-in-out infinite 0.08s; }

.orb.speaking .orb-bar:nth-child(1) { animation: orb-bar-talk 0.5s ease-in-out infinite 0.0s; }
.orb.speaking .orb-bar:nth-child(2) { animation: orb-bar-talk 0.4s ease-in-out infinite 0.07s; }
.orb.speaking .orb-bar:nth-child(3) { animation: orb-bar-talk 0.6s ease-in-out infinite 0.03s; }
.orb.speaking .orb-bar:nth-child(4) { animation: orb-bar-talk 0.45s ease-in-out infinite 0.12s; }
.orb.speaking .orb-bar:nth-child(5) { animation: orb-bar-talk 0.55s ease-in-out infinite 0.06s; }

.orb.thinking .orb-bar { transform: scaleY(0.3); animation: none; }
.orb.thinking .orb-bar:nth-child(1) { animation: dot-bounce 1s ease-in-out infinite 0.0s; }
.orb.thinking .orb-bar:nth-child(2) { animation: dot-bounce 1s ease-in-out infinite 0.15s; }
.orb.thinking .orb-bar:nth-child(3) { animation: dot-bounce 1s ease-in-out infinite 0.3s; }
.orb.thinking .orb-bar:nth-child(4) { animation: dot-bounce 1s ease-in-out infinite 0.15s; }
.orb.thinking .orb-bar:nth-child(5) { animation: dot-bounce 1s ease-in-out infinite 0.0s; }

.orb-ripple {
  position: absolute; inset: -8px; border-radius: 50%;
  border: 2px solid rgba(129,140,248,0.4);
  pointer-events: none;
  animation: ripple 1.6s ease-out infinite;
}
.orb-ripple-2 {
  animation-delay: 0.5s;
  border-color: rgba(129,140,248,0.2);
}

/* ── Sidebar info (agent name + status) ─────────────────────────────────────── */
.agent-info { text-align: center; min-width: 0; }
.compact .agent-info { text-align: left; flex: 1; }
.agent-name { font-weight: 700; font-size: 15px; color: #f1f5f9; }
.compact .agent-name { font-size: 14px; }
.agent-status {
  font-size: 11px; margin-top: 3px; font-weight: 500;
  display: flex; align-items: center; gap: 5px; justify-content: center;
}
.compact .agent-status { justify-content: flex-start; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.status-dot.connecting { background: #fbbf24; animation: pulse 1s ease-in-out infinite; }
.status-dot.idle       { background: #22c55e; }
.status-dot.listening  { background: #818cf8; animation: pulse 0.8s ease-in-out infinite; }
.status-dot.thinking   { background: #0ea5e9; animation: pulse 1s ease-in-out infinite; }
.status-dot.speaking   { background: #f97316; animation: pulse 0.6s ease-in-out infinite; }
.status-dot.streaming  { background: #f97316; animation: pulse 0.6s ease-in-out infinite; }
.status-dot.error      { background: #ef4444; }
.status-text.connecting { color: #fbbf24; }
.status-text.idle       { color: #22c55e; }
.status-text.listening  { color: #818cf8; }
.status-text.thinking   { color: #0ea5e9; }
.status-text.speaking   { color: #f97316; }
.status-text.streaming  { color: #f97316; }
.status-text.error      { color: #ef4444; }

/* ── Mic button (in sidebar) ────────────────────────────────────────────────── */
.mic-btn {
  border: none; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.2s, transform 0.15s;
  outline: none;
}
.mic-btn:hover { transform: scale(1.07); }
.mic-btn:active { transform: scale(0.93); }
.mic-btn.off  { background: #1e293b; color: #64748b; width: 44px; height: 44px; }
.mic-btn.on   { background: #312e81; color: #818cf8; width: 44px; height: 44px; }
.compact .mic-btn { width: 40px; height: 40px; }
.expanded .mic-btn { width: 52px; height: 52px; }
.expanded .mic-btn.off  { background: #1e293b; }
.expanded .mic-btn.on   { background: #312e81; }

/* ── Chat area ──────────────────────────────────────────────────────────────── */
.chat-area {
  flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden;
}
.compact .chat-area { border-top: none; }
.expanded .chat-area { border-left: none; }

.messages-list {
  flex: 1; overflow-y: auto; padding: 14px 14px 8px;
  display: flex; flex-direction: column; gap: 8px;
}
.empty-state {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 10px; color: #475569; text-align: center; padding: 32px;
}
.empty-wave { font-size: 36px; }
.empty-hint { font-size: 13px; color: #475569; }

.msg-row { display: flex; flex-direction: column; gap: 1px; }
.msg-row.user { align-items: flex-end; }
.msg-row.agent { align-items: flex-start; }

.msg-bubble {
  max-width: 85%; padding: 9px 13px; border-radius: 14px;
  font-size: 13.5px; line-height: 1.55; animation: fade-in 0.2s ease both;
  word-break: break-word;
}
.msg-bubble.user  { background: #f97316; color: #fff; border-bottom-right-radius: 4px; }
.msg-bubble.agent { background: #1e293b; color: #e2e8f0; border-bottom-left-radius: 4px; }
.msg-bubble.streaming::after {
  content: '▌'; display: inline-block; font-size: 12px;
  animation: pulse 0.8s ease-in-out infinite; margin-left: 2px;
}

.typing-indicator {
  display: flex; align-items: center; gap: 4px;
  background: #1e293b; padding: 10px 14px; border-radius: 14px;
  border-bottom-left-radius: 4px; width: fit-content;
}
.typing-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #64748b;
}
.typing-dot:nth-child(1) { animation: dot-bounce 1.1s ease-in-out infinite 0.0s; }
.typing-dot:nth-child(2) { animation: dot-bounce 1.1s ease-in-out infinite 0.18s; }
.typing-dot:nth-child(3) { animation: dot-bounce 1.1s ease-in-out infinite 0.36s; }

/* ── Chat input ─────────────────────────────────────────────────────────────── */
.chat-input-bar {
  border-top: 1px solid #1e293b; padding: 10px 12px;
  display: flex; gap: 8px; align-items: center; flex-shrink: 0;
  background: #0d1526;
}
.chat-input {
  flex: 1; background: #1e293b; border: 1px solid #334155;
  border-radius: 22px; padding: 8px 14px;
  color: #e2e8f0; font-size: 13.5px; outline: none; resize: none;
  font-family: inherit; line-height: 1.4; max-height: 80px; overflow-y: auto;
  transition: border-color 0.2s;
}
.chat-input:focus { border-color: #f97316; }
.chat-input::placeholder { color: #475569; }
.send-btn {
  width: 36px; height: 36px; border-radius: 50%; border: none;
  background: #f97316; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.2s, transform 0.15s;
  outline: none;
}
.send-btn:hover { background: #ea580c; transform: scale(1.05); }
.send-btn:active { transform: scale(0.93); }
.send-btn:disabled { background: #334155; cursor: not-allowed; }

/* ── Content panel ──────────────────────────────────────────────────────────── */
.content-panel {
  flex: 1; display: flex; flex-direction: column;
  border-left: 1px solid #1e293b; overflow: hidden;
  background: #0f172a; min-width: 0;
  animation: slide-up 0.3s cubic-bezier(0.22,1,0.36,1) both;
}

/* ── Panel header ───────────────────────────────────────────────────────────── */
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0;
}
.panel-title { font-weight: 700; font-size: 14px; color: #f1f5f9; }
.panel-close {
  background: none; border: none; color: #64748b; cursor: pointer;
  padding: 4px; border-radius: 6px; display: flex; align-items: center;
  transition: color 0.2s; outline: none;
}
.panel-close:hover { color: #e2e8f0; }
.back-btn {
  background: none; border: none; color: #64748b; cursor: pointer;
  padding: 0; display: flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 600; transition: color 0.2s; outline: none;
}
.back-btn:hover { color: #f97316; }

/* ── Product grid ───────────────────────────────────────────────────────────── */
.product-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;
  padding: 12px; overflow-y: auto; flex: 1;
}
.product-card {
  background: #1e293b; border: 1px solid #334155; border-radius: 12px;
  overflow: hidden; cursor: pointer;
  transition: border-color 0.2s, transform 0.15s, box-shadow 0.2s;
  display: flex; flex-direction: column; animation: fade-in 0.25s ease both;
}
.product-card:hover {
  border-color: #f97316; transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(249,115,22,0.15);
}
.product-img-wrap {
  background: #fff; aspect-ratio: 1; padding: 10px;
  display: flex; align-items: center; justify-content: center;
}
.product-img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
.product-info { padding: 8px 10px 10px; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.product-name { font-size: 12px; font-weight: 600; color: #e2e8f0; line-height: 1.3; }
.product-price { font-size: 13px; font-weight: 700; color: #f97316; }
.product-compare { font-size: 11px; color: #64748b; text-decoration: line-through; margin-left: 4px; }
.product-badge {
  font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  width: fit-content; margin-top: 2px;
}
.badge-available { background: rgba(34,197,94,0.12); color: #22c55e; }
.badge-unavailable { background: rgba(100,116,139,0.12); color: #64748b; }

/* ── Product detail ─────────────────────────────────────────────────────────── */
.product-detail { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
.product-detail-img {
  background: #fff; border-radius: 12px; padding: 20px;
  display: flex; align-items: center; justify-content: center; min-height: 160px;
}
.product-detail-img img { max-width: 100%; max-height: 180px; object-fit: contain; }
.product-detail-title { font-size: 16px; font-weight: 700; color: #f1f5f9; line-height: 1.3; }
.product-detail-price { font-size: 20px; font-weight: 800; color: #f97316; }
.product-detail-desc { font-size: 13px; color: #94a3b8; line-height: 1.6; }
.variants-row { display: flex; gap: 6px; flex-wrap: wrap; }
.variant-btn {
  padding: 5px 12px; border-radius: 8px; border: 1px solid #334155;
  background: #1e293b; color: #e2e8f0; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: border-color 0.2s, background 0.2s; outline: none;
}
.variant-btn:hover:not(:disabled) { border-color: #f97316; background: rgba(249,115,22,0.08); }
.variant-btn.selected { border-color: #f97316; background: rgba(249,115,22,0.15); color: #f97316; }
.variant-btn:disabled { color: #475569; cursor: not-allowed; text-decoration: line-through; }
.add-cart-btn {
  width: 100%; padding: 11px; border-radius: 10px; border: none;
  background: #f97316; color: #fff; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background 0.2s; outline: none;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.add-cart-btn:hover { background: #ea580c; }

/* ── Cart view ──────────────────────────────────────────────────────────────── */
.cart-view { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.cart-item {
  background: #1e293b; border: 1px solid #334155; border-radius: 10px;
  padding: 10px; display: flex; gap: 10px; align-items: center;
  animation: fade-in 0.2s ease both;
}
.cart-item-img { width: 48px; height: 48px; background: #fff; border-radius: 6px; padding: 4px; flex-shrink: 0; }
.cart-item-img img { width: 100%; height: 100%; object-fit: contain; }
.cart-item-info { flex: 1; min-width: 0; }
.cart-item-name { font-size: 12.5px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cart-item-price { font-size: 13px; font-weight: 700; color: #f97316; margin-top: 2px; }
.qty-ctrl { display: flex; align-items: center; gap: 2px; }
.qty-btn {
  width: 26px; height: 26px; border-radius: 6px; border: 1px solid #334155;
  background: #0f172a; color: #e2e8f0; cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s; outline: none;
}
.qty-btn:hover { background: #1e293b; }
.qty-val { font-size: 12px; font-weight: 700; color: #e2e8f0; width: 20px; text-align: center; }
.cart-remove {
  background: none; border: none; color: #475569; cursor: pointer;
  padding: 4px; border-radius: 4px; transition: color 0.2s; outline: none;
  display: flex; align-items: center;
}
.cart-remove:hover { color: #ef4444; }
.cart-footer {
  border-top: 1px solid #1e293b; padding: 12px 0 4px; margin-top: auto; flex-shrink: 0;
}
.cart-total-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
.cart-total-label { font-size: 12px; color: #94a3b8; }
.cart-total-val { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.cart-total-big { font-size: 16px; font-weight: 800; color: #f97316; }
.checkout-btn {
  width: 100%; margin-top: 10px; padding: 11px;
  border-radius: 10px; border: none; font-size: 14px; font-weight: 700;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff; cursor: pointer; transition: opacity 0.2s; outline: none;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.checkout-btn:hover { opacity: 0.9; }
.empty-cart { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; color: #475569; font-size: 13px; }

/* ── Notification toast ─────────────────────────────────────────────────────── */
.toast {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  padding: 8px 16px; border-radius: 100px; font-size: 12px; font-weight: 600;
  white-space: nowrap; display: flex; align-items: center; gap: 6px;
  z-index: 10; animation: pop-in 0.25s ease both;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
.toast.success { background: #16a34a; color: #fff; }
.toast.info    { background: #0ea5e9; color: #fff; }
.toast.warning { background: #f59e0b; color: #0f172a; }
.toast.error   { background: #dc2626; color: #fff; }

/* ── Query badge ────────────────────────────────────────────────────────────── */
.query-badge { font-size: 11px; color: #64748b; padding: 0 16px 6px; }
.filter-row { display: flex; gap: 5px; flex-wrap: wrap; padding: 0 12px 6px; }
.filter-chip {
  font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 100px;
  background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); color: #f97316;
  animation: pop-in 0.2s ease both;
}
`;
