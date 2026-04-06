import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import type { UIProduct, UICartItem, UIVariant } from '../types';

interface Props {
  product: UIProduct;
  onAddToCart: (item: UICartItem) => void;
  onBack: () => void;
}

const CartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-14.8-16l.94 2H19l-3 9H8.1L5.1 4H2v-2h4.8zM17 6H6.66l2.1 6H15l2-6z" />
  </svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

export function ProductDetailView({ product, onAddToCart, onBack }: Props) {
  const firstAvailable = product.variants?.find((v) => v.available) ?? product.variants?.[0];
  const [selectedVariant, setSelectedVariant] = useState<UIVariant | undefined>(firstAvailable);

  const handleAddToCart = () => {
    onAddToCart({
      id: `${product.id}-${selectedVariant?.id ?? 'default'}-${Date.now()}`,
      variantId: selectedVariant?.id,
      title: selectedVariant ? `${product.title} — ${selectedVariant.title}` : product.title,
      price: selectedVariant?.price ?? product.price,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
  };

  const price = selectedVariant?.price ?? product.price;

  return (
    <>
      <div class="panel-header">
        <button class="back-btn" onClick={onBack} aria-label="Retour aux produits">
          <BackIcon /> Retour
        </button>
        <span />
      </div>
      <div class="product-detail">
        <div class="product-detail-img">
          <img src={product.imageUrl} alt={product.title} />
        </div>
        {product.vendor && (
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {product.vendor}
          </span>
        )}
        <h2 class="product-detail-title">{product.title}</h2>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span class="product-detail-price">{price}</span>
          {product.compareAtPrice && (
            <span style={{ fontSize: '14px', color: '#64748b', textDecoration: 'line-through' }}>
              {product.compareAtPrice}
            </span>
          )}
        </div>
        {product.description && (
          <p class="product-detail-desc">{product.description}</p>
        )}
        {product.variants && product.variants.length > 0 && (
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
              Taille / Variante
            </p>
            <div class="variants-row">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  class={`variant-btn${selectedVariant?.id === v.id ? ' selected' : ''}`}
                  onClick={() => setSelectedVariant(v)}
                  disabled={!v.available}
                  aria-pressed={selectedVariant?.id === v.id}
                >
                  {v.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          class="add-cart-btn"
          onClick={handleAddToCart}
          disabled={!product.available}
        >
          <CartIcon />
          {product.available ? 'Ajouter au panier' : 'Épuisé'}
        </button>
      </div>
    </>
  );
}
