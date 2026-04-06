// Step 3 — Shipping rates: lists available shipping methods from WC Store API
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { StoreApiClient } from '../../../api/StoreApiClient.js';
import type { CheckoutState, WooShippingRate } from '../types.js';

interface Props {
  api: StoreApiClient;
  state: CheckoutState;
  onUpdate: (patch: Partial<CheckoutState>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface StoreCartShippingRate {
  rate_id: string;
  name: string;
  price: string;
  currency_code: string;
  instance_id: number;
}

interface StoreCartPackage {
  package_id: number;
  shipping_rates: StoreCartShippingRate[];
}

interface StoreCartResponse {
  shipping_rates?: StoreCartPackage[];
}

export function ShippingRates({ api, state, onUpdate, onNext, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<number>(0);

  useEffect(() => {
    api.get<StoreCartResponse>('/cart')
      .then((cart) => {
        const packages = cart.shipping_rates ?? [];
        const firstPkg = packages[0];
        if (!firstPkg) {
          onUpdate({ availableRates: [] });
          return;
        }
        setPackageId(firstPkg.package_id);
        const rates: WooShippingRate[] = firstPkg.shipping_rates.map((r) => ({
          rate_id: r.rate_id,
          name: r.name,
          price: `${(parseInt(r.price, 10) / 100).toFixed(2)} ${r.currency_code}`,
          currency_code: r.currency_code,
          instance_id: r.instance_id,
        }));
        onUpdate({ availableRates: rates });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [api]);

  async function selectRate(rate: WooShippingRate) {
    onUpdate({ selectedRate: rate });
    setSaving(true);
    try {
      await api.post('/cart/select-shipping-rate', {
        package_id: packageId,
        rate_id: rate.rate_id,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (!state.selectedRate && state.availableRates.length > 0) {
      setError('Veuillez choisir un mode de livraison.');
      return;
    }
    setError(null);
    onNext();
  }

  return (
    <div>
      <div class="modal-body">
        {error && <div class="error-banner">{error}</div>}
        <p class="section-title">Mode de livraison</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span class="spinner" aria-hidden="true" />
          </div>
        ) : state.availableRates.length === 0 ? (
          <p class="rate-empty">Livraison calculée à la commande.</p>
        ) : (
          state.availableRates.map((rate) => (
            <div
              key={rate.rate_id}
              class={`rate-card${state.selectedRate?.rate_id === rate.rate_id ? ' selected' : ''}`}
              onClick={() => selectRate(rate)}
              role="radio"
              aria-checked={state.selectedRate?.rate_id === rate.rate_id}
            >
              <input
                class="rate-radio"
                type="radio"
                name="shipping-rate"
                value={rate.rate_id}
                checked={state.selectedRate?.rate_id === rate.rate_id}
                readOnly
                tabIndex={-1}
              />
              <span class="rate-name">{rate.name}</span>
              <span class="rate-price">{rate.price}</span>
            </div>
          ))
        )}
        {saving && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Mise à jour…</p>}
      </div>
      <div class="modal-footer">
        <button class="btn-back" onClick={onBack}>Retour</button>
        <button class="btn-next" onClick={handleNext} disabled={loading}>
          Continuer
        </button>
      </div>
    </div>
  );
}
