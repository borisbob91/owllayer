import type { OwlLayerClientPlugin } from '@owllayer/core';

/**
 * getPluginComponent — Recuperer un composant Svelte declare par un plugin.
 *
 * Fonction pure (pas de hook/store) — Svelte n'a pas de hook pattern.
 * Appeler au top-level du script ou dans onMount si besoin reactif.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 * import { getPluginComponent } from '@owllayer/svelte';
 * import { BarChartSveltePlugin } from '@owllayer-plugins/bar-chart/svelte';
 *
 * const BarChart = getPluginComponent<typeof import('./BarChart.svelte').default>(
 *   BarChartSveltePlugin,
 *   'BarChart'
 * );
 * </script>
 *
 * {#if BarChart}
 *   <svelte:component this={BarChart} data={salesData} title="Ventes" />
 * {/if}
 * ```
 */
export function getPluginComponent<T>(
  plugin: OwlLayerClientPlugin<any>,
  name: string,
): T | undefined {
  return plugin.ui?.components?.[name] as T | undefined;
}
