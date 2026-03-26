import type { DomOSClientPlugin } from '@domos/core';

// ============================================================
// Config
// ============================================================

export interface FormFillerConfig {
  /** Couleur d'accentuation pour les champs remplis par l'IA. Defaut : '#7c3aed' */
  accentColor?: string;
  /** Theme visuel. Defaut : 'dark' */
  theme?: 'dark' | 'light';
}

// ============================================================
// Plugin — framework-agnostic
// ============================================================

/**
 * FormFillerPlugin — base framework-agnostic.
 *
 * Publie la configuration dans le Shadow Context.
 * Les tools (fill_fields, next_step, prev_step, get_state) sont
 * enregistres directement par le composant <MultiStepForm> via
 * useAgentTool au montage, un set de tools par formId.
 *
 * Pour un plugin avec composant React, utiliser FormFillerReactPlugin
 * depuis '@domos-plugins/form-filler/react'.
 *
 * @example
 * ```ts
 * // Dans un contexte non-React (Vue, Svelte, Node)
 * const PLUGINS = [
 *   [FormFillerPlugin, { theme: 'dark', accentColor: '#7c3aed' }],
 * ] as const;
 * ```
 */
export const FormFillerPlugin: DomOSClientPlugin<FormFillerConfig> = {
  meta: {
    name: '@domos-plugins/form-filler',
    version: '0.1.0',
    description:
      'Plugin DomOS de pre-remplissage de formulaires multi-etapes par l\'IA. ' +
      'Fournit les tools fill_fields, next_step, prev_step, get_state par formulaire.',
  },
  setup(ctx, config = {}) {
    ctx.updateContext({
      formFiller: {
        theme: config.theme ?? 'dark',
        accentColor: config.accentColor ?? '#7c3aed',
      },
    });
  },
};
