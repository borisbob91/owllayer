// PaymentTools — registers the 'initiate_checkout_modal' AI tool.
// Dispatches domos:payment:open → WooWidgetApp shows checkout inline in content-panel.
import type { BrowserToolDefinition } from '@domos/browser';
import type { StoreApiClient } from '../api/StoreApiClient.js';
import type { WooCart } from '../types.js';

interface DomOSRegister {
  registerTool(name: string, definition: BrowserToolDefinition): void;
}

export function registerPaymentTools(
  domos: DomOSRegister,
  api: StoreApiClient,
): void {
  domos.registerTool('initiate_checkout_modal', {
    description:
      "Ouvre le panneau de paiement in-chat WooCommerce dans le widget vocal. " +
      "Verifie que le panier est non vide avant d'ouvrir. " +
      "A appeler uniquement quand le client confirme explicitement vouloir passer commande.",
    parameters: { type: 'object', properties: {} },
    risk: 'high',
    handler: async () => {
      const cart = await api.get<WooCart>('/cart');
      if (!cart.items_count || cart.items_count === 0) {
        return { success: false, error: "Le panier est vide - impossible d'ouvrir le paiement." };
      }
      window.dispatchEvent(new CustomEvent('domos:payment:open'));
      return { success: true };
    },
  });
}