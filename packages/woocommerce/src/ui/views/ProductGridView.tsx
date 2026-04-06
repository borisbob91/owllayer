import { h, Fragment } from 'preact';
import type { UIProduct } from '../types';

interface Props {
  products: UIProduct[];
  query?: string;
  onSelect: (product: UIProduct) => void;
}

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function ProductGridView({ products, query, onSelect }: Props) {
  return (
    <>
      {query && (
        <div class="filter-row">
          <span class="filter-chip"><CloseIcon /> {query}</span>
        </div>
      )}
      {products.length === 0 ? (
        <div class="empty-state" style={{ flex: 1 }}>
          <span style={{ fontSize: '28px' }}>🔍</span>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>Aucun produit trouvé</p>
        </div>
      ) : (
        <div class="product-grid">
          {products.map((p) => (
            <div
              key={p.id}
              class="product-card"
              onClick={() => onSelect(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(p)}
              aria-label={`Voir ${p.title}`}
            >
              <div class="product-img-wrap">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} loading="lazy" />
                ) : (
                  <span style={{ fontSize: '32px', color: '#475569' }}>📦</span>
                )}
              </div>
              <div class="product-info">
                <span class="product-name">{p.title}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span class="product-price">{p.price}</span>
                  {p.compareAtPrice && (
                    <span class="product-compare">{p.compareAtPrice}</span>
                  )}
                </div>
                <span class={`product-badge ${p.available ? 'badge-available' : 'badge-unavailable'}`}>
                  {p.available ? 'En stock' : 'Épuisé'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
