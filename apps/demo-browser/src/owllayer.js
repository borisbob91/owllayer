import { OwlLayer } from '@owllayer/browser';

const ENDPOINT = import.meta.env.VITE_OWLLAYER_ENDPOINT ?? import.meta.env.VITE_OWLLAYER_ENDPOINT ?? 'ws://localhost:4001/owllayer';
const API_KEY  = (import.meta.env.VITE_OWLLAYER_DISABLE_API_KEY || import.meta.env.VITE_OWLLAYER_DISABLE_API_KEY) === 'true'
  ? ''
  : (import.meta.env.VITE_OWLLAYER_API_KEY ?? import.meta.env.VITE_OWLLAYER_API_KEY ?? '');

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

// ── Badge de statut OwlLayer dans le header ─────────────────────────────────────
const STATUS_MAP = {
  connecting: ['bg-yellow-400', 'OwlLayer…'],
  idle:       ['bg-green-400',  'OwlLayer prêt'],
  thinking:   ['bg-blue-400',   'Réflexion…'],
  streaming:  ['bg-blue-400',   'Réponse…'],
  listening:  ['bg-purple-400', 'Écoute…'],
  speaking:   ['bg-purple-400', 'Parle…'],
  error:      ['bg-red-400',    'Erreur'],
};

function setStatus(state) {
  const dot  = document.getElementById('owllayer-dot');
  const text = document.getElementById('owllayer-status-text');
  if (!dot) return;
  const [color, label] = STATUS_MAP[state] ?? STATUS_MAP.connecting;
  dot.className = `w-2 h-2 rounded-full transition-colors ${color}`;
  if (text) text.textContent = label;
}

// ── Init OwlLayer (une fois par page) ───────────────────────────────────────────
/**
 * Initialise OwlLayer et câble le badge de statut.
 * @param {{ role?: string, description?: string, voice?: object, [k: string]: unknown }} pageConfig
 * @returns {Promise<void>}
 */
export async function startOwlLayer({ role, description, voice, ...extraContext } = {}) {
  setStatus('connecting');

  await OwlLayer.init({
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

  OwlLayer.onAgentStateChange(state => setStatus(state));
}

export { OwlLayer };
