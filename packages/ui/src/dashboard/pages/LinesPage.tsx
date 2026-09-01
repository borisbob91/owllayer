import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, LinePoolData, LineAcquireResponse } from '../api.js';
import { t } from '../i18n/index.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const GREEN = '#22c55e';
const YELLOW = '#eab308';
const RED = '#ef4444';

interface AcquiredToken {
  token: string;
  lineNumber: string;
  waiting: boolean;
  acquiredAt: number;
}

interface LinesPageProps {
  api: ApiClient;
}

function formatRemaining(expiresAt: number | null): string {
  if (!expiresAt) return '';
  const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function LinesPage({ api }: LinesPageProps) {
  const strings = t();
  const [pools, setPools] = useState<LinePoolData[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AcquiredToken[]>([]);
  const [lastResult, setLastResult] = useState<LineAcquireResponse | null>(null);

  const fetchLines = () => {
    api.getLines()
      .then(data => { setPools(data.pools); setEnabled(data.enabled); setError(null); })
      .catch(err => setError((err as Error).message));
  };

  useEffect(() => {
    fetchLines();
    const id = setInterval(fetchLines, 5000);
    return () => clearInterval(id);
  }, [api]);

  const handleAcquire = async (keyRef: string) => {
    try {
      const result = await api.acquireLine(keyRef);
      setLastResult(result);
      if (result.success && result.token && result.lineNumber) {
        setTokens(prev => [...prev, { token: result.token!, lineNumber: result.lineNumber!, waiting: result.waiting ?? false, acquiredAt: Date.now() }]);
      }
      fetchLines();
    } catch (err) {
      setLastResult({ success: false, error: (err as Error).message });
    }
  };

  const handleRelease = async (lineToken: string) => {
    try {
      await api.releaseLine(lineToken);
      setTokens(prev => prev.filter(t => t.token !== lineToken));
      fetchLines();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleForceRelease = async (keyRef: string, lineId: string) => {
    try {
      await api.forceReleaseLine(keyRef, lineId);
      fetchLines();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!enabled) {
    return (
      <div style={{ color: TEXT }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>{strings.lines.title}</h2>
        <p style={{ color: MUTED, fontSize: 13 }}>{strings.lines.disabled}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: '#ef4444' }}>
        {strings.common.error} : {error}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>{strings.lines.title}</h2>

      {pools.map(pool => (
        <div key={pool.keyId} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, color: ACCENT }}>{pool.apiKey}</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: GREEN }}>{pool.available} {strings.lines.available.toLowerCase()}</span>
              <span style={{ color: YELLOW }}>{pool.busy} {strings.lines.busy.toLowerCase()}</span>
              <span style={{ color: MUTED }}>{pool.total} {strings.lines.total.toLowerCase()}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 12 }}>
            {[...pool.lines, pool.waitingLine].map(line => (
              <div key={line.id} style={{
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 11,
                background: line.state === 'available' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${line.state === 'available' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
                color: line.state === 'available' ? GREEN : YELLOW,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace' }}>{line.number}</span>
                  <span>{line.state}</span>
                </div>
                {line.sessionId && (
                  <div style={{ marginTop: 4, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {line.sessionId}
                  </div>
                )}
                {line.expiresAt && (
                  <div style={{ marginTop: 4, color: MUTED }}>TTL {formatRemaining(line.expiresAt)}</div>
                )}
                {line.state !== 'available' && (
                  <button
                    onClick={() => handleForceRelease(pool.keyId, line.id)}
                    style={{ marginTop: 6, padding: '3px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: RED, fontSize: 10, cursor: 'pointer' }}
                  >
                    {strings.lines.forceRelease}
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => handleAcquire(pool.keyId)}
            disabled={!(pool.available > 0 || pool.waitingLine.state === 'available')}
            style={{
              padding: '6px 14px',
              background: ACCENT,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              cursor: !(pool.available > 0 || pool.waitingLine.state === 'available') ? 'not-allowed' : 'pointer',
              opacity: !(pool.available > 0 || pool.waitingLine.state === 'available') ? 0.4 : 1,
            }}
          >
            {strings.lines.acquireLine}
          </button>
        </div>
      ))}

      {/* Acquired tokens */}
      {tokens.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{strings.lines.title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tokens.map(t => (
              <div key={t.token} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: ACCENT, fontFamily: 'monospace' }}>Line {t.lineNumber}</span>
                  {t.waiting && <span style={{ color: YELLOW, marginLeft: 8 }}>(waiting)</span>}
                  <span style={{ color: MUTED, marginLeft: 12 }}>
                    {new Date(t.acquiredAt).toLocaleTimeString()}
                  </span>
                </div>
                <button
                  onClick={() => handleRelease(t.token)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 5,
                    color: '#ef4444',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {strings.lines.releaseLine}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last result */}
      {lastResult && (
        <div style={{
          marginTop: 14,
          padding: '8px 14px',
          borderRadius: 6,
          fontSize: 12,
          background: lastResult.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${lastResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: lastResult.success ? GREEN : '#ef4444',
        }}>
          {lastResult.success
            ? `Line ${lastResult.lineNumber} ${strings.lines.acquireLine.toLowerCase()}`
            : `${strings.common.error} : ${lastResult.error}`}
        </div>
      )}
    </div>
  );
}
