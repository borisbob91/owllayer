import { z } from 'zod';

export interface UiStateSchemaOptions {
  /** Liste des views autorisees (optionnel). */
  views?: string[];
  /** Liste des actions autorisees (optionnel). */
  actions?: string[];
}

/**
 * createUiStateSchema - Helper pour definir un schema "ui_state" sans imposer
 * la structure exacte des params. L'app reste libre d'ajouter ses propres
 * contraintes via refine/extend.
 */
export function createUiStateSchema(options?: UiStateSchemaOptions) {
  const viewSchema = options?.views?.length
    ? z.enum(options.views as [string, ...string[]])
    : z.string().min(1);

  const actionSchema = options?.actions?.length
    ? z.enum(options.actions as [string, ...string[]])
    : z.string().min(1);

  return z.object({
    viewId: viewSchema.describe('ID logique du view'),
    action: actionSchema.describe('Action (open, close, set_tab, etc.)'),
    params: z.record(z.unknown()).optional(),
  });
}
