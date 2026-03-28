import { render, h } from 'preact';
import { DevToolsPanel } from './DevToolsPanel.js';
import type { ToolDeclaration, PluginMeta } from '@domos/core';

export type { PluginMeta };

export interface DevToolsConfig {
  /** Plugins installes — auto-detectes par les bridges, ne pas passer manuellement. */
  plugins: readonly PluginMeta[];
  /** Retourne les tools actuellement enregistrés (enrichis avec source plugin) */
  getRegisteredTools: () => Array<ToolDeclaration & { source?: string }>;
  /** Déclenche un appel tool en simulation */
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Retourne l'état courant de l'agent (ex: 'idle' | 'running') */
  getAgentState: () => string;
  /** Retourne l'ID de session actif ou null */
  getSessionId: () => string | null;
}

/**
 * Monte le panneau DevTools dans l'élément DOM cible.
 * Le panneau est un overlay flottant non-intrusif.
 */
export function mountDevTools(el: Element, config: DevToolsConfig): void {
  render(h(DevToolsPanel, { config }), el);
}

/**
 * Démonte le panneau DevTools de l'élément DOM cible.
 */
export function unmountDevTools(el: Element): void {
  render(null, el as HTMLElement);
}
