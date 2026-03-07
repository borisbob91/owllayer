import { z } from 'zod';
import { useAgentTool } from './useAgentTool.js';

export interface NavigateToolArgs {
  url: string;
  replace?: boolean;
  state?: Record<string, unknown>;
}

/**
 * useNavigationTool - Outil standard pour navigation URL (globale).
 */
export function useNavigationTool(
  handler: (args: NavigateToolArgs) => Promise<unknown> | unknown
): void {
  useAgentTool<NavigateToolArgs>(
    {
      name: 'navigate',
      description: 'Naviguer vers une URL (navigation globale).',
      schema: z.object({
        url: z.string().min(1).describe('URL ou route a ouvrir'),
        replace: z.boolean().optional().describe('Remplacer l historique'),
        state: z.record(z.unknown()).optional().describe('State optionnel de navigation'),
      }),
      risk: 'none',
      global: true, // Navigation = toujours disponible
    },
    handler
  );
}
