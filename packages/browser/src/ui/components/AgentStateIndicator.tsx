/**
 * AgentStateIndicator — Indicateur visuel de l'état courant de l'agent.
 * Composant Preact pur, remplaçable librement.
 *
 * Animations requises (injectées par WidgetHost via WIDGET_CSS) :
 *   owllayer-bounce, owllayer-pulse, owllayer-bars, owllayer-spin
 */
import { h, type ComponentChild } from 'preact';
import type { AgentState } from '../../types.js';

export function AgentStateIndicator({
  state,
  accentColor = '#6366f1',
}: {
  state: AgentState;
  accentColor?: string;
}) {
  const dot = (color: string, anim?: string, delay?: string): ComponentChild =>
    h('span', {
      style: {
        display: 'inline-block',
        width: '5px',
        height: '5px',
        borderRadius: '50%',
        background: color,
        animation: anim,
        animationDelay: delay,
        flexShrink: 0,
      },
    });

  const label = (text: string, color = '#94a3b8'): ComponentChild =>
    h('span', { style: { fontSize: '11px', color, marginLeft: '4px' } }, text);

  const row = (...children: ComponentChild[]) =>
    h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '3px' } }, ...children);

  if (state === 'connecting') {
    return row(
      h('span', {
        style: {
          display: 'inline-block',
          width: '7px', height: '7px',
          borderRadius: '50%',
          border: '2px solid #f59e0b',
          borderTopColor: 'transparent',
          animation: 'owllayer-spin 0.7s linear infinite',
          flexShrink: 0,
        },
      }),
      label('Connexion...', '#f59e0b'),
    );
  }

  if (state === 'listening') {
    return row(
      dot(accentColor, 'owllayer-dot-bounce 1s ease-in-out infinite', '0ms'),
      dot(accentColor, 'owllayer-dot-bounce 1s ease-in-out infinite', '100ms'),
      dot(accentColor, 'owllayer-dot-bounce 1s ease-in-out infinite', '200ms'),
      label('En écoute', accentColor),
    );
  }

  if (state === 'thinking') {
    return row(
      dot(accentColor, 'owllayer-dot-pulse 1.2s ease-in-out infinite', '0ms'),
      dot(accentColor, 'owllayer-dot-pulse 1.2s ease-in-out infinite', '150ms'),
      dot(accentColor, 'owllayer-dot-pulse 1.2s ease-in-out infinite', '300ms'),
      label('Réflexion...'),
    );
  }

  if (state === 'streaming') {
    return row(
      dot('#94a3b8', 'owllayer-dot-pulse 0.9s ease-in-out infinite', '0ms'),
      dot('#94a3b8', 'owllayer-dot-pulse 0.9s ease-in-out infinite', '150ms'),
      dot('#94a3b8', 'owllayer-dot-pulse 0.9s ease-in-out infinite', '300ms'),
    );
  }

  if (state === 'speaking') {
    return row(
      h('span', {
        style: { display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '14px' },
      },
        ...[0, 100, 200, 300].map(delay =>
          h('span', {
            key: delay,
            style: {
              display: 'inline-block', width: '3px',
              background: accentColor, borderRadius: '2px',
              animation: `owllayer-dot-bar 0.8s ease-in-out infinite`,
              animationDelay: `${delay}ms`,
            },
          }),
        ),
      ),
      label('Parle', accentColor),
    );
  }

  if (state === 'error') {
    return row(
      h('span', {
        style: {
          display: 'inline-block', width: '7px', height: '7px',
          borderRadius: '50%', background: '#ef4444', flexShrink: 0,
        },
      }),
      label('Hors ligne', '#ef4444'),
    );
  }

  // idle
  return row(
    h('span', {
      style: {
        display: 'inline-block', width: '7px', height: '7px',
        borderRadius: '50%', background: '#22c55e', flexShrink: 0,
      },
    }),
    label('Prêt', '#22c55e'),
  );
}
