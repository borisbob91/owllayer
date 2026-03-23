// Step 1 — Order summary: shows cart items + totals before checkout
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { StoreApiClient } from '../../../api/StoreApiClient.js';
import type { WooCart } from '../../../types.js';
import type { CheckoutState } from '../types.js';

interface Props {
  api: StoreApiClient;
  state: CheckoutState;
  onNext: () => void;
  onClose: () => void;
}

function formatMinor(minor: string, currencyCode: string): string {
  const n = parseInt(minor, 10);
  return isNaN(n) ? minor : `${(n / 100).toFixed(2)} ${currencyCode}`;
}

export function OrderSummary({ api, onNext, onClose }: Props) {
  const [cart, setCart] = useState<WooCart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<WooCart>('/cart')
      .then(setCart)
      .catch((e: Error) => setError(e.message));
  }, [api]);

  if (error) {
    return (
      <div class="modal-body">
        <div class="error-banner">{error}</div>
        <button class="btn-back" onClick={onClose}>Fermer</button>
      </div>
    );
  }

  if (!cart) {
    return (
      <div class="modal-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <span class="spinner" aria-hidden="true" />
      </div>
    );
  }

  const currency = cart.totals.currency_code;

  return (
    <div>
      <div class="modal-body">
        <p class="section-title">Votre commande</p>
        {cart.items.map((item) => (
          <div key={item.key} class="order-item">
            {item.images?.[0]?.src
              ? <img class="order-img" src={item.images[0].src} alt={item.name} loading="lazy" />
              : <div class="order-img" aria-hidden="true" />}
            <div class="order-info">
              <div class="order-name">{item.name}</div>
              <div class="order-qty">Qté : {item.quantity}</div>
            </div>
            <div class="order-price">{formatMinor(item.prices.price, currency)}</div>
          </div>
        ))}
        <div style={{ marginTop: '12px' }}>
          {cart.coupons?.map((c) => (
            <div key={c.code} class="totals-row">
              <span class="label">Coupon ({c.code})</span>
              <span class="value" style={{ color: '#22c55e' }}>
                -{formatMinor(c.totals?.total_discount ?? '0', c.totals?.currency_code ?? currency)}
              </span>
            </div>
          ))}
          <div class="totals-row total-final">
            <span class="label">Total</span>
            <span class="value">{formatMinor(cart.totals.total_price, currency)}</span>
          </div>
        </div>
        {cart.items.length === 0 && (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            Votre panier est vide.
          </p>
        )}
      </div>
      <div class="modal-footer">
        <button class="btn-back" onClick={onClose}>Annuler</button>
        <button class="btn-next" onClick={onNext} disabled={cart.items.length === 0}>
          Continuer
        </button>
      </div>
    </div>
  );
}
