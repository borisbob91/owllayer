import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, BridgeStatsData, SessionDetail } from '../api.js';
import { ToolCallTimeline } from '../components/ToolCallTimeline.js';
import { t } from '../i18n/index.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const ACCENT = '#6366f1';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

type Tab = 'conversation' | 'tools' | 'graph';

interface SessionDetailPageProps {
  api: ApiClient;
  id: string;
}

export function SessionDetailPage({ api, id }: SessionDetailPageProps) {
  const strings = t();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [bridge, setBridge] = useState<BridgeStatsData | null>(null);
  const [tab, setTab] = useState<Tab>('conversation');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = () => {
      api.getSession(id).then(setSession).catch(e => setError((e as Error).message));
      api.getBridge().then(setBridge).catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [api, id]);

  const handleDelete = async () => {
    if (!confirm('Close this session?')) return;
    setDeleting(true);
    try {
      await api.deleteSession(id);
      window.location.hash = '#/sessions';
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: '#ef4444' }}>
        {strings.common.error} : {error}
      </div>
    );
  }

  if (!session) return <div style={{ color: MUTED }}>{strings.sessionDetail.loading}</div>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conversation', label: strings.sessionDetail.transcriptTab },
    { key: 'tools',        label: strings.sessionDetail.toolsTab },
    { key: 'graph',        label: strings.sessionDetail.graphTab },
  ];
  const visibleTools = session.effectiveTools ?? session.tools;
  const bridgeSession = bridge?.sessions.find(item => item.sessionId === session.id);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <a href="#/sessions" style={{ fontSize: 12, color: MUTED, textDecoration: 'none' }}>{strings.sessionDetail.backToSessions}</a>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '4px 0 2px' }}>
            {session.agentName ?? strings.sessions.session} <span style={{ color: ACCENT, fontFamily: 'monospace' }}>{session.id}</span>
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: MUTED }}>
            {strings.sessionDetail.status}: {session.state} — URL: {session.context.url || strings.common.na}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: MUTED }}>
            {strings.agents.apiKey}: {session.apiKeyName ?? session.apiKey} — {strings.agents.systemPrompt}: {session.promptSource ?? strings.common.none}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: '7px 14px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6,
            color: '#ef4444',
            fontSize: 12,
            cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.5 : 1,
          }}
        >
          {strings.sessions.ended}
        </button>
      </div>

      {bridge?.enabled && (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 12, color: MUTED, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {strings.status.livekitRooms}
          </h3>
          {bridgeSession ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 12 }}>
              <div>
                <div style={{ color: MUTED }}>{strings.status.roomName}</div>
                <div style={{ color: ACCENT, fontFamily: 'monospace' }}>{bridgeSession.roomName}</div>
              </div>
              <div>
                <div style={{ color: MUTED }}>{strings.status.participants}</div>
                <div style={{ color: TEXT, fontFamily: 'monospace' }}>{bridgeSession.agentIdentity}</div>
              </div>
              <div>
                <div style={{ color: MUTED }}>{strings.sessionDetail.startedAt}</div>
                <div style={{ color: TEXT }}>{new Date(bridgeSession.startedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{strings.status.emptyRooms}</p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${BORDER}`, marginBottom: 16 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: tab === t.key ? ACCENT : MUTED,
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Conversation */}
      {tab === 'conversation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 }}>
          {session.conversation.length === 0 ? (
            <p style={{ color: MUTED, fontSize: 13 }}>{strings.sessionDetail.noTranscript}</p>
          ) : session.conversation.map((msg, i) => (
            <div key={i} style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              background: msg.role === 'user'
                ? '#1e1e2e'
                : msg.role === 'assistant'
                ? 'rgba(99,102,241,0.1)'
                : SURFACE,
              border: msg.role === 'assistant' ? `1px solid rgba(99,102,241,0.2)` : `1px solid ${BORDER}`,
              color: msg.role === 'assistant' ? '#c7d2fe' : TEXT,
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', marginRight: 8 }}>
                {msg.role}
              </span>
              {msg.content}
            </div>
          ))}
        </div>
      )}

      {/* Tools */}
      {tab === 'tools' && (
        <div>
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
            {strings.tools.title} ({visibleTools.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {visibleTools.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13 }}>{strings.tools.noTools}</p>
            ) : visibleTools.map(tool => (
              <div key={tool.name} style={{
                background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: ACCENT }}>{tool.name}</span>
                {tool.risk && tool.risk !== 'none' && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: MUTED }}>{tool.risk}</span>
                )}
                {tool.description && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: MUTED }}>{tool.description}</p>
                )}
              </div>
            ))}
          </div>
          {session.ignoredClientTools && session.ignoredClientTools.length > 0 && (
            <>
              <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{strings.tools.clientTools}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {session.ignoredClientTools.map(tool => (
                  <div key={tool.name} style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 6, padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#fde047' }}>{tool.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{strings.sessionDetail.toolsTab}</h3>
          <ToolCallTimeline topTools={session.graph.topTools} />
        </div>
      )}

      {/* Graph */}
      {tab === 'graph' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{strings.metrics.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
              {[
                { label: strings.sessions.messages,   value: session.graph.metrics.totalMessages },
                { label: strings.sessions.toolCalls, value: session.graph.metrics.totalToolCalls },
                { label: strings.sessionDetail.inputTokens,  value: session.graph.metrics.totalTokensIn },
                { label: strings.sessionDetail.outputTokens, value: session.graph.metrics.totalTokensOut },
              ].map(m => (
                <div key={m.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: MUTED }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{m.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
              History ({session.graph.pageHistory.length})
            </h3>
            {session.graph.pageHistory.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 13 }}>{strings.common.none}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {session.graph.pageHistory.map((page, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                    <span style={{ color: MUTED, fontFamily: 'monospace', flexShrink: 0 }}>
                      {new Date(page.visitedAt).toLocaleTimeString()}
                    </span>
                    <span style={{ color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {page.url}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
