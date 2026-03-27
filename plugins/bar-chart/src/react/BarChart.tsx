import { useAgentTool } from '@domos/react';
import type { BarChartConfig } from '../index.js';
import { z } from 'zod';

// ============================================================
// Types
// ============================================================

export interface BarChartDataPoint {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  title?: string;
  color?: string;
  theme?: 'dark' | 'light';
  height?: number;
}

// ============================================================
// BarChart React Component
// ============================================================

/**
 * BarChart — composant graphique en barres avec tool LLM integre.
 *
 * Au montage, enregistre automatiquement le tool 'render_chart' via useAgentTool.
 * Le LLM peut appeler ce tool pour mettre a jour les donnees du graphique.
 * Au demontage, le tool est automatiquement desinstalle.
 *
 * @example
 * ```tsx
 * const { BarChart } = usePluginComponents<{ BarChart: typeof BarChart }>(BarChartReactPlugin);
 * <BarChart data={[{ label: 'Jan', value: 1200 }]} title="Ventes" />
 * ```
 */
export function BarChart({ data, title, color = '#7c3aed', theme = 'dark', height = 180 }: BarChartProps) {
  const [chartData, setChartData] = React.useState<BarChartDataPoint[]>(data);

  // Synchroniser si les props data changent depuis l'exterieur
  React.useEffect(() => { setChartData(data); }, [data]);

  // Enregistrer le tool render_chart — actif uniquement quand ce composant est monte
  useAgentTool<{ data: { label: string; value: number }[]; title?: string }>(
    {
      name: '@domos-plugins/bar-chart/render_chart',
      description:
        'Mettre a jour le graphique en barres avec de nouvelles donnees. ' +
        'Chaque point a un label (string) et une valeur numerique.',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: z.object({
        data: z
          .array(
            z.object({
              label: z.string().describe('Etiquette de la barre (ex: "Jan", "Q1", "Paris")'),
              value: z.number().describe('Valeur numerique de la barre'),
            }),
          )
          .min(1)
          .describe('Tableau de donnees du graphique'),
        title: z.string().optional().describe('Titre du graphique (optionnel)'),
      }) as any,
      risk: 'none',
    },
    ({ data: newData, title: newTitle }) => {
      setChartData(newData);
      if (newTitle) setTitle(newTitle);
      return { success: true, message: `Graphique mis a jour avec ${newData.length} barres.` };
    },
  );

  const [chartTitle, setTitle] = React.useState(title ?? '');

  const max = Math.max(...chartData.map(d => d.value), 1);
  const isDark = theme === 'dark';

  const containerStyle: React.CSSProperties = {
    background: isDark ? '#1a1a2e' : '#f8fafc',
    borderRadius: '10px',
    padding: '16px',
    fontFamily: 'system-ui, sans-serif',
    border: `1px solid ${isDark ? '#2d3748' : '#e2e8f0'}`,
  };

  const titleStyle: React.CSSProperties = {
    color: isDark ? '#e2e8f0' : '#1e293b',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
  };

  const barsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
    height: `${height}px`,
  };

  return (
    <div style={containerStyle}>
      {chartTitle && <div style={titleStyle}>{chartTitle}</div>}
      <div style={barsStyle}>
        {chartData.map((point, i) => {
          const pct = (point.value / max) * 100;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: '10px' }}>
                {point.value}
              </span>
              <div
                style={{
                  width: '100%',
                  height: `${pct}%`,
                  background: color,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                  transition: 'height 0.3s ease',
                }}
              />
              <span
                style={{
                  color: isDark ? '#9ca3af' : '#64748b',
                  fontSize: '11px',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                }}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
