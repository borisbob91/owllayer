import { useState, useEffect } from 'react';
import { api, type LinePoolData, type LineAcquireResponse } from '../api';

interface AcquiredToken {
  token: string;
  lineNumber: string;
  waiting: boolean;
  acquiredAt: number;
}

export default function LinesPage() {
  const [pools, setPools] = useState<LinePoolData[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AcquiredToken[]>([]);
  const [lastResult, setLastResult] = useState<LineAcquireResponse | null>(null);

  const fetchLines = () => {
    api.getLines()
      .then(data => {
        setPools(data.pools);
        setEnabled(data.enabled);
        setError(null);
      })
      .catch(err => setError(err.message));
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
    return <div className="text-red-400">Erreur: {error}</div>;
  }

  if (!enabled) {
    return (
      <div className="text-gray-400">
        <h2 className="text-xl font-bold text-white mb-4">Virtual Lines</h2>
        <p>Les virtual lines ne sont pas activees sur ce serveur.</p>
        <p className="mt-2 text-sm">
          Ajoutez <code className="bg-gray-800 px-1 rounded">virtualLines</code> dans la configuration du serveur.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">Virtual Lines</h2>

      {/* Tokens acquis (dev tools) */}
      {tokens.length > 0 && (
        <div className="mb-6 bg-gray-800 border border-indigo-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-indigo-400">Tokens acquis (dev)</h3>
            <button
              onClick={handleReleaseAll}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Tout liberer
            </button>
          </div>
          <div className="space-y-2">
            {tokens.map(t => (
              <div key={t.token} className="flex items-center justify-between bg-gray-900 rounded px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white text-sm">{t.lineNumber}</span>
                  {t.waiting && (
                    <span className="text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded">attente</span>
                  )}
                  <code className="text-xs text-gray-500">{t.token}</code>
                </div>
                <button
                  onClick={() => handleRelease(t.token)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  Liberer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dernier resultat */}
      {lastResult && !lastResult.success && (
        <div className="mb-4 bg-red-900/30 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {lastResult.error}
        </div>
      )}

      {pools.map(pool => (
        <div key={pool.apiKey} className="mb-8 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">
              {pool.apiKey}
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex gap-3 text-sm">
                <span className="text-green-400">{pool.available} disponible(s)</span>
                <span className="text-red-400">{pool.busy} occupee(s)</span>
                <span className="text-gray-400">/ {pool.total} total</span>
              </div>
              <button
                onClick={() => handleAcquire(pool.apiKey)}
                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
              >
                Acquire
              </button>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${pool.total > 0 ? (pool.busy / pool.total) * 100 : 0}%` }}
            />
          </div>

          {/* Tableau des lignes */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2 px-2">Numero</th>
                <th className="text-left py-2 px-2">Etat</th>
                <th className="text-left py-2 px-2">Session</th>
                <th className="text-left py-2 px-2">Occupee depuis</th>
                <th className="text-left py-2 px-2">Expire</th>
              </tr>
            </thead>
            <tbody>
              {pool.lines.map(line => (
                <tr key={line.id} className="border-b border-gray-700/50">
                  <td className="py-2 px-2 font-mono text-white">{line.number}</td>
                  <td className="py-2 px-2">
                    <StateIndicator state={line.state} />
                  </td>
                  <td className="py-2 px-2 text-gray-400 font-mono text-xs">
                    {line.sessionId || '—'}
                  </td>
                  <td className="py-2 px-2 text-gray-400">
                    {line.busySince ? formatDuration(Date.now() - line.busySince) : '—'}
                  </td>
                  <td className="py-2 px-2 text-gray-400">
                    {line.expiresAt ? formatDuration(line.expiresAt - Date.now()) : '—'}
                  </td>
                </tr>
              ))}
              {/* Ligne d'attente */}
              <tr className="border-t border-gray-600">
                <td className="py-2 px-2 font-mono text-yellow-300">{pool.waitingLine.number}</td>
                <td className="py-2 px-2">
                  <StateIndicator state={pool.waitingLine.state} />
                </td>
                <td className="py-2 px-2 text-gray-400 font-mono text-xs">
                  {pool.waitingLine.sessionId || '—'}
                </td>
                <td className="py-2 px-2 text-yellow-300/60 text-xs" colSpan={2}>
                  Ligne d'attente
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {pools.length === 0 && (
        <p className="text-gray-400">Aucun pool configure.</p>
      )}
    </div>
  );
}

function StateIndicator({ state }: { state: string }) {
  const colors: Record<string, string> = {
    available: 'bg-green-500',
    busy: 'bg-red-500',
    waiting: 'bg-yellow-500',
  };

  const labels: Record<string, string> = {
    available: 'Disponible',
    busy: 'Occupee',
    waiting: 'Attente',
  };

  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[state] || 'bg-gray-500'}`} />
      <span className={state === 'available' ? 'text-green-400' : state === 'busy' ? 'text-red-400' : 'text-yellow-400'}>
        {labels[state] || state}
      </span>
    </span>
  );
}

function formatDuration(ms: number): string {
  if (ms < 0) return 'expire';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}
