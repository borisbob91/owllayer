import { usePluginComponents } from '@owllayer/react';
import { BarChartReactPlugin, type BarChartDataPoint } from '@owllayer-plugins/bar-chart/react';
import { FormFillerReactPlugin, type MultiStepFormProps } from '@owllayer-plugins/form-filler/react';
import { useI18n } from '../i18n';

// ============================================================
// Données de démonstration
// ============================================================

export function PluginsPage() {
  const { t } = useI18n();

  const demoChartData: BarChartDataPoint[] = [
    { label: t.months.jan || 'Jan', value: 1200 },
    { label: t.months.feb || 'Feb', value: 1850 },
    { label: t.months.mar || 'Mar', value: 1430 },
    { label: t.months.apr || 'Apr', value: 2100 },
    { label: t.months.may || 'May', value: 1675 },
    { label: t.months.jun || 'Jun', value: 2340 },
  ];

  const checkoutSteps: MultiStepFormProps['steps'] = [
    {
      id: 'contact',
      title: t.plugins.form.contactStepTitle,
      fields: [
        { name: 'email', label: t.checkout.email, type: 'email', placeholder: 'alice@example.com', required: true },
        { name: 'firstName', label: t.checkout.firstName, type: 'text', placeholder: 'Alice', required: true },
        { name: 'phone', label: t.checkout.phone, type: 'tel', placeholder: t.plugins.form.phonePlaceholder },
      ],
    },
    {
      id: 'shipping',
      title: t.plugins.form.shippingStepTitle,
      fields: [
        { name: 'address', label: t.checkout.street, type: 'text', placeholder: t.plugins.form.addressPlaceholder, required: true },
        { name: 'city', label: t.checkout.city, type: 'text', placeholder: t.plugins.form.cityPlaceholder, required: true },
        {
          name: 'country',
          label: t.checkout.country,
          type: 'select',
          options: [
            { value: 'us', label: t.countries.unitedStates },
            { value: 'fr', label: t.countries.france },
            { value: 'uk', label: t.countries.unitedKingdom },
            { value: 'ca', label: t.countries.canada },
          ],
        },
        {
          name: 'notes',
          label: t.plugins.form.deliveryNotesLabel,
          type: 'textarea',
          placeholder: t.plugins.form.deliveryNotesPlaceholder,
        },
      ],
    },
    {
      id: 'payment',
      title: t.plugins.form.paymentStepTitle,
      fields: [
        { name: 'cardName', label: t.checkout.cardHolder, type: 'text', placeholder: t.plugins.form.cardHolderPlaceholder, required: true },
        { name: 'cardNumber', label: t.checkout.cardNumber, type: 'text', placeholder: '4242 4242 4242 4242', required: true },
        { name: 'expiry', label: t.checkout.expiry, type: 'text', placeholder: t.plugins.form.expiryPlaceholder, required: true },
        { name: 'cvv', label: t.checkout.cvc, type: 'text', placeholder: '123' },
      ],
    },
  ];

  const { BarChart } = usePluginComponents<{
    BarChart: (props: { data: BarChartDataPoint[]; title?: string }) => JSX.Element | null;
  }>(BarChartReactPlugin);

  const { MultiStepForm } = usePluginComponents<{
    MultiStepForm: (props: MultiStepFormProps) => JSX.Element | null;
  }>(FormFillerReactPlugin);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t.plugins.title}</h1>
        <p className="text-gray-500 mt-2">
          {t.plugins.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart plugin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📊 {t.plugins.chartTitle}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {t.plugins.chartDesc}
          </p>
          {BarChart ? (
            <BarChart data={demoChartData} title={t.plugins.chartSalesTitle} />
          ) : (
            <p className="text-gray-400 italic">{t.plugins.chartNotLoaded}</p>
          )}
        </div>

        {/* Form Filler plugin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">📝 {t.plugins.formTitle}</h2>
          <p className="text-sm text-gray-500 mb-4">
            {t.plugins.formDesc}
          </p>
          {MultiStepForm ? (
            <MultiStepForm
              formId="checkout"
              steps={checkoutSteps}
              theme="dark"
              accentColor="#7c3aed"
              onSubmit={async (values: any) => {console.log('[OwlLayer Demo] Form submitted:', values)}}
            />
          ) : (
            <p className="text-gray-400 italic">{t.plugins.formNotLoaded}</p>
          )}
        </div>
      </div>
    </div>
  );
}
