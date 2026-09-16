import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAgentTool, useAgentContext } from '@owllayer/react';
import { getProduct } from '../data/products';
import { useCart } from '../data/cart';
import { useI18n } from '../i18n';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = getProduct(id || '');
  const { addToCart } = useCart();
  const { t, locale, getProductName, getProductDescription, formatPrice } = useI18n();

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-gray-900">{t.product.notFound}</h2>
        <Link to="/" className="text-owllayer-600 mt-4 inline-block hover:underline">
          {t.product.backToCatalog}
        </Link>
      </div>
    );
  }

  const name = getProductName(product);
  const description = getProductDescription(product);

  // ============================================================
  // useAgentContext - L'agent sait quel produit est consulte
  // ============================================================
  useAgentContext({
    page: t.pages.productDetail,
    productId: product.id,
    productName: name,
    productPrice: product.price,
    productStock: product.stock,
    productCategory: product.category,
    language: locale,
  });

  // ============================================================
  // useAgentTool - Tools specifiques a cette page produit
  // ============================================================
  useAgentTool(
    {
      name: 'navigate_to_cart',
      description: t.agent.goToCheckoutDesc,
      risk: 'low',
    },
    async () => {
      navigate('/cart');
      return t.nav.cart;
    }
  );

  useAgentTool(
    {
      name: 'go_back_to_catalogue',
      description: t.product.backToCatalog,
      risk: 'none',
    },
    async () => {
      navigate('/');
      return t.nav.catalog;
    }
  );

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-owllayer-600 transition-colors">
          {t.nav.catalog}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="card">
          <img
            src={product.image}
            alt={name}
            className="w-full aspect-square object-cover"
          />
        </div>

        {/* Details */}
        <div>
          <span className="text-sm text-owllayer-600 font-medium capitalize">
            {t.categories[product.category] || product.category}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {name}
          </h1>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-500">&#9733;</span>
            <span className="text-sm text-gray-600">{product.rating} / 5 ({t.product.rating})</span>
          </div>

          <p className="text-gray-600 mt-4 leading-relaxed">
            {description}
          </p>

          <div className="mt-6">
            <span className="text-3xl font-bold text-owllayer-700">
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="mt-4">
            <span
              className={`inline-block text-sm px-3 py-1 rounded-full ${
                product.stock > 10
                  ? 'bg-green-100 text-green-700'
                  : product.stock > 0
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {product.stock > 0
                ? `${product.stock} ${t.product.inStock}`
                : t.product.outOfStock}
            </span>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => addToCart(product)}
              disabled={product.stock === 0}
              className="btn-primary flex-1 py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.product.addToCart}
            </button>

            <Link
              to="/cart"
              className="btn-secondary py-3 px-6 text-center"
            >
              {t.cart.title}
            </Link>
          </div>

          {/* Info OwlLayer */}
          <div className="mt-8 p-4 bg-owllayer-50 rounded-xl border border-owllayer-200">
            <p className="text-sm font-medium text-owllayer-800">
              OwlLayer Active
            </p>
            <p className="text-xs text-owllayer-600 mt-1">
              Tools <code className="bg-owllayer-100 px-1 rounded">add_to_cart</code>,{' '}
              <code className="bg-owllayer-100 px-1 rounded">navigate_to_cart</code>,{' '}
              <code className="bg-owllayer-100 px-1 rounded">add_to_wishlist</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
