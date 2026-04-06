// Step 4 — Promo code: apply WooCommerce coupon via POST /cart/coupons
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { StoreApiClient } from '../../../api/StoreApiClient.js';
import type { CheckoutState } from '../types.js';

interface Props {
  api: StoreApiClient;
  state: CheckoutState;
  onUpdate: (patch: Partial<CheckoutState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PromoCode({ api, state, onUpdate, onNext, onBack }: Props) {
  const [applying, setApplying] = useState(false);

  async function apply() {
    const code = state.promoCode.trim();
    if (!code) return;
    setApplying(true);
    onUpdate({ error: null });
    try {
      interface CouponResponse {
        totals?: { total_discount?: string; currency_code?: string };
      }
      const coupons = await api.post<CouponResponse[]>('/cart/coupons', { code });
      const applied = coupons.find((c: CouponResponse) => c.totals?.total_discount);
      const discount = applied?.totals?.total_discount
        ? `${(parseInt(applied.totals.total_discount, 10) / 100).toFixed(2)} ${applied.totals.currency_code ?? ''}`
        : '';
      onUpdate({ promoApplied: true, promoDiscount: discount, error: null });
    } catch (e) {
      onUpdate({ error: (e as Error).message });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div>
      <div class="modal-body">
        {state.error && <div class="error-banner">{state.error}</div>}
        <p class="section-title">Code promotionnel</p>
        {state.promoApplied ? (
          <div class="promo-success">
            <span>✓</span>
            <span>Code appliqué{state.promoDiscount ? ` — remise ${state.promoDiscount}` : ''}</span>
          </div>
        ) : (
          <div>
            <div class="promo-row">
              <input
                class="form-input"
                type="text"
                placeholder="Code promo (optionnel)"
                value={state.promoCode}
                onInput={(e) => onUpdate({ promoCode: (e.target as HTMLInputElement).value })}
              />
              <button class="apply-btn" onClick={apply} disabled={applying || !state.promoCode.trim()}>
                {applying ? <span class="spinner" /> : 'Appliquer'}
              </button>
            </div>
            <span class="skip-link" onClick={onNext}>Passer cette étape →</span>
          </div>
        )}
      </div>
      <div class="modal-footer">
        <button class="btn-back" onClick={onBack}>Retour</button>
        <button class="btn-next" onClick={onNext}>
          {state.promoApplied ? 'Continuer' : 'Passer'}
        </button>
      </div>
    </div>
  );
}
