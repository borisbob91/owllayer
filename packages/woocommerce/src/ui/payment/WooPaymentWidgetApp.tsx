// WooPaymentWidgetApp — pure checkout panel component.
// Rendered inline inside WooWidgetApp's content-panel when panelView === 'checkout'.
// No own modal/shadow DOM — parent controls visibility via panelView state.
import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';
import type { StoreApiClient } from '../../api/StoreApiClient.js';
import type { CheckoutState } from './types.js';
import { initialCheckoutState } from './types.js';
import { OrderSummary } from './steps/OrderSummary.js';
import { AddressForm } from './steps/AddressForm.js';
import { ShippingRates } from './steps/ShippingRates.js';
import { PromoCode } from './steps/PromoCode.js';
import { PaymentMethods } from './steps/PaymentMethods.js';

export interface CheckoutPanelProps {
  api: StoreApiClient;
  stripeKey?: string;
  paypalClientId?: string;
  /** Called when user closes or completes checkout. */
  onClose(): void;
}

const STEP_LABELS = ['Commande', 'Adresse', 'Livraison', 'Promo', 'Paiement'];

export function WooPaymentWidgetApp({ api, stripeKey, paypalClientId, onClose }: CheckoutPanelProps) {
  const [state, setState] = useState<CheckoutState>(initialCheckoutState);

  const close = useCallback(() => {
    setState(initialCheckoutState);
    onClose();
  }, [onClose]);

  function patch(p: Partial<CheckoutState>) {
    setState((prev) => ({ ...prev, ...p }));
  }

  function next() {
    setState((prev) => {
      const nextStep = Math.min(prev.step + 1, 5) as CheckoutState['step'];
      return { ...prev, step: nextStep };
    });
  }

  function back() {
    setState((prev) => {
      const prevStep = Math.max(prev.step - 1, 1) as CheckoutState['step'];
      return { ...prev, step: prevStep, error: null };
    });
  }

  return (
    <div class="checkout-panel">
      {/* Header */}
      <div class="checkout-header">
        <span class="checkout-title">Finaliser la commande</span>
        <span class="checkout-subtitle">Etape {state.step} sur 5</span>
      </div>

      {/* Stepper */}
      <div class="stepper" role="list">
        {STEP_LABELS.map((label, idx) => {
          const n = idx + 1;
          const isDone = n < state.step;
          const isActive = n === state.step;
          return (
            <div key={n} class="step-item" role="listitem">
              <div
                class={`step-dot${isDone ? ' done' : isActive ? ' active' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isDone ? '\u2713' : n}
              </div>
              <span class={`step-label${isActive ? ' active' : ''}`}>{label}</span>
              {idx < STEP_LABELS.length - 1 && <div class="step-connector" aria-hidden="true" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div class="checkout-body">
        {state.step === 1 && <OrderSummary api={api} state={state} onNext={next} onClose={close} />}
        {state.step === 2 && <AddressForm api={api} state={state} onUpdate={patch} onNext={next} onBack={back} />}
        {state.step === 3 && <ShippingRates api={api} state={state} onUpdate={patch} onNext={next} onBack={back} />}
        {state.step === 4 && <PromoCode api={api} state={state} onUpdate={patch} onNext={next} onBack={back} />}
        {state.step === 5 && (
          <PaymentMethods
            api={api}
            state={state}
            onUpdate={patch}
            onBack={back}
            onClose={close}
            stripeKey={stripeKey}
            paypalClientId={paypalClientId}
          />
        )}
      </div>
    </div>
  );
}