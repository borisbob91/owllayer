import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, StatusData } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

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

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{value}</div>
    </div>
  );
}

interface StatusPageProps {
  api: ApiClient;
}

export function StatusPage({ api }: StatusPageProps) {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api.getStatus().then(setStatus).catch(e => setError((e as Error).message));
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [api]);

  if (error) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8, padding: 16, color: '#ef4444',
      }}>
        Erreur : {error}
      </div>
    );
  }

  if (!status) {
    return <div style={{ color: MUTED }}>Chargement...</div>;
  }

  const cards = [
    { label: 'Uptime',               value: formatUptime(status.uptime) },
    { label: 'Version',              value: status.version },
    { label: 'Sessions actives',     value: String(status.activeSessions) },
    { label: 'Connexions actives',   value: String(status.activeConnections) },
    { label: 'Tools serveur',        value: String(status.serverTools.length) },
    { label: 'Tool calls en attente',value: String(status.pendingToolCalls) },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>
        Status du serveur
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
        marginBottom: 28,
      }}>
        {cards.map(c => <Card key={c.label} label={c.label} value={c.value} />)}
      </div>

      {status.serverTools.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tools serveur
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {status.serverTools.map(tool => (
              <span key={tool} style={{
                padding: '3px 10px',
                background: 'rgba(99,102,241,0.15)',
                border: `1px solid rgba(99,102,241,0.3)`,
                borderRadius: 99,
                fontSize: 12,
                fontFamily: 'monospace',
                color: ACCENT,
              }}>
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
