import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, LinePoolData, LineAcquireResponse } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';
const GREEN = '#22c55e';
const YELLOW = '#eab308';

interface AcquiredToken {
  token: string;
  lineNumber: string;
  waiting: boolean;
  acquiredAt: number;
}

interface LinesPageProps {
  api: ApiClient;
}

export function LinesPage({ api }: LinesPageProps) {
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

  const handleAcquire = async (apiKey: string) => {
    try {
      const result = await api.acquireLine(apiKey);
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

  if (!enabled) {
    return (
      <div style={{ color: TEXT }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px' }}>Virtual Lines</h2>
        <p style={{ color: MUTED, fontSize: 13 }}>Les virtual lines ne sont pas activées sur ce serveur.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: '#ef4444' }}>
        Erreur : {error}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>Virtual Lines</h2>

      {pools.map(pool => (
        <div key={pool.apiKey} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 13, color: ACCENT }}>{pool.apiKey}</span>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ color: GREEN }}>{pool.available} disponibles</span>
              <span style={{ color: YELLOW }}>{pool.busy} occupées</span>
              <span style={{ color: MUTED }}>{pool.total} total</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {pool.lines.map(line => (
              <span key={line.id} style={{
                padding: '3px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'monospace',
                background: line.state === 'available' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                border: `1px solid ${line.state === 'available' ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`,
                color: line.state === 'available' ? GREEN : YELLOW,
              }}>
                {line.number}
              </span>
            ))}
          </div>

          <button
            onClick={() => handleAcquire(pool.apiKey)}
            disabled={pool.available === 0}
            style={{
              padding: '6px 14px',
              background: ACCENT,
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              cursor: pool.available === 0 ? 'not-allowed' : 'pointer',
              opacity: pool.available === 0 ? 0.4 : 1,
            }}
          >
            Acquérir une ligne
          </button>
        </div>
      ))}

      {/* Acquired tokens */}
      {tokens.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>Lignes acquises</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tokens.map(t => (
              <div key={t.token} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ fontSize: 12 }}>
                  <span style={{ color: ACCENT, fontFamily: 'monospace' }}>Ligne {t.lineNumber}</span>
                  {t.waiting && <span style={{ color: YELLOW, marginLeft: 8 }}>(en attente)</span>}
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
                  Libérer
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
            ? `Ligne ${lastResult.lineNumber} acquise${lastResult.waiting ? ' (mode attente)' : ''}`
            : `Erreur : ${lastResult.error}`}
        </div>
      )}
    </div>
  );
}
