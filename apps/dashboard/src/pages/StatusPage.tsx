import { useState, useEffect } from 'react';
import { api, type StatusData } from '../api';

function formatUptime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}j ${h % 24}h ${min % 60}m`;
  if (h > 0) return `${h}h ${min % 60}m ${sec % 60}s`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      api.getStatus().then(setStatus).catch(e => setError(e.message));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-4">
        Erreur : {error}
      </div>
    );
  }

  if (!status) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  const cards = [
    { label: 'Uptime', value: formatUptime(status.uptime) },
    { label: 'Version', value: status.version },
    { label: 'Sessions actives', value: String(status.activeSessions) },
    { label: 'Connexions actives', value: String(status.activeConnections) },
    { label: 'Tools serveur', value: String(status.serverTools.length) },
    { label: 'Tool calls en attente', value: String(status.pendingToolCalls) },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Status du serveur</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map(card => (
          <div
            key={card.label}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4"
          >
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      {status.serverTools.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-2">Tools serveur</h3>
          <div className="flex flex-wrap gap-2">
            {status.serverTools.map(tool => (
              <span
                key={tool}
                className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-indigo-300"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
