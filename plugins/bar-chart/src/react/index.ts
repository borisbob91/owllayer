import { BarChartPlugin } from '../index.js';
import { BarChart } from './BarChart.js';

export type { BarChartConfig } from '../index.js';
export type { BarChartProps, BarChartDataPoint } from './BarChart.js';
export { BarChart };

/**
 * BarChartReactPlugin — plugin OwlLayer avec composant React integre.
 *
 * Etend BarChartPlugin (framework-agnostic) en ajoutant le composant React
 * dans ui.components. A utiliser avec OwlLayerProvider plugins={} et
 * usePluginComponents<{ BarChart: typeof BarChart }>(BarChartReactPlugin).
 *
 * @example
 * ```tsx
 * // Installation
 * const DEMO_PLUGINS = [
 *   [BarChartReactPlugin, { theme: 'dark', color: '#7c3aed' }],
 * ] as const;
 *
 * // Usage composant
 * const { BarChart } = usePluginComponents<{ BarChart: FC<BarChartProps> }>(BarChartReactPlugin);
 * <BarChart data={[{ label: 'Jan', value: 1200 }]} title="Ventes" />
 * ```
 */
export const BarChartReactPlugin = {
  ...BarChartPlugin,
  ui: {
    components: { BarChart },
  },
};
