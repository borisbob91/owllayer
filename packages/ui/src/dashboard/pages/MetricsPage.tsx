import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, MetricsData } from '../api.js';
import { MetricsChart } from '../components/MetricsChart.js';
import { t, getDashboardLanguage } from '../i18n/index.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

interface MetricsPageProps {
  api: ApiClient;
}

export function MetricsPage({ api }: MetricsPageProps) {
  const strings = t();
  const lang = getDashboardLanguage();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ ts: number; data: MetricsData['global'] }[]>([]);

  useEffect(() => {
    const load = () => {
      api.getMetrics().then(data => {
        setMetrics(data);
        setHistory(prev => {
          const next = [...prev, { ts: Date.now(), data: data.global }].slice(-20);
          return next;
        });
      }).catch(e => setError((e as Error).message));
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [api]);

  if (error) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 16, color: '#ef4444' }}>
        {strings.common.error} : {error}
      </div>
    );
  }

  if (!metrics) return <div style={{ color: MUTED }}>{strings.metrics.loading}</div>;

  const g = metrics.global;

  const toChartData = (key: keyof MetricsData['global']) =>
    history.map(h => ({
      label: new Date(h.ts).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: h.data[key] as number,
    }));

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>{strings.metrics.title}</h2>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        {[
          { label: strings.sessions.title,  value: g.totalSessions },
          { label: strings.status.activeSessions,  value: g.activeSessions },
          { label: strings.sessions.messages,          value: g.totalMessages },
          { label: strings.sessions.toolCalls,        value: g.totalToolCalls },
          { label: strings.sessionDetail.inputTokens,         value: g.totalTokensIn },
          { label: strings.sessionDetail.outputTokens,        value: g.totalTokensOut },
          { label: strings.common.error,           value: g.errors },
        ].map(card => (
          <div key={card.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {history.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
          <MetricsChart title={strings.status.activeSessions} data={toChartData('activeSessions')} color="#6366f1" />
          <MetricsChart title={strings.sessions.messages} data={toChartData('totalMessages')} color="#22d3ee" />
          <MetricsChart title={strings.sessions.toolCalls} data={toChartData('totalToolCalls')} color="#f59e0b" />
          <MetricsChart title={strings.common.error} data={toChartData('errors')} color="#ef4444" />
        </div>
      )}

      {history.length < 2 && (
        <p style={{ color: MUTED, fontSize: 12 }}>{strings.metrics.loading}</p>
      )}
    </div>
  );
}
