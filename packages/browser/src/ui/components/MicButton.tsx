/**
 * MicButton — Bouton de capture micro avec états visuels.
 * Composant Preact pur, remplaçable librement.
 *
 * Etats visuels :
 *  - idle     → cercle sombre, clic = démarrer
 *  - listening → rouge pulsant, clic = stopper
 *  - thinking/speaking → grisé, désactivé
 *  - error    → désactivé
 */
import { h } from 'preact';
import type { AgentState } from '../../types.js';

export function MicButton({
  agentState,
  onToggle,
  accentColor = '#6366f1',
}: {
  agentState: AgentState;
  onToggle: () => void;
  accentColor?: string;
}) {
  const isListening = agentState === 'listening';
  const isProcessing = agentState === 'thinking' || agentState === 'speaking' || agentState === 'streaming';
  const isDisabled = agentState === 'connecting' || agentState === 'error' || isProcessing;

  const borderColor = isListening ? '#ef4444' : isDisabled ? '#334155' : accentColor;
  const bg = isListening ? '#ef4444' : '#1e293b';
  const color = isListening ? '#fff' : isDisabled ? '#475569' : '#94a3b8';
  const title = isListening
    ? 'Arrêter le micro'
    : isProcessing ? 'En cours...'
    : 'Démarrer le micro';

  // Inline SVG mic icon
  const MicSvg = h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '15', height: '15',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
    h('rect', { x: '9', y: '1', width: '6', height: '12', rx: '3' }),
    h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
    h('line', { x1: '12', y1: '19', x2: '12', y2: '23' }),
    h('line', { x1: '8', y1: '23', x2: '16', y2: '23' }),
  );

  return h('button', {
    type: 'button',
    title,
    disabled: isDisabled,
    onClick: onToggle,
    style: {
      border: `2px solid ${borderColor}`,
      borderRadius: '50%',
      background: bg,
      color,
      width: '38px',
      height: '38px',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      animation: isListening ? 'domos-pulse 1.5s ease-in-out infinite' : 'none',
      transition: 'all 0.15s ease',
      outline: 'none',
    },
  }, MicSvg);
}
