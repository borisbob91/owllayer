import { z } from 'zod';
import { useAgentTool } from './useAgentTool.js';

export interface NavigateToolArgs {
  url: string;
  replace?: boolean;
  state?: Record<string, unknown>;
}

export interface NavigationToolOptions {
  /** Surcharger la description du tool navigate — utile pour lister les routes disponibles. */
  description?: string;
}

/**
 * useNavigationTool - Outil standard pour navigation URL (globale).
 *
 * @example
 * ```ts
 * useNavigationTool(({ url }) => router.push(url), {
 *   description:
 *     "Naviguer dans l'app. Routes disponibles : " +
 *     "/ (accueil), /products (catalogue), /cart (panier), /checkout (paiement).",
 * });
 * ```
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
