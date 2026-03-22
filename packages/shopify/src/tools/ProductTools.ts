// Sprint 3 — Product tools: search_products, get_product, select_variant
// Uses Shopify Storefront API (GraphQL) via shared StorefrontClient instance

import type { BrowserToolDefinition } from '@domos/browser';
import type { SearchProductsOptions, StorefrontProduct } from '../types.js';
import type { StorefrontClient } from '../storefront/StorefrontClient.js';

interface DomOSForTools {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeProductSummary(p: StorefrontProduct): Record<string, unknown> {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    price: `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`,
    available: p.availableForSale,
    productType: p.productType,
    vendor: p.vendor,
    url: `/products/${p.handle}`,
    image: p.featuredImage?.url ?? null,
  };
}

function normalizeProductDetail(p: StorefrontProduct): Record<string, unknown> {
  return {
    ...normalizeProductSummary(p),
    description: p.description,
    tags: p.tags,
    variants: p.variants.edges.map(({ node: v }) => ({
      id: v.id,
      title: v.title,
      available: v.availableForSale,
      qty: v.quantityAvailable,
      price: `${v.price.amount} ${v.price.currencyCode}`,
      options: v.selectedOptions,
    })),
    images: (p.images?.edges ?? []).map(({ node }) => node.url),
  };
}

/**
 * Attempt to resolve a variantId from an options map using the product JSON
 * injected into the page by our Liquid snippet (#domos-product-json or #product-json).
 */
function resolveVariantIdFromOptions(options: Record<string, string>): string | undefined {
  try {
    const el = document.querySelector<HTMLScriptElement>('#domos-product-json, #product-json');
    if (!el?.textContent) return undefined;
    const product = JSON.parse(el.textContent) as {
      variants?: Array<{ id: number; options: string[] }>;
    };
    if (!product.variants) return undefined;
    const optionValues = Object.values(options);
    const match = product.variants.find((v) => optionValues.every((val) => v.options.includes(val)));
    return match ? String(match.id) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * select_variant — works across 3 DOM patterns used by Shopify themes:
 *   Pattern 1: select[name="id"] (Debut, legacy)
 *   Pattern 2A: input[name="id"] hidden (some modern themes)
 *   Pattern 2B: per-option selects / radio buttons (Dawn, Prestige, Impulse)
 *   Pattern 3: CustomEvent('variant:selected') for headless/Hydrogen themes
 */
function selectVariant(
  variantId: string | undefined,
  options: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!variantId && !options) {
    return { success: false, error: 'variantId ou options requis' };
  }

  let resolvedId = variantId;
  if (!resolvedId && options) {
    resolvedId = resolveVariantIdFromOptions(options);
  }

  let hit = false;

  // Pattern 1: select[name="id"] — Debut, legacy themes
  const idSelect = document.querySelector<HTMLSelectElement>('select[name="id"]');
  if (idSelect && resolvedId) {
    idSelect.value = resolvedId;
    idSelect.dispatchEvent(new Event('change', { bubbles: true }));
    hit = true;
  }

  // Pattern 2A: hidden input[name="id"] — some themes store variant in a hidden input
  const idInput = document.querySelector<HTMLInputElement>('input[name="id"]');
  if (idInput && resolvedId) {
    idInput.value = resolvedId;
    idInput.dispatchEvent(new Event('change', { bubbles: true }));
    hit = true;
  }

  // Pattern 2B: per-option selectors (select[data-option]) + radio buttons — Dawn-style
  if (options) {
    for (const [name, value] of Object.entries(options)) {
      const optSelect = document.querySelector<HTMLSelectElement>(
        `select[data-option="${name}"], select[aria-label="${name}"]`,
      );
      if (optSelect) {
        optSelect.value = value;
        optSelect.dispatchEvent(new Event('change', { bubbles: true }));
        hit = true;
        continue;
      }
      const radio = document.querySelector<HTMLInputElement>(
        `input[type="radio"][value="${value}"]`,
      );
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        hit = true;
      }
    }
  }

  // Pattern 3: CustomEvent for headless/Hydrogen themes
  if (resolvedId) {
    document.dispatchEvent(
      new CustomEvent('variant:selected', {
        bubbles: true,
        detail: { variantId: resolvedId, options: options ?? {} },
      }),
    );
    hit = true;
  }

  if (!hit) {
    return { success: false, error: 'Aucun sélecteur de variante trouvé sur cette page' };
  }

  return {
    success: true,
    selected: { variantId: resolvedId ?? null, options: options ?? null },
  };
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerProductTools(domos: DomOSForTools, client: StorefrontClient | null): void {
  if (!client) {
    console.warn(
      '[DomOSShopify] storefrontToken + shopDomain requis — search_products et get_product indisponibles.',
    );
  }

  if (client) {
    domos.registerTool('search_products', {
      description:
        "Recherche des produits dans la boutique. Supporte les filtres par type, tag et plage de prix.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Termes de recherche (ex: "veste imperméable", "t-shirt rouge")',
          },
          limit: { type: 'number', description: 'Nombre maximum de résultats (défaut: 5, max: 20)' },
          productType: { type: 'string', description: 'Filtrer par type (ex: "Veste", "T-Shirt")' },
          tag: { type: 'string', description: 'Filtrer par tag produit' },
          minPrice: { type: 'number', description: 'Prix minimum (ex: 50 pour 50€)' },
          maxPrice: { type: 'number', description: 'Prix maximum (ex: 150 pour 150€)' },
        },
        required: ['query'],
      },
      risk: 'none',
      handler: async (args) => {
        try {
          const options: SearchProductsOptions = {
            limit: typeof args.limit === 'number' ? Math.min(args.limit, 20) : 5,
            productType: args.productType as string | undefined,
            tag: args.tag as string | undefined,
            minPrice: args.minPrice as number | undefined,
            maxPrice: args.maxPrice as number | undefined,
          };
          const products = await client.searchProducts(args.query as string, options);
          return {
            success: true,
            count: products.length,
            results: products.map(normalizeProductSummary),
          };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    });

    domos.registerTool('get_product', {
      description:
        "Récupère les détails complets d'un produit avec toutes ses variantes et leur disponibilité.",
      parameters: {
        type: 'object',
        properties: {
          handle: {
            type: 'string',
            description: 'Handle (slug) du produit (ex: "red-t-shirt", "veste-alpine")',
          },
        },
        required: ['handle'],
      },
      risk: 'none',
      handler: async (args) => {
        try {
          const product = await client.getProduct(args.handle as string);
          if (!product) return { success: false, error: `Produit "${args.handle as string}" introuvable` };
          return { success: true, product: normalizeProductDetail(product) };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    });
  }

  domos.registerTool('select_variant', {
    description:
      "Sélectionne une variante produit dans la page courante (taille, couleur, etc.) sans recharger.",
    parameters: {
      type: 'object',
      properties: {
        variantId: { type: 'string', description: 'ID Shopify de la variante à sélectionner' },
        options: {
          type: 'object',
          description: 'Options à sélectionner (ex: { "Size": "L", "Color": "Red" }). Alternatif à variantId.',
        },
      },
    },
    risk: 'none',
    handler: async (args) => {
      return selectVariant(
        args.variantId as string | undefined,
        args.options as Record<string, string> | undefined,
      );
    },
  });
}
