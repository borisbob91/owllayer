import { render, h } from 'preact';
import { DashboardPanel } from './DashboardPanel.js';

import type { DashboardLanguage } from './i18n/index.js';
export type { DashboardLanguage, DashboardTranslations } from './i18n/index.js';
export { getDashboardLanguage, setDashboardLanguage, t } from './i18n/index.js';

export interface DashboardConfig {
  /** URL absolue du serveur OwlLayer (ex: 'http://localhost:4001'). Vide = même origine. */
  serverUrl: string;
  /** Token admin initial optionnel. Si absent, écran de login affiché. */
  token?: string;
  /** Langue par défaut du dashboard ('en' ou 'fr', défaut: 'en') */
  language?: DashboardLanguage;
}

/** Monte le dashboard OwlLayer dans l'élément fourni. */
export function mountDashboard(el: HTMLElement, config: DashboardConfig): void {
  render(h(DashboardPanel, { config }), el);
}

/** Démonte proprement le dashboard. */
export function unmountDashboard(el: HTMLElement): void {
  render(null, el);
}
