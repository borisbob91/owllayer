import { z } from 'zod';
import { useAgentTool } from './useAgentTool.js';

export interface ViewStateToolArgs {
  viewId: string;
  action: string;
  params?: Record<string, unknown>;
}

/**
 * useViewStateTool - Outil standard pour navigation locale (UI state).
 * Ex: modals, tabs, drawer, panels, etc.
 */
export function useViewStateTool(
  handler: (args: ViewStateToolArgs) => Promise<unknown> | unknown
): void {
  useAgentTool<ViewStateToolArgs>(
    {
      name: 'ui_state',
      description: 'Changer un etat UI local (view) sans changer l URL.',
      schema: z.object({
        viewId: z.string().min(1).describe('ID logique du view'),
        action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
        params: z.record(z.unknown()).optional().describe('Parametres d action'),
      }),
      risk: 'none',
    },
    handler
  );
}
