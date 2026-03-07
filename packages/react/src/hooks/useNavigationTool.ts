import { z } from 'zod';
import { useAgentTool } from './useAgentTool.js';

export interface NavigateToolArgs {
  url: string;
  replace?: boolean;
  state?: Record<string, unknown>;
}

export interface NavigationToolOptions {
  /**
   * Description custom pour le LLM.
   * Utiliser pour inclure la liste des routes disponibles dans l'app.
   * @example "Naviguer dans l'app. Routes: / (accueil), /cart (panier), /product/:id (fiche produit)"
   */
  description?: string;
}

/**
 * useNavigationTool - Outil standard pour navigation URL.
 * L'app fournit le handler (ex: react-router navigate).
 * Passer options.description pour inclure la liste des routes connues du LLM.
 */
export function useNavigationTool(
  handler: (args: NavigateToolArgs) => Promise<unknown> | unknown,
  options?: NavigationToolOptions
): void {
  useAgentTool<NavigateToolArgs>(
    {
      name: 'navigate',
      description: options?.description ?? 'Naviguer vers une URL (navigation globale).',
      schema: z.object({
        url: z.string().min(1).describe('URL ou route a ouvrir'),
        replace: z.boolean().optional().describe('Remplacer l historique'),
        state: z.record(z.unknown()).optional().describe('State optionnel de navigation'),
      }),
      risk: 'none',
      global: true,
    },
    handler
  );
}
