/**
 * ModeToggle — Bouton bascule Texte ↔ Vocal.
 * Composant Preact pur, remplaçable librement.
 */
import { h } from 'preact';

export function ModeToggle({
  mode,
  onToggle,
  disabled = false,
}: {
  mode: 'text' | 'voice';
  onToggle: () => void;
  disabled?: boolean;
}) {
  const isVoice = mode === 'voice';

  return h('button', {
    type: 'button',
    title: isVoice ? 'Passer en mode texte' : 'Passer en mode vocal',
    disabled,
    onClick: onToggle,
    style: {
      border: `1px solid ${isVoice ? '#6366f1' : '#334155'}`,
      borderRadius: '8px',
      background: isVoice ? '#312e81' : '#1e293b',
      color: isVoice ? '#a5b4fc' : '#94a3b8',
      padding: '0 10px',
      height: '38px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: '11px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      transition: 'all 0.15s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      outline: 'none',
    },
  },
    isVoice
      ? [h('span', { key: 'ic' }, '🎙'), h('span', { key: 'lb' }, 'Vocal')]
      : [h('span', { key: 'ic' }, '⌨'), h('span', { key: 'lb' }, 'Texte')],
  );
}
