import { useState, useEffect } from 'preact/hooks';
import type { DevToolsConfig } from './index.js';

const TEXT  = '#edf2ff';
const MUTED = '#666680';
const ACCENT = '#a78bfa';
const BORDER = '#2d3355';
const SURFACE = '#12172d';
const SURFACE_ALT = '#181e38';

interface StateMonitorProps {
  config: DevToolsConfig;
}

interface Snapshot {
  ts: number;
  state: string;
  sessionId: string | null;
}

export function StateMonitor({ config }: StateMonitorProps) {
  const [current, setCurrent] = useState<Snapshot>({ ts: Date.now(), state: config.getAgentState(), sessionId: config.getSessionId() });
  const [history, setHistory] = useState<Snapshot[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const next: Snapshot = { ts: Date.now(), state: config.getAgentState(), sessionId: config.getSessionId() };
      setCurrent(prev => {
        if (prev.state !== next.state || prev.sessionId !== next.sessionId) {
          setHistory(h => [...h.slice(-19), prev]);
        }
        return next;
      });
    }, 500);
    return () => clearInterval(id);
  }, [config]);

  const stateColor = (s: string) =>
    s === 'running' ? '#22c55e' : s === 'error' ? '#ef4444' : s === 'idle' ? '#eab308' : MUTED;

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 as any });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Current state */}
      <div style={{ background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>État courant</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor(current.state), display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${stateColor(current.state)}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: stateColor(current.state) }}>{current.state}</span>
        </div>
        {current.sessionId && (
          <div style={{ marginTop: 8, fontSize: 11, color: MUTED }}>
            Session{': '}
            <span style={{ color: ACCENT, fontFamily: 'monospace' }}>{current.sessionId}</span>
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 10, color: MUTED }}>mis à jour : {fmt(current.ts)}</div>
      </div>

      {/* History */}
      <div style={{ background: SURFACE, borderRadius: 10, padding: 14, border: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
          Historique des transitions ({history.length})
        </div>
        {history.length === 0 && (
          <div style={{ fontSize: 12, color: MUTED }}>Aucune transition enregistrée.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...history].reverse().map((snap, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '8px 10px', background: SURFACE_ALT, borderRadius: 8 }}>
              <span style={{ color: MUTED, flexShrink: 0, width: 80 }}>{fmt(snap.ts)}</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: stateColor(snap.state), display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color: TEXT }}>{snap.state}</span>
              {snap.sessionId && <span style={{ color: MUTED, fontFamily: 'monospace', fontSize: 10 }}>{snap.sessionId.slice(0, 8)}…</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
