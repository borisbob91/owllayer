import type { SessionSummary } from '../api.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

interface SessionCardProps {
  session: SessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  const duration = Date.now() - session.createdAt;
  const isActive = session.state === 'active';

  return (
    <a
      href={`#/sessions/${session.id}`}
      style={{
        display: 'block',
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 14,
        textDecoration: 'none',
        color: TEXT,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: ACCENT }}>{session.id}</span>
        <span style={{
          padding: '2px 8px',
          borderRadius: 99,
          fontSize: 11,
          fontWeight: 600,
          background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(100,100,120,0.2)',
          color: isActive ? '#22c55e' : MUTED,
        }}>
          {session.state}
        </span>
      </div>
      <div style={{ fontSize: 12, color: MUTED, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div>API Key: <span style={{ color: TEXT }}>{session.apiKey}</span></div>
        <div>Durée: <span style={{ color: TEXT }}>{formatDuration(duration)}</span></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span>{session.messageCount} messages</span>
          <span>{session.toolCallCount} tools</span>
        </div>
        {session.currentUrl && (
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.currentUrl}
          </div>
        )}
      </div>
    </a>
  );
}
