/**
 * UITools — registers tools that the AI agent can call to update the widget UI.
 *
 * Pattern: AI calls tool → handler dispatches a CustomEvent on window →
 *          ShopifyWidgetApp listens to the event → updates panelView state.
 *
 * All product data is mocked (no Storefront API) until the real API is wired.
 */
import type { BrowserToolDefinition } from '@owllayer/browser';
import { MOCK_PRODUCTS } from '../ui/mock/products.js';
import type {
  UIProduct,
  UIShowCartDetail,
  UIShowNotificationDetail,
  UIShowProductDetailDetail,
  UIShowProductsDetail,
  UIShowUpsellDetail,
} from '../ui/types.js';

interface OwlLayerRegister {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

/** Dispatch a typed custom event on window for the widget to consume. */
function dispatch<T>(eventName: string, detail: T): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/** Find products matching a query from the mock store (case-insensitive). */
function findProducts(query: string): UIProduct[] {
  if (!query) return MOCK_PRODUCTS;
  const q = query.toLowerCase();
  return MOCK_PRODUCTS.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      (p.vendor ?? '').toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q),
  );
}

/** Find a single product by id or title (partial match). */
function findProduct(idOrTitle: string): UIProduct | undefined {
  const q = idOrTitle.toLowerCase();
  return MOCK_PRODUCTS.find(
    (p) => p.id === idOrTitle || p.handle === idOrTitle || p.title.toLowerCase().includes(q),
  );
}

/**
 * Register all UI tools with OwlLayer.
 * Call this AFTER OwlLayer.init().
 */
export function registerUITools(owllayer: OwlLayerRegister): void {
  // ── show_products ──────────────────────────────────────────────────────────
  owllayer.registerTool('show_products', {
    description:
      'Affiche une grille de produits dans le panneau de la boutique. ' +
      'Utilise cet outil pour montrer les résultats de recherche ou filtrer les articles.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Terme de recherche pour filtrer les produits (ex: "veste", "trail").',
        },
        product_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Liste optionnelle d\'IDs produits à afficher (prioritaire sur query).',
        },
      },
    },
    risk: 'none',
    handler(args) {
      const ids = args['product_ids'] as string[] | undefined;
      const query = (args['query'] as string | undefined) ?? '';
      let products: UIProduct[];
      if (ids && ids.length > 0) {
        products = ids
          .map((id) => MOCK_PRODUCTS.find((p) => p.id === id))
          .filter((p): p is UIProduct => p !== undefined);
      } else {
        products = findProducts(query);
      }
      const detail: UIShowProductsDetail = { products, query: query || undefined };
      dispatch('owllayer:ui:show_products', detail);
      return { success: true, count: products.length };
    },
  });

  // ── show_product_detail ────────────────────────────────────────────────────
  owllayer.registerTool('show_product_detail', {
    description:
      'Ouvre la fiche détaillée d\'un produit (image, description, variantes, bouton panier).',
    parameters: {
      type: 'object',
      required: ['product_id'],
      properties: {
        product_id: {
          type: 'string',
          description: 'ID ou titre partiel du produit à afficher.',
        },
      },
    },
    risk: 'none',
    handler(args) {
      const product = findProduct(args['product_id'] as string);
      if (!product) return { success: false, error: 'Produit introuvable' };
      const detail: UIShowProductDetailDetail = { product };
      dispatch('owllayer:ui:show_product_detail', detail);
      return { success: true };
    },
  });

  // ── show_cart ──────────────────────────────────────────────────────────────
  owllayer.registerTool('show_cart', {
    description:
      'Affiche le panier actuel du client dans le panneau du widget. ' +
      'Utilise cet outil après qu\'un article ait été ajouté, ou quand le client demande à voir son panier.',
    parameters: {
      type: 'object',
      properties: {},
    },
    risk: 'none',
    handler(_args) {
      // The widget reads cart items from its own state when items is empty
      const detail: UIShowCartDetail = { items: [] };
      dispatch('owllayer:ui:show_cart', detail);
      return { success: true };
    },
  });

  // ── show_notification ──────────────────────────────────────────────────────
  owllayer.registerTool('show_notification', {
    description:
      'Affiche un toast de notification en haut du widget (succès, info, avertissement, erreur).',
    parameters: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', description: 'Texte du message à afficher.' },
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
      dispatch('owllayer:ui:show_notification', detail);
      return { success: true };
    },
  });

  // ── close_panel ────────────────────────────────────────────────────────────
  owllayer.registerTool('close_panel', {
    description:
      'Ferme le panneau de contenu du widget (retour au mode chat compact). ' +
      'Utilise cet outil quand la conversation revient à un sujet général.',
    parameters: { type: 'object', properties: {} },
    risk: 'none',
    handler(_args) {
      dispatch('owllayer:ui:close_panel', {});
      return { success: true };
    },
  });

  // ── show_upsell ────────────────────────────────────────────────────────────
  owllayer.registerTool('show_upsell', {
    description:
      'Affiche un produit complémentaire sous forme d\'upsell avec un message de raison. ' +
      'Utilise cet outil pour suggérer un produit lié à ce que le client vient d\'ajouter.',
    parameters: {
      type: 'object',
      required: ['product_id', 'reason'],
      properties: {
        product_id: { type: 'string', description: 'ID ou titre partiel du produit à upseller.' },
        reason: { type: 'string', description: 'Phrase courte expliquant pourquoi ce produit est recommandé.' },
      },
    },
    risk: 'none',
    handler(args) {
      const product = findProduct(args['product_id'] as string);
      if (!product) return { success: false, error: 'Produit introuvable' };
      const detail: UIShowUpsellDetail = { product, reason: args['reason'] as string };
      dispatch('owllayer:ui:show_upsell', detail);
      return { success: true };
    },
  });
}
