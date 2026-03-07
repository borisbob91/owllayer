import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api, type MetricsData } from '../api';

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981'];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      api.getMetrics().then(setMetrics).catch(e => setError(e.message));
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

  if (!metrics) {
    return <div className="text-gray-400">Chargement...</div>;
  }

  const g = metrics.global;

  // Donnees pour le bar chart
  const barData = [
    { name: 'Sessions', value: g.totalSessions },
    { name: 'Actives', value: g.activeSessions },
    { name: 'Messages', value: g.totalMessages },
    { name: 'Tool calls', value: g.totalToolCalls },
    { name: 'Erreurs', value: g.errors },
  ];

  // Donnees pour le pie chart (tokens in/out)
  const tokenData = [
    { name: 'Tokens in', value: g.totalTokensIn },
    { name: 'Tokens out', value: g.totalTokensOut },
  ];
  const hasTokens = g.totalTokensIn > 0 || g.totalTokensOut > 0;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Metriques</h2>

      {/* Cartes resume */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sessions totales', value: g.totalSessions },
          { label: 'Sessions actives', value: g.activeSessions },
          { label: 'Messages', value: g.totalMessages },
          { label: 'Tool calls', value: g.totalToolCalls },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {card.label}
            </div>
            <div className="text-2xl font-bold text-white">
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar chart — Vue d'ensemble */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Vue d'ensemble</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#e5e7eb',
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — Tokens */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Repartition tokens</h3>
          {hasTokens ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={tokenData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="#22d3ee" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#e5e7eb',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-500 text-sm">
              Pas de donnees de tokens
            </div>
          )}
        </div>
      </div>

      {/* Erreurs */}
      {g.errors > 0 && (
        <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg p-4">
          <span className="text-red-300 font-medium">{g.errors}</span>
          <span className="text-red-400 ml-2">erreur(s) enregistree(s)</span>
        </div>
      )}
    </div>
  );
}
