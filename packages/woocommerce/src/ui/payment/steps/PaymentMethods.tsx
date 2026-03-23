// Step 5 — Payment methods: Stripe Elements, PayPal Smart Buttons, or redirect to /checkout
// Security note: Card data never touches our code. Stripe/PayPal SDKs are loaded
// dynamically from their official CDNs (js.stripe.com, paypal.com) and handle all PCI-scoped data.
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { StoreApiClient } from '../../../api/StoreApiClient.js';
import type { CheckoutState, PaymentMethod } from '../types.js';

interface Props {
  api: StoreApiClient;
  state: CheckoutState;
  onUpdate: (patch: Partial<CheckoutState>) => void;
  onBack: () => void;
  onClose: () => void;
  stripeKey?: string;
  paypalClientId?: string;
}

// Minimal type stubs for dynamically loaded SDKs
interface StripeInstance {
  elements(): { create(type: string, opts?: Record<string, unknown>): StripeElement };
  createPaymentMethod(opts: { type: string; card: StripeElement }): Promise<{ paymentMethod?: { id: string }; error?: { message: string } }>;
}
interface StripeElement { mount(selector: Element): void; }
interface WindowWithStripe extends Window { Stripe?(key: string): StripeInstance; }
interface WindowWithPayPal extends Window {
  paypal?: {
    Buttons(opts: Record<string, unknown>): { render(selector: string): void };
  };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function PaymentMethods({ api, state, onUpdate, onBack, onClose, stripeKey, paypalClientId }: Props) {
  const stripeWrapperRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<StripeInstance | null>(null);
  const cardRef = useRef<StripeElement | null>(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [paying, setPaying] = useState(false);

  // Load and mount Stripe if key is present
  useEffect(() => {
    if (!stripeKey || !stripeWrapperRef.current) return;
    let cancelled = false;
    loadScript('https://js.stripe.com/v3/')
      .then(() => {
        if (cancelled) return;
        const Stripe = (window as WindowWithStripe).Stripe;
        if (!Stripe) return;
        const stripe = Stripe(stripeKey);
        stripeRef.current = stripe;
        const elements = stripe.elements();
        const card = elements.create('card', {
          style: {
            base: { color: '#e2e8f0', fontFamily: 'inherit', fontSize: '14px', '::placeholder': { color: '#475569' } },
            invalid: { color: '#f87171' },
          },
        });
        card.mount(stripeWrapperRef.current!);
        cardRef.current = card;
        setStripeReady(true);
      })
      .catch(() => { /* Stripe unavailable — redirect fallback still shown */ });
    return () => { cancelled = true; };
  }, [stripeKey]);

  // Load PayPal if client ID is present (rendered in its own container)
  useEffect(() => {
    if (!paypalClientId) return;
    let cancelled = false;
    loadScript(`https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=EUR`)
      .then(() => {
        if (cancelled) return;
        const paypal = (window as WindowWithPayPal).paypal;
        if (!paypal) return;
        paypal.Buttons({
          createOrder: async () => {
            const res = await api.post<{ paypal_order_id: string }>('/checkout', { payment_method: 'paypal' });
            return res.paypal_order_id;
          },
          onApprove: async (data: Record<string, string>) => {
            setPaying(true);
            try {
              await api.post('/checkout', {
                payment_method: 'paypal',
                payment_data: { paypal_order_id: data['orderID'] },
              });
              onClose();
            } catch (e) {
              onUpdate({ error: (e as Error).message });
            } finally {
              setPaying(false);
            }
          },
          onError: (err: Error) => { onUpdate({ error: err.message }); },
        }).render('#paypal-container');
      })
      .catch(() => { /* PayPal unavailable — redirect fallback shown */ });
    return () => { cancelled = true; };
  }, [paypalClientId]);

  async function payWithStripe() {
    if (!stripeRef.current || !cardRef.current) return;
    setPaying(true);
    onUpdate({ error: null });
    try {
      const { paymentMethod, error } = await stripeRef.current.createPaymentMethod({
        type: 'card',
        card: cardRef.current,
      });
      if (error) throw new Error(error.message);
      if (!paymentMethod) throw new Error('Erreur Stripe inattendue.');
      await api.post('/checkout', {
        payment_method: 'stripe',
        payment_data: { stripe_payment_method_id: paymentMethod.id },
      });
      onClose();
    } catch (e) {
      onUpdate({ error: (e as Error).message });
    } finally {
      setPaying(false);
    }
  }

  function redirectToCheckout() {
    window.location.href = '/checkout';
  }

  const selectedMethod: PaymentMethod | null = state.selectedPayment;

  return (
    <div>
      <div class="modal-body">
        {state.error && <div class="error-banner">{state.error}</div>}
        <p class="section-title">Paiement</p>

        {/* Stripe */}
        {stripeKey && (
          <div class="pay-section">
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Paiement par carte</p>
            <div
              class="stripe-wrapper"
              ref={stripeWrapperRef}
              aria-label="Formulaire de carte bancaire Stripe"
            />
            <button
              class="pay-btn pay-btn-stripe"
              onClick={payWithStripe}
              disabled={!stripeReady || paying}
            >
              {paying && selectedMethod === 'stripe' ? <span class="spinner" /> : '💳 Payer par carte'}
            </button>
          </div>
        )}

        {/* PayPal */}
        {paypalClientId && (
          <div class="pay-section">
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>PayPal</p>
            <div id="paypal-container" />
          </div>
        )}

        {/* Redirect fallback — always present */}
        <div class="pay-section">
          <button class="pay-btn pay-btn-redirect" onClick={redirectToCheckout} disabled={paying}>
            🔗 Finaliser sur le site
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-back" onClick={onBack}>Retour</button>
      </div>
    </div>
  );
}
