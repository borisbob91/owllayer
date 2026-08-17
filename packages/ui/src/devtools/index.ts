import { render, h } from 'preact';
import { DevToolsPanel } from './DevToolsPanel.js';
import type {
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventType,
  EffectiveToolsPayload,
  ToolDeclaration,
  PluginMeta,
} from '@owllayer/core';

export type { PluginMeta };

export interface DevToolsConfig {
  /** Plugins installes — auto-detectes par les bridges, ne pas passer manuellement. */
  plugins: readonly PluginMeta[];
  /** Retourne les tools actuellement enregistrés (enrichis avec source plugin et flag global) */
  getRegisteredTools: () => Array<ToolDeclaration & { source?: string; global?: boolean }>;
  /** Derniere surface effective envoyee par le serveur, si le bridge l'expose. */
  getToolSurface?: () => EffectiveToolsPayload;
  /** Retourne les tools réellement visibles par le serveur/LLM. */
  getEffectiveTools?: () => ToolDeclaration[];
  /** Retourne les tools client ignores par collision avec un tool serveur. */
  getIgnoredClientTools?: () => ToolDeclaration[];
  /** Déclenche un appel tool en simulation */
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Retourne l'état courant de l'agent (ex: 'idle' | 'running') */
  getAgentState: () => string;
  /** Retourne l'ID de session actif ou null */
  getSessionId: () => string | null;
  /** S'abonner a un evenement canonique si le bridge le supporte. */
  subscribeEvent?: <TType extends DomOSClientEventType>(type: TType, listener: DomOSClientEventListener<TType>) => () => void;
  /** S'abonner a tous les evenements canoniques si le bridge le supporte. */
  subscribeAnyEvent?: (listener: DomOSClientAnyEventListener) => () => void;
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
