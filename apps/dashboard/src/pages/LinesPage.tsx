import { useState, useEffect } from 'react';
import { api, type LineData, type LinePoolData, type LineAcquireResponse } from '../api';

interface AcquiredToken {
  token: string;
  lineNumber: string;
  waiting: boolean;
  acquiredAt: number;
}

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatDuration(ms: number): string {
  if (ms < 0) return 'expiré';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function StateIndicator({ state }: { state: string }) {
  const map: Record<string, { dot: string; text: string; label: string }> = {
    available: { dot: 'bg-green-500', text: 'text-green-400', label: 'Disponible' },
    busy: { dot: 'bg-red-500', text: 'text-red-400', label: 'Occupée' },
    waiting: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Attente' },
  };
  const c = map[state] ?? { dot: 'bg-gray-500', text: 'text-gray-400', label: state };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}

function LineBadge({ line }: { line: LineData }) {
  const stateClasses: Record<string, string> = {
    available: 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20',
    busy: 'bg-red-500/10 border-red-500/30 text-red-400',
    waiting: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  };
  const cls = stateClasses[line.state] ?? 'bg-gray-800 border-gray-700 text-gray-400';
  return (
    <span
      title={line.sessionId ? `Session: ${line.sessionId}` : line.state}
      className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-mono transition-colors ${cls}`}
    >
      {line.number}
    </span>
  );
}

// Normalize pool data so LineData always has non-null id
function normalizePools(pools: LinePoolData[]) {
  return pools.map(p => ({
    ...p,
    lines: p.lines.map(l => ({ ...l, id: l.id ?? l.number })),
  }));
}

export default function LinesPage() {
  const [pools, setPools] = useState<ReturnType<typeof normalizePools>>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AcquiredToken[]>([]);
  const [lastResult, setLastResult] = useState<LineAcquireResponse | null>(null);
  const now = useNow();

  const fetchLines = () => {
    api.getLines()
      .then(data => {
        setPools(normalizePools(data.pools));
        setEnabled(data.enabled);
        setError(null);
      })
      .catch(err => setError((err as Error).message));
  };

  useEffect(() => {
    fetchLines();
    const interval = setInterval(fetchLines, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcquire = async (apiKey: string) => {
    try {
      const result = await api.acquireLine(apiKey);
      setLastResult(result);
      if (result.success && result.token && result.lineNumber) {
        setTokens(prev => [...prev, {
          token: result.token!,
          lineNumber: result.lineNumber!,
          waiting: result.waiting || false,
          acquiredAt: Date.now(),
        }]);
      }
      fetchLines();
    } catch (err) {
      setLastResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleRelease = async (token: string) => {
    try {
      await api.releaseLine(token);
      setTokens(prev => prev.filter(t => t.token !== token));
      fetchLines();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleReleaseAll = async () => {
    for (const t of tokens) {
      await api.releaseLine(t.token);
    }
    setTokens([]);
    fetchLines();
  };

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
        Erreur : {error}
      </div>
    );
  }

  if (!enabled) {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Virtual Lines</h2>
        <p className="text-gray-400">Les virtual lines ne sont pas activées sur ce serveur.</p>
        <p className="mt-2 text-sm text-gray-500">
          Ajoutez <code className="bg-gray-800 px-1 rounded text-indigo-300">virtualLines</code> dans la configuration du serveur.
        </p>
      </div>
    );
  }

  const totalAvailable = pools.reduce((s, p) => s + p.available, 0);
  const totalBusy = pools.reduce((s, p) => s + p.busy, 0);
  const totalLines = pools.reduce((s, p) => s + p.total, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Virtual Lines</h2>
          <p className="text-xs text-gray-500 mt-0.5">Refresh toutes les 5s</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {totalAvailable} disponibles
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-md text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {totalBusy} occupées
          </span>
          <span className="text-gray-500">{totalLines} total</span>
        </div>
      </div>

      {/* Last result banner */}
      {lastResult && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
          lastResult.success
            ? 'bg-green-900/20 border-green-500/30 text-green-400'
            : 'bg-red-900/20 border-red-500/30 text-red-400'
        }`}>
          {lastResult.success
            ? `Ligne ${lastResult.lineNumber} acquise${lastResult.waiting ? ' (mode attente)' : ''}`
            : lastResult.error}
        </div>
      )}

      {/* Pool cards */}
      {pools.map(pool => (
        <div key={pool.apiKey} className="mb-6 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {/* Pool header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-indigo-400 font-semibold">{pool.apiKey}</span>
              <span className="text-xs text-green-400">{pool.available} dispo</span>
              <span className="text-xs text-red-400">{pool.busy} occupées</span>
              <span className="text-xs text-gray-500">/ {pool.total}</span>
            </div>
            <button
              onClick={() => handleAcquire(pool.apiKey)}
              disabled={pool.available === 0}
              className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
              Acquérir une ligne
            </button>
          </div>

          <div className="p-4">
            {/* Slot badge grid */}
            <div className="flex flex-wrap gap-2 mb-4">
              {pool.lines.map(line => (
                <LineBadge key={line.id} line={line} />
              ))}
              <span
                title="Ligne d'attente"
                className="inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-mono bg-yellow-500/5 border-yellow-500/20 text-yellow-500/60"
              >
                {pool.waitingLine.number} ↩
              </span>
            </div>

            {/* Occupancy bar */}
            <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pool.total > 0 ? (pool.busy / pool.total) * 100 : 0}%` }}
              />
            </div>

            {/* Lines table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-700">
                  <th className="text-left py-2 px-1">Ligne</th>
                  <th className="text-left py-2 px-1">État</th>
                  <th className="text-left py-2 px-1">Session</th>
                  <th className="text-left py-2 px-1">Occupée depuis</th>
                  <th className="text-left py-2 px-1">Expire dans</th>
                </tr>
              </thead>
              <tbody>
                {pool.lines.map(line => (
                  <tr key={line.id} className={`border-b border-gray-700/40 ${line.state === 'busy' ? 'bg-red-500/5' : ''}`}>
                    <td className="py-2 px-1 font-mono text-white">{line.number}</td>
                    <td className="py-2 px-1">
                      <StateIndicator state={line.state} />
                    </td>
                    <td className="py-2 px-1 text-gray-400 font-mono text-xs">
                      {line.sessionId ? line.sessionId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="py-2 px-1 text-gray-400 tabular-nums">
                      {line.busySince ? formatDuration(now - line.busySince) : '—'}
                    </td>
                    <td className={`py-2 px-1 tabular-nums ${line.expiresAt && line.expiresAt - now < 10000 ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>
                      {line.expiresAt ? formatDuration(line.expiresAt - now) : '—'}
                    </td>
                  </tr>
                ))}
                {/* Waiting line row */}
                <tr className="border-t border-dashed border-gray-600">
                  <td className="py-2 px-1 font-mono text-yellow-400/70 text-xs">{pool.waitingLine.number}</td>
                  <td className="py-2 px-1">
                    <StateIndicator state={pool.waitingLine.state} />
                  </td>
                  <td className="py-2 px-1 text-gray-500 font-mono text-xs">
                    {pool.waitingLine.sessionId?.slice(0, 8) + '…' || '—'}
                  </td>
                  <td className="py-2 px-1 text-yellow-400/50 text-xs" colSpan={2}>
                    ligne d'attente
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {pools.length === 0 && (
        <p className="text-gray-500 text-sm">Aucun pool configuré.</p>
      )}

      {/* Acquired tokens section */}
      {tokens.length > 0 && (
        <div className="mt-6 bg-gray-800 border border-indigo-500/20 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-indigo-400">
              Lignes acquises <span className="ml-1 text-xs text-gray-500 font-normal">({tokens.length})</span>
            </h3>
            <button
              onClick={handleReleaseAll}
              className="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Tout libérer
            </button>
          </div>
          <div className="divide-y divide-gray-700/50">
            {tokens.map(t => (
              <div key={t.token} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white font-mono">Ligne {t.lineNumber}</span>
                  {t.waiting && (
                    <span className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-1.5 py-0.5 rounded">
                      attente
                    </span>
                  )}
                  <span className="text-xs text-gray-500 tabular-nums">
                    {formatDuration(now - t.acquiredAt)} tenue
                  </span>
                  <code className="text-xs text-gray-600 hidden sm:inline">{t.token.slice(0, 12)}…</code>
                </div>
                <button
                  onClick={() => handleRelease(t.token)}
                  className="px-2.5 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded transition-colors"
                >
                  Libérer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
