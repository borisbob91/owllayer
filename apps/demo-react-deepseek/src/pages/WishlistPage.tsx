import { Link } from 'react-router-dom';
import { useAgentContext } from '@owllayer/react';
import { useWishlist } from '../data/wishlist';
import { useCart } from '../data/cart';
import { useI18n } from '../i18n';

export function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { t, locale, getProductName, getProductDescription, formatPrice } = useI18n();

  useAgentContext({
    page: t.pages.wishlist,
    count: items.length,
    products: items.map((p) => ({ id: p.id, name: getProductName(p), price: formatPrice(p.price) })),
    language: locale,
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4 text-gray-300">♡</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t.wishlist.emptyTitle}</h2>
        <p className="text-gray-500 mb-6">
          {t.wishlist.emptySubtitle}
        </p>
        <Link to="/" className="btn-primary">
          {t.wishlist.exploreCatalog}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t.wishlist.title}{' '}
          <span className="text-owllayer-600">({items.length})</span>
        </h1>
        <button
          onClick={clearWishlist}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          {t.wishlist.clear}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((product) => {
          const name = getProductName(product);
          const description = getProductDescription(product);
          return (
            <div key={product.id} className="card">
              <Link to={`/product/${product.id}`}>
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="p-4">
                <Link
                  to={`/product/${product.id}`}
                  className="font-semibold text-gray-900 hover:text-owllayer-600 transition-colors"
                >
                  {name}
                </Link>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {description}
                </p>
                <p className="text-owllayer-700 font-bold mt-2">
                  {formatPrice(product.price)}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      addToCart(product);
                      removeFromWishlist(product.id);
                    }}
                    disabled={product.stock === 0}
                    className="btn-primary flex-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    &rarr; {t.nav.cart}
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="p-2 text-red-400 hover:text-red-600 border border-gray-200 rounded-lg transition-colors"
                    title={t.wishlist.remove}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
