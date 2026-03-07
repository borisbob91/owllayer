/**
 * Exemple d'utilisation de useAgentToolResolver
 * 
 * Ce fichier montre comment migrer depuis un switch case géant
 * vers un resolver propre et typé.
 */

import { useState } from 'react';
import { useAgentToolResolver } from '@domos/react';
import { z } from 'zod';

// Types
type UIState = 'idle' | 'searching' | 'grid' | 'detail' | 'cart' | 'checkout_address' | 'checkout_payment' | 'checkout_recap' | 'success';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface ShippingInfo {
  address: string;
  city: string;
  zip: string;
}

/**
 * Composant exemple utilisant useAgentToolResolver
 */
export function ShoppingAppWithResolver() {
  // State
  const [uiState, setUiState] = useState<UIState>('idle');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'bank'>('card');

  // ✅ NOUVEAU : Resolver centralisé (remplace le switch case)
  const { toolCount } = useAgentToolResolver(
    {
      // Groupe 1 : Navigation
      navigation: {
        tools: {
          set_ui_view: {
            description: "Change la vue principale affichée à l'utilisateur",
            schema: z.object({
              view: z.enum(['grid', 'detail', 'cart', 'checkout_address', 'checkout_payment', 'checkout_recap', 'success', 'idle'])
                .describe("La vue cible"),
            }),
            risk: 'none',
            handler: async ({ view }) => {
              setUiState(view);
              return { result: `Vue changée vers ${view}` };
            },
          },

          scroll_ui: {
            description: "Fait défiler la liste des résultats",
            schema: z.object({
              direction: z.enum(['up', 'down']).describe("Direction du défilement"),
            }),
            risk: 'none',
            handler: async ({ direction }) => {
              const scrollAmount = direction === 'down' ? 300 : -300;
              window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
              return { result: `Défilement ${direction}` };
            },
          },

          show_notification: {
            description: "Affiche une notification temporaire (toast)",
            schema: z.object({
              message: z.string().describe("Le message à afficher"),
              type: z.enum(['success', 'error', 'info']).describe("Type de notification"),
            }),
            risk: 'none',
            handler: async ({ message, type }) => {
              // Implémenter votre logique de notification
              console.log(`[${type.toUpperCase()}] ${message}`);
              return { result: "Notification affichée" };
            },
          },
        },
      },

      // Groupe 2 : Catalogue
      catalog: {
        tools: {
          search_products: {
            description: "Rechercher des produits dans le catalogue",
            schema: z.object({
              query: z.string().describe("Terme de recherche"),
            }),
            risk: 'none',
            handler: async ({ query }) => {
              // Simuler une recherche API
              const mockResults: Product[] = [
                { id: '1', title: `${query} - Produit 1`, description: 'Description 1', price: 99.99 },
                { id: '2', title: `${query} - Produit 2`, description: 'Description 2', price: 149.99 },
              ];
              
              setProducts(mockResults);
              setUiState('grid');
              
              return {
                result: `${mockResults.length} produits trouvés pour "${query}"`,
                products: mockResults.map(p => ({ id: p.id, title: p.title })),
              };
            },
          },

          select_product: {
            description: "Afficher les détails d'un produit spécifique",
            schema: z.object({
              product_id: z.string().describe("ID du produit à afficher"),
            }),
            risk: 'none',
            handler: async ({ product_id }) => {
              const product = products.find(p => p.id === product_id);
              
              if (!product) {
                return { error: "Produit non trouvé" };
              }
              
              setSelectedProduct(product);
              setUiState('detail');
              
              return {
                result: "Produit affiché",
                info: product.title,
                description: product.description,
                price: product.price,
              };
            },
          },
        },
      },

      // Groupe 3 : Panier
      cart: {
        tools: {
          add_to_cart: {
            description: "Ajouter un produit au panier",
            schema: z.object({
              product_id: z.string().describe("ID du produit"),
              quantity: z.number().min(1).default(1).describe("Quantité à ajouter"),
            }),
            risk: 'low',
            handler: async ({ product_id, quantity }) => {
              const existingIdx = cart.findIndex(item => item.id === product_id);
              
              if (existingIdx !== -1) {
                // Augmenter la quantité
                setCart(prev => prev.map((item, idx) =>
                  idx === existingIdx 
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                ));
                
                return { result: `Quantité augmentée (+${quantity})` };
              } else {
                // Ajouter nouveau produit
                const product = products.find(p => p.id === product_id) || selectedProduct;
                
                if (!product) {
                  return { error: "Produit non trouvé" };
                }
                
                setCart(prev => [...prev, { ...product, quantity }]);
                return { result: "Produit ajouté au panier" };
              }
            },
          },

          update_cart_quantity: {
            description: "Modifier la quantité d'un produit dans le panier",
            schema: z.object({
              product_id: z.string().describe("ID du produit"),
              quantity: z.number().min(0).describe("Nouvelle quantité (0 pour retirer)"),
            }),
            risk: 'low',
            handler: async ({ product_id, quantity }) => {
              if (quantity === 0) {
                setCart(prev => prev.filter(item => item.id !== product_id));
                return { result: "Produit retiré du panier" };
              }
              
              setCart(prev => prev.map(item =>
                item.id === product_id ? { ...item, quantity } : item
              ));
              
              return { result: `Quantité mise à jour à ${quantity}` };
            },
          },

          remove_from_cart: {
            description: "Retirer un produit du panier",
            schema: z.object({
              product_id: z.string().describe("ID du produit à retirer"),
            }),
            risk: 'low',
            handler: async ({ product_id }) => {
              setCart(prev => prev.filter(item => item.id !== product_id));
              return { result: "Produit retiré du panier" };
            },
          },

          view_cart: {
            description: "Afficher le panier de l'utilisateur",
            schema: z.object({}),
            risk: 'none',
            handler: async () => {
              setUiState('cart');
              const summary = cart.map(i => `${i.quantity}x ${i.title}`).join(', ');
              const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              
              return {
                result: "Panier affiché",
                content: summary || "Panier vide",
                total: `${total.toFixed(2)}€`,
                itemCount: cart.length,
              };
            },
          },
        },
      },

      // Groupe 4 : Checkout
      checkout: {
        tools: {
          set_shipping_info: {
            description: "Enregistrer l'adresse de livraison",
            schema: z.object({
              address: z.string().describe("Adresse de livraison"),
              city: z.string().describe("Ville"),
              zip: z.string().describe("Code postal"),
            }),
            risk: 'low',
            handler: async ({ address, city, zip }) => {
              setShippingInfo({ address, city, zip });
              setUiState('checkout_payment');
              
              return {
                result: "Adresse enregistrée. Passage au paiement.",
                shipping: { address, city, zip },
              };
            },
          },

          select_payment_method: {
            description: "Choisir le mode de paiement",
            schema: z.object({
              method: z.enum(['card', 'paypal', 'bank']).describe("Méthode de paiement"),
            }),
            risk: 'low',
            handler: async ({ method }) => {
              setPaymentMethod(method);
              setUiState('checkout_recap');
              
              return {
                result: `Paiement ${method} sélectionné. Récapitulatif affiché.`,
                method,
              };
            },
          },

          confirm_final_order: {
            description: "Valider la commande finale",
            schema: z.object({
              confirmed: z.boolean().describe("True pour confirmer, false pour annuler"),
            }),
            risk: 'high',
            handler: async ({ confirmed }) => {
              if (confirmed) {
                setUiState('success');
                
                // Vider le panier
                const orderSummary = {
                  items: cart.length,
                  total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                  shipping: shippingInfo,
                  payment: paymentMethod,
                };
                
                setCart([]);
                
                return {
                  result: "Commande validée avec succès",
                  order: orderSummary,
                };
              }
              
              return { result: "Commande non confirmée" };
            },
          },
        },
      },
    },
    {
      // Options
      debug: true,
      onBeforeAnyCall: (toolName, args) => {
        console.log(`🔧 Executing: ${toolName}`, args);
      },
      onAfterAnyCall: (toolName, args, result) => {
        console.log(`✅ Completed: ${toolName}`, result);
      },
      onErrorAnyCall: (toolName, args, error) => {
        console.error(`❌ Error in ${toolName}:`, error);
      },
    }
  );

  return (
    <div className="shopping-app">
      <header>
        <h1>Shopping App with Resolver</h1>
        <p>🤖 {toolCount} tools actifs</p>
        <p>État UI: {uiState}</p>
        <p>Panier: {cart.length} article(s)</p>
      </header>

      <main>
        {/* Votre UI ici */}
        <div>
          <h2>Utilisez l'agent vocal pour interagir !</h2>
          <p>Exemples de commandes :</p>
          <ul>
            <li>"Recherche des ordinateurs portables"</li>
            <li>"Affiche le produit 1"</li>
            <li>"Ajoute-le au panier"</li>
            <li>"Montre-moi mon panier"</li>
            <li>"Je veux payer"</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default ShoppingAppWithResolver;
