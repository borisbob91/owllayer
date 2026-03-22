import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAgentTool, useAgentContext } from '@domos/react';
import { getProduct } from '../data/products';
import { useCart } from '../data/cart';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = getProduct(id || '');
  const { addToCart } = useCart();

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-gray-900">Produit introuvable</h2>
        <Link to="/" className="text-domos-600 mt-4 inline-block hover:underline">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  // ============================================================
  // useAgentContext - L'agent sait quel produit est consulte
  // ============================================================
  useAgentContext({
    page: 'product_detail',
    productId: product.id,
    productName: product.name,
    productPrice: product.price,
    productStock: product.stock,
    productCategory: product.category,
  });

  // ============================================================
  // useAgentTool - Tools specifiques a cette page produit
  // NB: add_to_cart est global (App.tsx > AppTools) et fonctionne
  //     depuis toutes les pages via productId.
  // ============================================================
  useAgentTool(
    {
      name: 'navigate_to_cart',
      description: 'Aller a la page panier pour voir les articles et commander.',
      risk: 'low',
    },
    async () => {
      navigate('/cart');
      return 'Navigation vers le panier.';
    }
  );

  useAgentTool(
    {
      name: 'go_back_to_catalogue',
      description: 'Retourner au catalogue pour voir d\'autres produits.',
      risk: 'none',
    },
    async () => {
      navigate('/');
      return 'Retour au catalogue.';
    }
  );

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-domos-600 transition-colors">
          Catalogue
        </Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="card">
          <img
            src={product.image}
            alt={product.name}
            className="w-full aspect-square object-cover"
          />
        </div>

        {/* Details */}
        <div>
          <span className="text-sm text-domos-600 font-medium capitalize">
            {product.category}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {product.name}
          </h1>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-500">&#9733;</span>
            <span className="text-sm text-gray-600">{product.rating} / 5</span>
          </div>

          <p className="text-gray-600 mt-4 leading-relaxed">
            {product.description}
          </p>

          <div className="mt-6">
            <span className="text-3xl font-bold text-domos-700">
              {product.price.toFixed(2)} EUR
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
                ? `${product.stock} en stock`
                : 'Rupture de stock'}
            </span>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => addToCart(product)}
              disabled={product.stock === 0}
              className="btn-primary flex-1 py-3 text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ajouter au panier
            </button>

            <Link
              to="/cart"
              className="btn-secondary py-3 px-6 text-center"
            >
              Voir le panier
            </Link>
          </div>

          {/* Info DomOS */}
          <div className="mt-8 p-4 bg-domos-50 rounded-xl border border-domos-200">
            <p className="text-sm font-medium text-domos-800">
              DomOS Active
            </p>
            <p className="text-xs text-domos-600 mt-1">
              Les tools <code className="bg-domos-100 px-1 rounded">add_to_cart</code>,{' '}
              <code className="bg-domos-100 px-1 rounded">navigate_to_cart</code> et{' '}
              <code className="bg-domos-100 px-1 rounded">go_back_to_catalogue</code>{' '}
              sont actifs sur cette page. L'agent peut les utiliser via le chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
