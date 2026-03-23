/**
 * UITools — registers tools the AI agent can call to update the WooWidget UI.
 *
 * Pattern: AI calls tool → handler dispatches a CustomEvent on window →
 *          WooWidgetApp listens → updates panelView state.
 *
 * Unlike Shopify, product data comes from WC Store API (via ProductTools) or
 * the PHP-injected context — no mock products.
 */
import type { BrowserToolDefinition } from '@domos/browser';
import type {
  UIProduct,
  UICartItem,
  UIShowCartDetail,
  UIShowNotificationDetail,
  UIShowProductDetailDetail,
  UIShowProductsDetail,
  UIShowUpsellDetail,
} from '../ui/types.js';
import type { WooProduct, WooCartItem } from '../types.js';

interface DomOSRegister {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

// ── Price helper ─────────────────────────────────────────────────────────────

/**
 * WooCommerce Store API returns prices as minor units (integer cents).
 * "1999" → "19.99 EUR"
 */
export function formatWooPrice(minor: string, currencyCode: string): string {
  const amount = parseInt(minor, 10);
  if (isNaN(amount)) return minor;
  return `${(amount / 100).toFixed(2)} ${currencyCode}`;
}

// ── Mapping helpers ──────────────────────────────────────────────────────────

export function wooProductToUI(p: WooProduct): UIProduct {
  const price = formatWooPrice(p.prices.price, p.prices.currency_code);
  const compareAtPrice =
    p.prices.regular_price !== p.prices.price
      ? formatWooPrice(p.prices.regular_price, p.prices.currency_code)
      : undefined;
  return {
    id: String(p.id),
    handle: p.slug,
    title: p.name,
    price,
    compareAtPrice,
    imageUrl: p.images?.[0]?.src ?? '',
    description: p.short_description?.replace(/<[^>]+>/g, '') ?? '',
    available: p.is_in_stock,
    variants: p.variations?.map((v) => ({
      id: String(v.id),
      title: v.attributes.map((a) => a.value ?? a.name).join(' / '),
      available: true,
      price,
    })),
  };
}

export function wooCartItemToUI(item: WooCartItem): UICartItem {
  return {
    id: item.key,
    title: item.name,
    price: formatWooPrice(item.prices.price, item.prices.currency_code),
    imageUrl: item.images?.[0]?.src ?? '',
    quantity: item.quantity,
  };
}

// ── Dispatch helper ──────────────────────────────────────────────────────────

function dispatch<T>(eventName: string, detail: T): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// ── Tool registration ────────────────────────────────────────────────────────

export function registerUITools(domos: DomOSRegister): void {
  // ── show_products ──────────────────────────────────────────────────────────
  domos.registerTool('show_products', {
    description:
      'Affiche une grille de produits dans le panneau du widget WooCommerce. ' +
      'Les produits sont passés directement (via product_ids si disponibles) ou issus du contexte PHP.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Requête de recherche affichée comme filtre (ex: "chaussures de trail").',
        },
        products: {
          type: 'array',
          items: { type: 'object' },
          description: 'Liste de produits UIProduct pré-résolus (utilisé par RecommendationTools).',
        },
      },
    },
    risk: 'none',
    handler(args) {
      const products = (args['products'] as UIProduct[] | undefined) ?? [];
      const query = (args['query'] as string | undefined) ?? '';
      const detail: UIShowProductsDetail = { products, query: query || undefined };
      dispatch('domos:ui:show_products', detail);
      return { success: true, count: products.length };
    },
  });

  // ── show_product_detail ────────────────────────────────────────────────────
  domos.registerTool('show_product_detail', {
    description:
      'Ouvre la fiche détail d\'un produit (image, description, variantes, bouton panier). ' +
      'Appelez search_products ou get_product avant pour obtenir les données du produit.',
    parameters: {
      type: 'object',
      required: ['product'],
      properties: {
        product: {
          type: 'object',
          description: 'Objet UIProduct complet (id, handle, title, price, imageUrl, available).',
        },
      },
    },
    risk: 'none',
    handler(args) {
      const product = args['product'] as UIProduct | undefined;
      if (!product) return { success: false, error: 'Données produit manquantes.' };
      const detail: UIShowProductDetailDetail = { product };
      dispatch('domos:ui:show_product_detail', detail);
      return { success: true };
    },
  });

  // ── show_cart ──────────────────────────────────────────────────────────────
  domos.registerTool('show_cart', {
    description:
      'Affiche le panier actuel du client dans le panneau du widget. ' +
      'Le widget affiche les items en mémoire locale (synchronisés par CartContextSync).',
    parameters: { type: 'object', properties: {} },
    risk: 'none',
    handler(_args) {
      const detail: UIShowCartDetail = { items: [] };
      dispatch('domos:ui:show_cart', detail);
      return { success: true };
    },
  });

  // ── show_notification ──────────────────────────────────────────────────────
  domos.registerTool('show_notification', {
    description: 'Affiche un toast de notification dans le widget (succès, info, avertissement, erreur).',
    parameters: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', description: 'Texte du toast.' },
        variant: {
          type: 'string',
          enum: ['success', 'info', 'warning', 'error'],
          description: 'Style visuel du toast.',
        },
      },
    },
    risk: 'none',
    handler(args) {
      const detail: UIShowNotificationDetail = {
        message: args['message'] as string,
        variant: (args['variant'] as UIShowNotificationDetail['variant']) ?? 'info',
      };
      dispatch('domos:ui:show_notification', detail);
      return { success: true };
    },
  });

  // ── close_panel ────────────────────────────────────────────────────────────
  domos.registerTool('close_panel', {
    description: 'Ferme le panneau de contenu du widget (retour au mode chat compact).',
    parameters: { type: 'object', properties: {} },
    risk: 'none',
    handler(_args) {
      dispatch('domos:ui:close_panel', {});
      return { success: true };
    },
  });

  // ── show_upsell ────────────────────────────────────────────────────────────
  domos.registerTool('show_upsell', {
    description:
      'Affiche un produit complémentaire en upsell avec un message de recommendation. ' +
      'À utiliser après qu\'un article a été ajouté au panier pour suggérer un produit lié.',
    parameters: {
      type: 'object',
      required: ['product', 'reason'],
      properties: {
        product: { type: 'object', description: 'Objet UIProduct du produit à upseller.' },
        reason: { type: 'string', description: 'Phrase courte expliquant la recommandation.' },
      },
    },
    risk: 'none',
    handler(args) {
      const product = args['product'] as UIProduct | undefined;
      if (!product) return { success: false, error: 'Données produit manquantes.' };
      const detail: UIShowUpsellDetail = { product, reason: args['reason'] as string };
      dispatch('domos:ui:show_upsell', detail);
      return { success: true };
    },
  });
}
