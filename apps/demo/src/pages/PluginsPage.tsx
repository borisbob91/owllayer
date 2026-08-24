import { usePluginComponents } from '@owllayer/react';
import { BarChartReactPlugin, type BarChartDataPoint } from '@owllayer-plugins/bar-chart/react';
import { FormFillerReactPlugin, type MultiStepFormProps } from '@owllayer-plugins/form-filler/react';

// ============================================================
// Données de démonstration
// ============================================================

const DEMO_CHART_DATA: BarChartDataPoint[] = [
  { label: 'Jan', value: 1200 },
  { label: 'Fév', value: 1850 },
  { label: 'Mar', value: 1430 },
  { label: 'Avr', value: 2100 },
  { label: 'Mai', value: 1675 },
  { label: 'Jun', value: 2340 },
];

const CHECKOUT_STEPS: MultiStepFormProps['steps'] = [
  {
    id: 'contact',
    title: 'Contact',
    fields: [
      { name: 'email', label: 'Email', type: 'email', placeholder: 'alice@example.com', required: true },
      { name: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Alice', required: true },
      { name: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+33 6 12 34 56 78' },
    ],
  },
  {
    id: 'livraison',
    title: 'Livraison',
    fields: [
      { name: 'address', label: 'Adresse', type: 'text', placeholder: '12 rue de la Paix', required: true },
      { name: 'city', label: 'Ville', type: 'text', placeholder: 'Paris', required: true },
      {
        name: 'country',
        label: 'Pays',
        type: 'select',
        options: [
          { value: 'fr', label: 'France' },
          { value: 'be', label: 'Belgique' },
          { value: 'ch', label: 'Suisse' },
          { value: 'lu', label: 'Luxembourg' },
        ],
      },
      { name: 'notes', label: 'Instructions de livraison', type: 'textarea', placeholder: 'Code portail, étage...' },
    ],
  },
  {
    id: 'paiement',
    title: 'Paiement',
    fields: [
      { name: 'cardName', label: 'Nom sur la carte', type: 'text', placeholder: 'ALICE DUPONT', required: true },
      { name: 'cardNumber', label: 'Numéro de carte', type: 'text', placeholder: '4242 4242 4242 4242', required: true },
      { name: 'expiry', label: 'Expiration', type: 'text', placeholder: 'MM/AA', required: true },
      { name: 'cvv', label: 'CVV', type: 'text', placeholder: '123' },
    ],
  },
];

// ============================================================
// Page Plugins — démo complète des plugins UI
// ============================================================

export function PluginsPage() {
  const { BarChart } = usePluginComponents<{
    BarChart: (props: { data: BarChartDataPoint[]; title?: string }) => JSX.Element | null;
  }>(BarChartReactPlugin);

  const { MultiStepForm } = usePluginComponents<{
    MultiStepForm: (props: MultiStepFormProps) => JSX.Element | null;
  }>(FormFillerReactPlugin);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Plugins OwlLayer</h1>
        <p className="text-gray-500 mt-2">
          Démo des plugins UI avec tools IA co-localisés
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart plugin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📊 Bar Chart</h2>
          <p className="text-sm text-gray-500 mb-4">
            L'IA peut mettre à jour le graphique via le tool <code>render_chart</code>
          </p>
          {BarChart ? (
            <BarChart data={DEMO_CHART_DATA} title="Ventes mensuelles" />
          ) : (
            <p className="text-gray-400 italic">Plugin BarChart non chargé</p>
          )}
        </div>

        {/* Form Filler plugin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📝 Form Filler</h2>
          <p className="text-sm text-gray-500 mb-4">
            L'IA peut pré-remplir les champs via <code>fill_fields</code>, naviguer avec <code>next_step</code> / <code>prev_step</code>
          </p>
          {MultiStepForm ? (
            <MultiStepForm
              formId="checkout"
              steps={CHECKOUT_STEPS}
              theme="dark"
              accentColor="#7c3aed"
              onSubmit={async (values: any) => {console.log('[OwlLayer Demo] Form submitted:', values)}}
            />
          ) : (
            <p className="text-gray-400 italic">Plugin FormFiller non chargé</p>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-owllayer-50 rounded-xl border border-owllayer-200">
        <p className="text-sm text-owllayer-700">
          <strong>💡 Essayez :</strong> &laquo;Remplis le formulaire avec Alice Dupont, alice@example.com, +33 6 12 34 56 78&raquo;
          ou &laquo;Mets à jour le graphique avec les ventes Q1: 3000, Q2: 4500, Q3: 2800, Q4: 5200&raquo;
        </p>
      </div>
    </div>
  );
}
