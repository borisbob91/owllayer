import { render } from 'preact';
import { DashboardPanel } from './DashboardPanel.js';

export interface DashboardConfig {
  /** URL absolue du serveur DomOS (ex: 'http://localhost:4001'). Vide = même origine. */
  serverUrl: string;
  /** Token admin initial optionnel. Si absent, écran de login affiché. */
  token?: string;
}

/** Monte le dashboard DomOS dans l'élément fourni. */
export function mountDashboard(el: HTMLElement, config: DashboardConfig): void {
  render(<DashboardPanel config={config} />, el);
}

/** Démonte proprement le dashboard. */
export function unmountDashboard(el: HTMLElement): void {
  render(null, el);
}
