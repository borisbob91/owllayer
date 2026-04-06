import { FormFillerPlugin } from '../index.js';
import { MultiStepForm } from './MultiStepForm.js';

export type { FormFillerConfig } from '../index.js';
export type { MultiStepFormProps, FormStep, FormFieldDef } from './MultiStepForm.js';
export { MultiStepForm };

/**
 * FormFillerReactPlugin — plugin DomOS avec composant React intégré.
 *
 * Etend FormFillerPlugin (framework-agnostic) en ajoutant le composant
 * <MultiStepForm> dans ui.components. Chaque instance de <MultiStepForm>
 * enregistre automatiquement 4 tools IA au montage (préfixés par formId) :
 *
 *   - @domos-plugins/form-filler/{formId}/fill_fields  — remplit des champs
 *   - @domos-plugins/form-filler/{formId}/next_step    — étape suivante
 *   - @domos-plugins/form-filler/{formId}/prev_step    — étape précédente
 *   - @domos-plugins/form-filler/{formId}/get_state    — lecture état courant
 *
 * @example
 * ```tsx
 * // 1. Installer le plugin dans DomOSProvider
 * const DEMO_PLUGINS = [
 *   [FormFillerReactPlugin, { theme: 'dark', accentColor: '#7c3aed' }],
 * ] as const;
 *
 * // 2. Récupérer le composant
 * const { MultiStepForm } = usePluginComponents<{
 *   MultiStepForm: typeof MultiStepForm
 * }>(FormFillerReactPlugin);
 *
 * // 3. Déclarer les étapes et rendre le formulaire
 * <MultiStepForm
 *   formId="checkout"
 *   steps={[
 *     {
 *       id: 'contact',
 *       title: 'Contact',
 *       fields: [
 *         { name: 'email', label: 'Email', type: 'email', required: true },
 *         { name: 'phone', label: 'Téléphone', type: 'tel' },
 *       ],
 *     },
 *     {
 *       id: 'livraison',
 *       title: 'Livraison',
 *       fields: [
 *         { name: 'address', label: 'Adresse', type: 'text', required: true },
 *         { name: 'city', label: 'Ville', type: 'text', required: true },
 *         { name: 'country', label: 'Pays', type: 'select', options: [
 *           { value: 'fr', label: 'France' },
 *           { value: 'be', label: 'Belgique' },
 *           { value: 'ch', label: 'Suisse' },
 *         ]},
 *       ],
 *     },
 *     {
 *       id: 'paiement',
 *       title: 'Paiement',
 *       fields: [
 *         { name: 'card', label: 'Numéro de carte', type: 'text', placeholder: '4242 4242 4242 4242' },
 *         { name: 'expiry', label: 'Expiration', type: 'text', placeholder: 'MM/AA' },
 *       ],
 *     },
 *   ]}
 *   onSubmit={(values) => console.log('Soumis:', values)}
 * />
 * ```
 */
export const FormFillerReactPlugin = {
  ...FormFillerPlugin,
  ui: {
    components: { MultiStepForm },
  },
};
