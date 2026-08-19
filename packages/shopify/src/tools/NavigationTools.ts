// Sprint 3 — Navigation tools: navigate_to_product, navigate_to_collection
// Uses window.Shopify.routes.root for locale-aware URLs (e.g. /fr/products/...)

import type { BrowserToolDefinition } from '@owllayer/browser';

declare const window: Window & {
  Shopify?: { routes?: { root?: string } };
};

interface OwlLayerForTools {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

/** Returns the locale-aware URL root (e.g. "/fr/" or "/"). */
function navRoot(): string {
  return window.Shopify?.routes?.root ?? '/';
}

export function registerNavigationTools(owllayer: OwlLayerForTools): void {
  owllayer.registerTool('navigate_to_product', {
    description:
      "Navigue vers la page produit d'un article. À utiliser après search_products pour afficher les détails.",
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
    handler: (args) => {
      const url = `${navRoot()}products/${args.handle as string}`;
      window.location.href = url;
      return { navigating: true, url };
    },
  });

  owllayer.registerTool('navigate_to_collection', {
    description: "Navigue vers la page d'une collection de produits.",
    parameters: {
      type: 'object',
      properties: {
        handle: {
          type: 'string',
          description: 'Handle (slug) de la collection (ex: "vestes", "soldes", "nouveautes")',
        },
      },
      required: ['handle'],
    },
    risk: 'none',
    handler: (args) => {
      const url = `${navRoot()}collections/${args.handle as string}`;
      window.location.href = url;
      return { navigating: true, url };
    },
  });
}
