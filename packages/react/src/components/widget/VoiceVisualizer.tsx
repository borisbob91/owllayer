import type { CSSProperties } from 'react';
import type { WidgetVisualState } from '@owllayer/core';

interface VoiceVisualizerProps {
  state: WidgetVisualState;
  /** Niveau du micro, 0..1 (utilise quand l'utilisateur parle) */
  level: number;
  isMuted?: boolean;
}

const BAR_COUNT = 21;
const CENTER = (BAR_COUNT - 1) / 2;

/**
 * Voice visualizer shared by every preset: orb, rings and bars.
 * The CSS (core `generateWidgetStyles`) animates each state; `--level` follows the microphone.
 */
export function VoiceVisualizer({ state, level, isMuted = false }: VoiceVisualizerProps) {
  return (
    <div
      className={`owllayer-viz state-${state} ${isMuted ? 'is-muted' : ''}`}
      style={{ '--level': isMuted ? 0 : level.toFixed(3) } as CSSProperties}
      aria-hidden="true"
    >
      <div className="owllayer-viz-ring" />
      <div className="owllayer-viz-ring" />
      <div className="owllayer-viz-ring" />
      <div className="owllayer-viz-orb" />
      <div className="owllayer-viz-bars">
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="owllayer-viz-bar"
            // --w : barres plus hautes au centre ; --i : decalage des animations
            style={{ '--i': i, '--w': (1 - Math.abs(i - CENTER) / (CENTER + 1)).toFixed(2) } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
