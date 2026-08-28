import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, SessionSummary } from '../api.js';
import { SessionCard } from '../components/SessionCard.js';
import { t } from '../i18n/index.js';

const TEXT = '#e5e5e5';
const MUTED = '#666680';

interface SessionsPageProps {
  api: ApiClient;
}

export function SessionsPage({ api }: SessionsPageProps) {
  const strings = t();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => api.getSessions().then(setSessions).catch(e => setError((e as Error).message));
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
        {strings.common.error} : {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: 0 }}>{strings.sessions.title}</h2>
        <span style={{ fontSize: 12, color: MUTED }}>{sessions.length} {strings.sessions.session}(s)</span>
      </div>

      {sessions.length === 0 ? (
        <p style={{ color: MUTED, fontSize: 13 }}>{strings.sessions.noSessions}</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}>
          {sessions.map(s => <SessionCard key={s.id} session={s} />)}
        </div>
      )}
    </div>
  );
}
