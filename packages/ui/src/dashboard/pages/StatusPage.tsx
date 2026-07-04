import { useState, useEffect } from 'preact/hooks';
import type { AdminEventEntry, ApiClient, StatusData } from '../api.js';

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
  const [events, setEvents] = useState<AdminEventEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      api.getStatus().then(setStatus).catch(e => setError((e as Error).message));
      api.getEvents().then(data => setEvents(data.events)).catch(() => {});
    };
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

      {status.activeAgents && status.activeAgents.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Agents actifs
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {status.activeAgents.map(agent => (
              <div key={agent.keyId} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 700 }}>{agent.agentName}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: MUTED }}>
                  {agent.sessions} session{agent.sessions !== 1 ? 's' : ''} · {agent.apiKeyName ?? agent.apiKey}
                </div>
                {agent.currentUrl && (
                  <div style={{ marginTop: 4, fontSize: 11, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.currentUrl}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Evenements admin
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.slice(0, 8).map(event => (
              <div key={event.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: TEXT, fontSize: 12 }}>{event.message}</span>
                  <span style={{ color: MUTED, fontSize: 11, flexShrink: 0 }}>{new Date(event.at).toLocaleTimeString()}</span>
                </div>
                <div style={{ marginTop: 3, color: MUTED, fontSize: 11 }}>{event.type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
