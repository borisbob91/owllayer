import { Link } from 'react-router-dom';
import type { Product } from '../data/products';
import { useCart } from '../data/cart';
import { useWishlist } from '../data/wishlist';
import { useI18n } from '../i18n';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { t, getProductName, getProductDescription, formatPrice } = useI18n();
  const inWishlist = isInWishlist(product.id);

  const name = getProductName(product);
  const description = getProductDescription(product);

  return (
    <div className="card group hover:shadow-md transition-shadow">
      {/* Image */}
      <Link to={`/product/${product.id}`}>
        <div className="aspect-square bg-gray-100 overflow-hidden">
          <img
            src={product.image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              to={`/product/${product.id}`}
              className="font-semibold text-gray-900 hover:text-owllayer-600 transition-colors"
            >
              {name}
            </Link>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {description}
            </p>
          </div>
          {/* Bouton favori */}
          <button
            onClick={() =>
              inWishlist ? removeFromWishlist(product.id) : addToWishlist(product)
            }
            className={`p-1.5 rounded-full transition-colors shrink-0 text-lg leading-none ${
              inWishlist
                ? 'text-red-500 hover:text-red-700'
                : 'text-gray-300 hover:text-red-400'
            }`}
            title={inWishlist ? t.agent.removeFromWishlistDesc : t.product.addToWishlist}
          >
            {inWishlist ? '♥' : '♡'}
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-lg font-bold text-owllayer-700">
            {formatPrice(product.price)}
          </span>

          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="text-yellow-500">&#9733;</span>
            {product.rating}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              product.stock > 10
                ? 'bg-green-100 text-green-700'
                : product.stock > 0
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {product.stock > 0 ? `${product.stock} ${t.product.inStock}` : t.product.outOfStock}
          </span>

          <button
            onClick={() => addToCart(product)}
            disabled={product.stock === 0}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + {t.nav.cart}
          </button>
        </div>
      </div>
    </div>
  );
}
