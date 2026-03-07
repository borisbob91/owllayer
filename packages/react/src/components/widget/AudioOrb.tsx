import type { WidgetVisualState } from '@domos/core';

interface AudioDotsProps {
  state: WidgetVisualState;
}

/**
 * AudioDots — 5 animated dots that react to voice state.
 * - idle: static muted dots
 * - listening: bouncing accent dots
 * - thinking: pulsing dots
 * - speaking: bar-style dancing dots
 * - error: static red dots
 */
export function AudioDots({ state }: AudioDotsProps) {
  return (
    <div className={`domos-audio-dots ${state}`}>
      <div className="domos-audio-dot" />
      <div className="domos-audio-dot" />
      <div className="domos-audio-dot" />
      <div className="domos-audio-dot" />
      <div className="domos-audio-dot" />
    </div>
  );
}
