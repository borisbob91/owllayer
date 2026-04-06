import type { DomOSClientPlugin } from '@domos/core';

/**
 * getPluginComponents — Récupère les composants Angular déclarés par un plugin DomOS.
 *
 * Retourne la carte de composants UI du plugin, typée selon T.
 * Lecture pure — aucun effet de bord, aucun injection context requis.
 *
 * Les composants Angular dans plugin.ui.components doivent être des
 * standalone components (convention @domos/angular).
 *
 * @public
 *
 * @example
 * ```typescript
 * import { getPluginComponents } from '@domos/angular';
 * import { BarChartAngularPlugin } from '@domos-plugins/bar-chart/angular';
 * import type { Type } from '@angular/core';
 *
 * @Component({ ... })
 * class DashboardComponent {
 *   readonly BarChart = getPluginComponents<{ BarChart: Type<BarChartComponent> }>(
 *     BarChartAngularPlugin
 *   ).BarChart;
 * }
 * ```
 */
export function getPluginComponents<T extends Record<string, unknown>>(
  plugin: DomOSClientPlugin<any>,
): Partial<T> {
  return (plugin.ui?.components ?? {}) as Partial<T>;
}
