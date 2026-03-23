import { h } from 'preact';
import type { UICartItem } from '../types';

interface Props {
  items: UICartItem[];
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout?: () => void;
}

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6m4-6v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

function parsePrice(priceStr: string): number {
  return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

export function CartView({ items, onUpdateQty, onRemove, onCheckout }: Props) {
  if (items.length === 0) {
    return (
      <div class="cart-view">
        <div class="empty-cart">
          <span style={{ fontSize: '32px' }}>🛒</span>
          <p>Votre panier est vide</p>
          <p style={{ fontSize: '12px', color: '#475569' }}>Dites-moi ce que vous cherchez !</p>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + parsePrice(item.price) * item.quantity, 0);
  const shipping = subtotal >= 50 ? 0 : 4.99;
  const total = subtotal + shipping;

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout();
    } else {
      window.location.href = '/checkout';
    }
  };

  return (
    <div class="cart-view">
      {items.map((item) => (
        <div key={item.id} class="cart-item">
          <div class="cart-item-img">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} />
            ) : (
              <span style={{ fontSize: '24px' }}>📦</span>
            )}
          </div>
          <div class="cart-item-info">
            <p class="cart-item-name">{item.title}</p>
            <p class="cart-item-price">{formatPrice(parsePrice(item.price) * item.quantity)}</p>
          </div>
          <div class="qty-ctrl">
            <button class="qty-btn" onClick={() => onUpdateQty(item.id, -1)} aria-label="Diminuer">−</button>
            <span class="qty-val">{item.quantity}</span>
            <button class="qty-btn" onClick={() => onUpdateQty(item.id, 1)} aria-label="Augmenter">+</button>
          </div>
          <button class="cart-remove" onClick={() => onRemove(item.id)} aria-label="Retirer du panier">
            <TrashIcon />
          </button>
        </div>
      ))}

      <div class="cart-footer">
        <div class="cart-total-row">
          <span class="cart-total-label">Sous-total</span>
          <span class="cart-total-val">{formatPrice(subtotal)}</span>
        </div>
        <div class="cart-total-row">
          <span class="cart-total-label">Livraison</span>
          <span class="cart-total-val">
            {shipping === 0 ? (
              <span style={{ color: '#22c55e', fontWeight: 700 }}>Gratuite</span>
            ) : formatPrice(shipping)}
          </span>
        </div>
        <div class="cart-total-row" style={{ borderTop: '1px solid #1e293b', paddingTop: '8px', marginTop: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: '#f1f5f9' }}>Total</span>
          <span class="cart-total-big">{formatPrice(total)}</span>
        </div>
        {subtotal < 50 && (
          <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Ajoutez {formatPrice(50 - subtotal)} pour la livraison gratuite
          </p>
        )}
        <button class="checkout-btn" onClick={handleCheckout}>
          <ArrowIcon />
          Passer la commande
        </button>
      </div>
    </div>
  );
}
