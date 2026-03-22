import { DomOS } from '@domos/browser';

const ENDPOINT = import.meta.env.VITE_DOMOS_ENDPOINT ?? 'ws://localhost:4001/domos';
const API_KEY  = import.meta.env.VITE_DOMOS_DISABLE_API_KEY === 'true'
  ? ''
  : (import.meta.env.VITE_DOMOS_API_KEY ?? '');

// ── Cart helpers partagés (localStorage) ─────────────────────────────────────
export function getCart() {
  try { return JSON.parse(localStorage.getItem('shopmate_cart') || '[]'); } catch { return []; }
}
export function saveCart(cart) {
  localStorage.setItem('shopmate_cart', JSON.stringify(cart));
}
export function cartItemCount(cart) {
  return cart.reduce((s, i) => s + i.qty, 0);
}
export function cartSubtotal(cart) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

// ── Badge de statut DomOS dans le header ─────────────────────────────────────
const STATUS_MAP = {
  connecting: ['bg-yellow-400', 'DomOS…'],
  idle:       ['bg-green-400',  'DomOS prêt'],
  thinking:   ['bg-blue-400',   'Réflexion…'],
  streaming:  ['bg-blue-400',   'Réponse…'],
  listening:  ['bg-purple-400', 'Écoute…'],
  speaking:   ['bg-purple-400', 'Parle…'],
  error:      ['bg-red-400',    'Erreur'],
};

function setStatus(state) {
  const dot  = document.getElementById('domos-dot');
  const text = document.getElementById('domos-status-text');
  if (!dot) return;
  const [color, label] = STATUS_MAP[state] ?? STATUS_MAP.connecting;
  dot.className = `w-2 h-2 rounded-full transition-colors ${color}`;
  if (text) text.textContent = label;
}

// ── Init DomOS (une fois par page) ───────────────────────────────────────────
/**
 * Initialise DomOS et câble le badge de statut.
 * @param {{ role?: string, description?: string, voice?: object, [k: string]: unknown }} pageConfig
 * @returns {Promise<void>}
 */
export async function startDomOS({ role, description, voice, ...extraContext } = {}) {
  setStatus('connecting');

  await DomOS.init({
    endpoint: ENDPOINT,
    apiKey:   API_KEY,
    debug:    true,
    widget:   { enabled: true },
    hitl:     { enabled: true },
    autoDiscovery: { enabled: true },
    session:  { autoResume: true },
    ...(voice ? { voice } : {}),
    context:  { role, description, ...extraContext },
    onReady:  () => setStatus('idle'),
    onError:  () => setStatus('error'),
  });

  DomOS.onAgentStateChange(state => setStatus(state));
}

export { DomOS };
