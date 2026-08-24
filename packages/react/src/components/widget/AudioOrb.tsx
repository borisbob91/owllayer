import type { WidgetVisualState } from '@owllayer/core';

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
    <div className={`owllayer-audio-dots ${state}`}>
      <div className="owllayer-audio-dot" />
      <div className="owllayer-audio-dot" />
      <div className="owllayer-audio-dot" />
      <div className="owllayer-audio-dot" />
      <div className="owllayer-audio-dot" />
    </div>
  );
}

interface TravelWaveformProps {
  state: WidgetVisualState;
  inputLevel: number;
  isMuted?: boolean;
}

const BAR_COUNT = 32;

/**
 * TravelWaveform - Svelte-inspired visualizer for the travel preset.
 * - listening: mic-reactive bars driven by inputLevel
 * - thinking/speaking: state-driven animated bars
 * - idle/error: ambient fallback animation
 */
export function TravelWaveform({ state, inputLevel, isMuted = false }: TravelWaveformProps) {
  return (
    <div className={`owllayer-travel-viz state-${state}`}>
      <div className="owllayer-travel-orb" />
      <div className={`owllayer-travel-wave ${isMuted ? 'muted' : state}`}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const center = (BAR_COUNT - 1) / 2;
          const dist = Math.abs(i - center);
          const distanceFactor = Math.max(0.25, 1 - dist / center);
          const base = 6 + distanceFactor * 10;
          const reactive = isMuted ? 0 : inputLevel * 52 * distanceFactor;
          const height = (!isMuted && state === 'listening') ? Math.max(3, base + reactive) : base;

          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="owllayer-travel-bar"
              style={
                {
                  '--idx': i,
                  '--dist': dist.toFixed(2),
                  height: `${height}px`,
                } as Record<string, string | number>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
