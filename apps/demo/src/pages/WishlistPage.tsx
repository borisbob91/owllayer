import { Link } from 'react-router-dom';
import { useAgentContext } from '@owllayer/react';
import { useWishlist } from '../data/wishlist';
import { useCart } from '../data/cart';

export function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  useAgentContext({
    page: 'favoris',
    count: items.length,
    products: items.map((p) => ({ id: p.id, name: p.name, price: p.price })),
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4 text-gray-300">♡</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Aucun favori</h2>
        <p className="text-gray-500 mb-6">
          Ajoutez des produits a vos favoris pour les retrouver ici.
        </p>
        <Link to="/" className="btn-primary">
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Mes Favoris{' '}
          <span className="text-owllayer-600">({items.length})</span>
        </h1>
        <button
          onClick={clearWishlist}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Tout effacer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((product) => (
          <div key={product.id} className="card">
            <Link to={`/product/${product.id}`}>
              <div className="aspect-square bg-gray-100 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            </Link>
            <div className="p-4">
              <Link
                to={`/product/${product.id}`}
                className="font-semibold text-gray-900 hover:text-owllayer-600 transition-colors"
              >
                {product.name}
              </Link>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {product.description}
              </p>
              <p className="text-owllayer-700 font-bold mt-2">
                {product.price.toFixed(2)} EUR
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
                  &rarr; Panier
                </button>
                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="p-2 text-red-400 hover:text-red-600 border border-gray-200 rounded-lg transition-colors"
                  title="Retirer des favoris"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
