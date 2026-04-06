import type { Component } from 'vue';
import type { DomOSClientPlugin } from '@domos/core';

/**
 * usePluginComponents — Recuperer les composants Vue declares par un plugin.
 *
 * Retourne la carte de composants UI du plugin, typee selon T.
 * Lecture pure — aucun effet de bord, aucune reactivity declenchee.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { usePluginComponents } from '@domos/vue';
 * import { BarChartVuePlugin } from '@domos-plugins/bar-chart/vue';
 * import type { Component } from 'vue';
 *
 * const { BarChart } = usePluginComponents<{ BarChart: Component }>(BarChartVuePlugin);
 * </script>
 *
 * <template>
 *   <BarChart v-if="BarChart" :data="salesData" title="Ventes" />
 * </template>
 * ```
 */
export function usePluginComponents<T extends Record<string, Component>>(
  plugin: DomOSClientPlugin<any>,
): Partial<T> {
  return (plugin.ui?.components ?? {}) as Partial<T>;
}
