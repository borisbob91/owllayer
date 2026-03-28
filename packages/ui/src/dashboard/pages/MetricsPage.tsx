import { useState, useEffect } from 'preact/hooks';
import type { ApiClient, MetricsData } from '../api.js';
import { MetricsChart } from '../components/MetricsChart.js';

const SURFACE = '#1a1a24';
const BORDER = '#2a2a3a';
const TEXT = '#e5e5e5';
const MUTED = '#666680';

interface MetricsPageProps {
  api: ApiClient;
}

export function MetricsPage({ api }: MetricsPageProps) {
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
        Erreur : {error}
      </div>
    );
  }

  if (!metrics) return <div style={{ color: MUTED }}>Chargement...</div>;

  const g = metrics.global;

  const toChartData = (key: keyof MetricsData['global']) =>
    history.map(h => ({
      label: new Date(h.ts).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: h.data[key] as number,
    }));

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 20px' }}>Métriques</h2>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Sessions totales',  value: g.totalSessions },
          { label: 'Sessions actives',  value: g.activeSessions },
          { label: 'Messages',          value: g.totalMessages },
          { label: 'Tool calls',        value: g.totalToolCalls },
          { label: 'Tokens in',         value: g.totalTokensIn },
          { label: 'Tokens out',        value: g.totalTokensOut },
          { label: 'Erreurs',           value: g.errors },
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

      {/* Charts (visible une fois qu'on a >= 2 points) */}
      {history.length >= 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
          <MetricsChart title="Sessions actives" data={toChartData('activeSessions')} color="#6366f1" />
          <MetricsChart title="Messages" data={toChartData('totalMessages')} color="#22d3ee" />
          <MetricsChart title="Tool calls" data={toChartData('totalToolCalls')} color="#f59e0b" />
          <MetricsChart title="Erreurs" data={toChartData('errors')} color="#ef4444" />
        </div>
      )}

      {history.length < 2 && (
        <p style={{ color: MUTED, fontSize: 12 }}>Collecte des données... (rafraîchissement toutes les 5s)</p>
      )}
    </div>
  );
}
