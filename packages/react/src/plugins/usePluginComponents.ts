import type { ComponentType } from 'react';
import type { OwlLayerClientPlugin } from '@owllayer/core';

/**
 * usePluginComponents — Recuperer les composants React declares par un plugin.
 *
 * Retourne la carte de composants UI du plugin, typee selon T.
 * Lecture pure — aucun effet de bord, aucun re-render declenche.
 *
 * @example
 * ```tsx
 * import { usePluginComponents } from '@owllayer/react';
 * import { BarChartReactPlugin } from '@owllayer-plugins/bar-chart/react';
 * import type { FC } from 'react';
 *
 * function Dashboard() {
 *   const { BarChart } = usePluginComponents<{ BarChart: FC<BarChartProps> }>(BarChartReactPlugin);
 *   if (!BarChart) return null;
 *   return <BarChart data={salesData} title="Ventes" />;
 * }
 * ```
 */
export function usePluginComponents<T extends Record<string, ComponentType<any>>>(
  plugin: OwlLayerClientPlugin<any>,
): Partial<T> {
  return (plugin.ui?.components ?? {}) as Partial<T>;
}
