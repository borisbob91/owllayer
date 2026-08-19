import type { OwlLayerClientPlugin } from '@owllayer/core';

// ============================================================
// Config
// ============================================================

export interface BarChartConfig {
  /** Couleur principale des barres (ex: '#7c3aed'). Defaut : '#7c3aed' */
  color?: string;
  /** Theme general : 'dark' | 'light'. Defaut : 'dark' */
  theme?: 'dark' | 'light';
}

// ============================================================
// Plugin — framework-agnostic, sans composant UI
// ============================================================

/**
 * BarChartPlugin — base framework-agnostic.
 *
 * Publie le contexte chart dans le Shadow Context.
 * Les tools render_chart sont enregistres par le composant
 * React/Vue/Svelte via useAgentTool au montage.
 *
 * Pour un plugin avec composant, utiliser BarChartReactPlugin
 * depuis '@owllayer-plugins/bar-chart/react'.
 */
export const BarChartPlugin: OwlLayerClientPlugin<BarChartConfig> = {
  meta: {
    name: '@owllayer-plugins/bar-chart',
    version: '0.1.0',
    description: 'Plugin graphique en barres — rend des charts via tool LLM render_chart',
  },

  setup(ctx, config) {
    ctx.updateContext({
      chart: {
        type: 'bar',
        theme: config.theme ?? 'dark',
        color: config.color ?? '#7c3aed',
      },
    });
  },
};
