import { render } from 'preact';
import { DevToolsPanel } from './DevToolsPanel.js';
import type { PluginEntry, ToolDeclaration } from '@domos/core';

export interface DevToolsConfig {
  /** Liste des plugins chargés dans l'agent */
  plugins: readonly PluginEntry[];
  /** Retourne les tools actuellement enregistrés */
  getRegisteredTools: () => ToolDeclaration[];
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
  render(<DevToolsPanel config={config} />, el);
}

/**
 * Démonte le panneau DevTools de l'élément DOM cible.
 */
export function unmountDevTools(el: Element): void {
  render(null, el);
}
