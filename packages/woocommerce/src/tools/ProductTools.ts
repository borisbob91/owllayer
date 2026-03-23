// Sprint 3 — Product tools: search_products, get_product, navigate_to_product, navigate_to_category
// Uses WooCommerce Store API v1: GET /products, GET /products/{id}
// Key facts (verified from ProductSchema.php):
//   - categories, attributes, variations are all present in /products/{id} response
//   - is_in_stock / low_stock_remaining (NOT inStock / stockQuantity)
//   - variations are embedded in the product response (no separate endpoint in Store API v1)
//   - min_price / max_price are in minor units (cents) — multiply by 100 before sending

import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooProduct } from '../types.js';

interface DomOSInstance {
  registerTool(name: string, def: Record<string, unknown>): void;
}

function buildProductSummary(p: WooProduct) {
  return {
    id: p.id,
    name: p.name,
    price: p.prices.price,
    regularPrice: p.prices.regular_price,
    onSale: p.on_sale,
    is_in_stock: p.is_in_stock,
    low_stock_remaining: p.low_stock_remaining,
    categories: p.categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
    permalink: p.permalink,
    shortDescription: p.short_description,
  };
}

export function registerProductTools(domos: unknown, api: StoreApiClient): void {
  const d = domos as DomOSInstance;

  // ── search_products ───────────────────────────────────────────────────────
  d.registerTool('search_products', {
    description: 'Recherche des produits WooCommerce par mots-clés, catégorie, prix ou promotion.',
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        query:    { type: 'string',  description: 'Texte de recherche (mots-clés).' },
        limit:    { type: 'number',  description: 'Nombre max de résultats (défaut: 5, max: 100).' },
        category: { type: 'string',  description: 'ID ou slug de catégorie WooCommerce.' },
        minPrice: { type: 'number',  description: 'Prix minimum en euros (ex: 20 pour 20,00 €).' },
        maxPrice: { type: 'number',  description: 'Prix maximum en euros (ex: 50 pour 50,00 €).' },
        onSale:   { type: 'boolean', description: 'Uniquement les produits en promotion si true.' },
      },
      required: ['query'],
    },
    handler: async (params: {
      query: string;
      limit?: number;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      onSale?: boolean;
    }) => {
      const qs = new URLSearchParams();
      qs.set('search', params.query);
      qs.set('per_page', String(params.limit ?? 5));
      if (params.category != null)  qs.set('category', params.category);
      if (params.minPrice != null)  qs.set('min_price', String(Math.round(params.minPrice * 100)));
      if (params.maxPrice != null)  qs.set('max_price', String(Math.round(params.maxPrice * 100)));
      if (params.onSale)            qs.set('on_sale', 'true');

      const results = await api.get<WooProduct[]>(`/products?${qs.toString()}`);
      return { results: results.map(buildProductSummary) };
    },
  });

  // ── get_product ───────────────────────────────────────────────────────────
  d.registerTool('get_product', {
    description:
      "Récupère les détails complets d'un produit WooCommerce (prix, stock, attributs, variations) par ID ou slug.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        id:   { type: 'number', description: 'ID numérique du produit WooCommerce.' },
        slug: { type: 'string', description: 'Slug du produit (alternatif à id).' },
      },
    },
    handler: async (params: { id?: number; slug?: string }) => {
      let product: WooProduct;

      if (params.id != null) {
        product = await api.get<WooProduct>(`/products/${params.id}`);
      } else if (params.slug) {
        const list = await api.get<WooProduct[]>(
          `/products?slug=${encodeURIComponent(params.slug)}`,
        );
        if (!list.length) return { error: `Produit "${params.slug}" introuvable.` };
        product = list[0];
      } else {
        return { error: 'Fournir au moins un paramètre : id ou slug.' };
      }

      return {
        id:               product.id,
        name:             product.name,
        type:             product.type,
        price:            product.prices.price,
        regularPrice:     product.prices.regular_price,
        priceRange:       product.prices.price_range,
        onSale:           product.on_sale,
        description:      product.description,
        shortDescription: product.short_description,
        is_in_stock:      product.is_in_stock,
        is_on_backorder:  product.is_on_backorder,
        low_stock_remaining: product.low_stock_remaining,
        categories: product.categories.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
        attributes: product.attributes.map(a => ({
          id:             a.id,
          name:           a.name,
          has_variations: a.has_variations,
          options:        a.terms.map(t => t.name),
        })),
        // Variation IDs with their attribute combos (embedded in product response)
        variations: product.variations.map(v => ({
          id:         v.id,
          attributes: Object.fromEntries(v.attributes.map(a => [a.name, a.value])),
        })),
        permalink: product.permalink,
      };
    },
  });

  // ── navigate_to_product ───────────────────────────────────────────────────
  d.registerTool('navigate_to_product', {
    description: "Navigue vers la page d'un produit WooCommerce.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        permalink: { type: 'string', description: "URL complète du produit (préféré)." },
        slug:      { type: 'string', description: "Slug du produit (construit /product/{slug})." },
      },
    },
    handler: (params: { permalink?: string; slug?: string }) => {
      if (params.permalink) {
        window.location.href = params.permalink;
        return { navigated: true, url: params.permalink };
      }
      if (params.slug) {
        const url = `/product/${params.slug}`;
        window.location.href = url;
        return { navigated: true, url };
      }
      return { success: false, error: 'Fournir permalink ou slug.' };
    },
  });

  // ── navigate_to_category ──────────────────────────────────────────────────
  d.registerTool('navigate_to_category', {
    description: "Navigue vers une page de catégorie de produits WooCommerce.",
    risk: 'none',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: "Slug de la catégorie." },
      },
      required: ['slug'],
    },
    handler: (params: { slug: string }) => {
      const url = `/product-category/${params.slug}`;
      window.location.href = url;
      return { navigated: true, url };
    },
  });

  // ── select_variant (Sprint 8) ─────────────────────────────────────────────
  d.registerTool('select_variant', {
    description:
      "Sélectionne une variation de produit WooCommerce (taille, couleur, etc.) en mettant à jour les sélecteurs du DOM. " +
      "À utiliser sur une page produit variable pour pré-sélectionner une variante avant l'ajout au panier.",
    risk: 'none',
    parameters: {
      type: 'object',
      required: ['attribute', 'value'],
      properties: {
        attribute: {
          type: 'string',
          description: "Nom de l'attribut à sélectionner (ex: 'pa_color', 'pa_size', 'Taille', 'Couleur').",
        },
        value: {
          type: 'string',
          description: "Valeur de l'attribut à sélectionner (ex: 'rouge', 'L', 'XL').",
        },
      },
    },
    handler: (params: { attribute: string; value: string }) => {
      if (typeof document === 'undefined') {
        return { success: false, error: 'DOM non disponible' };
      }

      // WooCommerce Classic: <select name="attribute_pa_color"> pour taxonomies, ou <select name="attribute_Taille"> pour attributs custom
      const normalizedAttr = params.attribute.toLowerCase().startsWith('pa_')
        ? params.attribute.toLowerCase()
        : `pa_${params.attribute.toLowerCase()}`;

      const selectors = [
        `select[name="attribute_${normalizedAttr}"]`,
        `select[name="attribute_${params.attribute}"]`,
        `.variations select[data-attribute_name="attribute_${normalizedAttr}"]`,
      ];

      for (const selector of selectors) {
        const el = document.querySelector<HTMLSelectElement>(selector);
        if (el) {
          // Matching case-insensitive sur value ET text
          const option = Array.from(el.options).find(
            (o) =>
              o.value.toLowerCase() === params.value.toLowerCase() ||
              o.text.toLowerCase() === params.value.toLowerCase(),
          );
          if (option) {
            el.value = option.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return {
              success: true,
              attribute: params.attribute,
              selected: option.value,
              label: option.text,
              mode: 'classic',
            };
          }
          return {
            success: false,
            error: `Valeur "${params.value}" introuvable pour l'attribut "${params.attribute}". Options disponibles : ${Array.from(el.options).map((o) => o.text).filter(Boolean).join(', ')}`,
          };
        }
      }

      return {
        success: false,
        error: `Attribut "${params.attribute}" introuvable sur cette page. Verifiez que vous etes sur une page produit variable.`,
      };
    },
  });
}
