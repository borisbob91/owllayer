import { useState } from 'react';
import { useAgentTool, useAgentContext } from '@owllayer/react';
import { z } from 'zod';
import { products, searchProducts, filterByCategory, categories } from '../data/products';
import { ProductCard } from '../components/ProductCard';

export function HomePage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filtrer les produits
  const filtered = search
    ? searchProducts(search)
    : activeCategory
    ? filterByCategory(activeCategory)
    : products;

  // ============================================================
  // useAgentContext - Le LLM sait toujours quelle page est affichee
  // ============================================================
  useAgentContext({
    page: 'catalogue',
    totalProducts: products.length,
    visibleProducts: filtered.length,
    activeFilter: activeCategory || 'tous',
    searchQuery: search || null,
    categories,
  });

  // ============================================================
  // useAgentTool - L'agent peut rechercher des produits
  // ============================================================
  useAgentTool<{ query: string }>(
    {
      name: 'search_products',
      description: `Rechercher des produits dans le catalogue. Categories disponibles: ${categories.join(', ')}.`,
      schema: z.object({
        query: z.string().describe('Terme de recherche (nom, description ou categorie)'),
      }),
      risk: 'none',
    },
    async ({ query }) => {
      setSearch(query);
      setActiveCategory(null);
      const results = searchProducts(query);
      return {
        count: results.length,
        products: results.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          stock: p.stock,
        })),
      };
    }
  );

  useAgentTool<{ category: string }>(
    {
      name: 'filter_by_category',
      description: `Filtrer les produits par categorie. Categories: ${categories.join(', ')}.`,
      schema: z.object({
        category: z.string().describe('Nom de la categorie'),
      }),
      risk: 'none',
    },
    async ({ category }) => {
      setActiveCategory(category);
      setSearch('');
      const results = filterByCategory(category);
      return {
        category,
        count: results.length,
        products: results.map((p) => ({ id: p.id, name: p.name, price: p.price })),
      };
    }
  );

  useAgentTool(
    {
      name: 'clear_filters',
      description: 'Supprimer tous les filtres et afficher tous les produits.',
      risk: 'none',
    },
    async () => {
      setSearch('');
      setActiveCategory(null);
      return { message: 'Filtres supprimes, tous les produits sont affiches.' };
    }
  );

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Boutique OwlLayer
        </h1>
        <p className="text-gray-500 mt-2">
          Demo e-commerce avec UI agentique - Essayez le chat !
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveCategory(null);
            }}
            placeholder="Rechercher un produit..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-owllayer-500 focus:border-transparent"
          />
        </div>

        {/* Filtres categories */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              setActiveCategory(null);
              setSearch('');
            }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              !activeCategory && !search
                ? 'bg-owllayer-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSearch('');
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeCategory === cat
                  ? 'bg-owllayer-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grille produits */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Aucun produit trouve</p>
          <p className="text-sm mt-1">Essayez un autre terme de recherche</p>
        </div>
      )}
    </div>
  );
}
