// Sprint 8 — RecommendationTools: get_recommendations
// CDC §7.3 / §3.6 — Recommandations personnalisées basées sur le contexte de navigation
//
// Stratégie côté WooCommerce (pas d'API native de recommandations) :
//   - 'related'  → produits de la même catégorie que le produit actuellement consulté
//   - 'on_sale'  → produits en promotion (on_sale=true)
//   - 'upsell'   → top produits sans filtre catégorie (fallback)
//
// Le produit actuellement consulté est lu depuis #domos-woo-context (injecté par PHP).

import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooProduct } from '../types.js';
import { wooProductToUI } from './UITools.js';

interface DomOSInstance {
  registerTool(name: string, def: Record<string, unknown>): void;
}

export function registerRecommendationTools(domos: unknown, api: StoreApiClient): void {
  const d = domos as DomOSInstance;

  // ── get_recommendations ───────────────────────────────────────────────────
  d.registerTool('get_recommendations', {
    description:
      "Retourne des recommandations de produits pertinentes basées sur le contexte actuel de navigation. " +
      "Si l'utilisateur est sur une page produit, retourne des produits similaires (même catégorie). " +
      "Sinon, retourne les produits en promotion ou les plus vendus.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          enum: ['related', 'on_sale', 'upsell'],
          description: "Type de recommandation : 'related' (même catégorie), 'on_sale' (promotions), 'upsell' (produits complémentaires).",
        },
        limit: {
          type: 'number',
          description: 'Nombre de recommandations (défaut : 4, max : 8).',
        },
      },
    },
    handler: async (params: { context?: string; limit?: number }) => {
      const limit = Math.min(params.limit ?? 4, 8);
      const context = params.context ?? 'related';

      // Lire le contexte WooCommerce injecté par le plugin PHP
      let wooCtx: Record<string, unknown> = {};
      if (typeof document !== 'undefined') {
        try {
          const el = document.getElementById('domos-woo-context');
          if (el) wooCtx = JSON.parse(el.textContent ?? '{}') as Record<string, unknown>;
        } catch {
          // contexte non disponible — continuer sans filtre catégorie
        }
      }

      const qs = new URLSearchParams();
      qs.set('per_page', String(limit));

      const product = wooCtx.product as { id?: number; categories?: Array<{ id: number }> } | undefined;

      if (context === 'related' && product?.categories?.[0]?.id) {
        qs.set('category', String(product.categories[0].id));
      } else if (context === 'on_sale') {
        qs.set('on_sale', 'true');
      }
      // 'upsell' : pas de filtre supplémentaire — top produits

      const products = await api.get<WooProduct[]>(`/products?${qs.toString()}`);

      // Filtrer le produit actuellement consulté pour éviter de le recommander
      const currentId = product?.id;
      const filtered = products
        .filter((p) => p.id !== currentId && p.is_in_stock)
        .slice(0, limit);

      if (filtered.length === 0) {
        return { success: true, products: [], message: 'Aucune recommandation disponible pour le moment.' };
      }

      // Dispatch UI event pour afficher les recommandations dans le widget
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('domos:ui:show_products', {
          detail: {
            products: filtered.map(wooProductToUI),
            query: context === 'on_sale' ? 'Offres speciales' : 'Pour vous',
          },
        }));
      }

      return {
        success: true,
        count: filtered.length,
        context,
        products: filtered.map((p) => ({ id: p.id, name: p.name })),
      };
    },
  });
}
