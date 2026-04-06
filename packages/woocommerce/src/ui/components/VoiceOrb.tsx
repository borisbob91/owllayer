import { h, Fragment } from 'preact';
import type { AgentState } from '../types';

interface Props {
  agentState: AgentState;
  size?: 'large' | 'small';
}

const BAR_COUNT = 5;

export function VoiceOrb({ agentState, size = 'large' }: Props) {
  const isAnimated = agentState === 'listening' || agentState === 'speaking';
  const isListening = agentState === 'listening';
  const orbClass = `orb ${agentState}`;

  return (
    <div class="orb-wrap">
      {isListening && (
        <>
          <span
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              border: '2px solid rgba(129,140,248,0.35)',
              pointerEvents: 'none',
              animation: 'ripple 1.8s ease-out infinite',
            }}
            aria-hidden="true"
          />
          <span
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              border: '2px solid rgba(129,140,248,0.18)',
              pointerEvents: 'none',
              animation: 'ripple 1.8s ease-out infinite 0.6s',
            }}
            aria-hidden="true"
          />
        </>
      )}
      <div class={orbClass} aria-label={`Agent état: ${agentState}`}>
        <div class="orb-bars">
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <div
              key={i}
              class="orb-bar"
              style={
                !isAnimated
                  ? { transform: `scaleY(${0.2 + Math.sin((i / BAR_COUNT) * Math.PI) * 0.5})` }
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
