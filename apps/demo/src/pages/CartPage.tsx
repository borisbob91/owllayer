import { Link, useNavigate } from "react-router-dom";
import { useAgentTool, useAgentContext, DomOSTool } from "@domos/react";
import { z } from "zod";
import { useCart } from "../data/cart";

export function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total, itemCount } = useCart();
  const navigate = useNavigate();

  // ============================================================
  // useAgentContext - L'agent connait l'etat du panier
  // ============================================================
  useAgentContext({
    page: "cart",
    cartItems: items.map((i) => ({
      id: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
    })),
    cartTotal: total,
    cartItemCount: itemCount,
  });

  // ============================================================
  // useAgentTool - Tools specifiques au panier
  // ============================================================
  useAgentTool<{ productId: string; quantity: number }>(
    {
      name: "update_quantity",
      description: `Modifier la quantité d'un produit dans le panier. Passe la quantité absolue souhaitée (ex: 2 pour en avoir 2, 0 pour supprimer). Produits actuels: ${items.map((i) => `${i.product.name} (id: ${i.product.id}, qté: ${i.quantity})`).join(", ") || "panier vide"}.`,
      schema: z.object({
        productId: z.string().describe("ID du produit"),
        quantity: z.number().int().min(0).describe("Nouvelle quantité souhaitée (0 = supprimer)"),
      }),
      risk: "none",
    },
    async ({ productId, quantity }) => {
      const item = items.find((i) => i.product.id === productId);
      if (!item) return `Produit ${productId} non trouvé dans le panier.`;
      updateQuantity(productId, quantity);
      return quantity === 0
        ? `${item.product.name} retiré du panier.`
        : `Quantité de ${item.product.name} mise à jour : ${quantity}.`;
    },
  );

  useAgentTool<{ productId: string }>(
    {
      name: "remove_from_cart",
      description: `Retirer un produit du panier. Produits actuels: ${items.map((i) => `${i.product.name} (id: ${i.product.id})`).join(", ") || "panier vide"}.`,
      schema: z.object({
        productId: z.string().describe("ID du produit a retirer"),
      }),
      risk: "low",
    },
    async ({ productId }) => {
      const item = items.find((i) => i.product.id === productId);
      removeFromCart(productId);
      return item
        ? `${item.product.name} retire du panier.`
        : `Produit ${productId} non trouve dans le panier.`;
    },
  );

  // clear_cart et start_checkout sont enregistrés via DomOSTool (co-located avec leur bouton dans le JSX).
  // → pattern DomOSTool : un seul élément déclenché par l'humain ET par l'agent.

  useAgentTool(
    {
      name: "continue_shopping",
      description: "Retourner au catalogue pour continuer les achats.",
      risk: "none",
    },
    async () => {
      navigate("/");
      return "Retour au catalogue.";
    },
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Panier ({itemCount} article{itemCount !== 1 ? "s" : ""})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">&#128722;</div>
          <p className="text-gray-500 text-lg">Votre panier est vide</p>
          <Link to="/" className="btn-primary inline-block mt-6">
            Voir le catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste articles */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.product.id} className="card flex gap-4 p-4">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />

                <div className="flex-1">
                  <Link
                    to={`/product/${item.product.id}`}
                    className="font-semibold text-gray-900 hover:text-domos-600 transition-colors"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {item.product.price.toFixed(2)} EUR x {item.quantity}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <span className="font-bold text-domos-700">
                    {(item.product.price * item.quantity).toFixed(2)} EUR
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Resume */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-bold text-lg text-gray-900 mb-4">Resume</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-gray-600"
                  >
                    <span>
                      {item.product.name} x{item.quantity}
                    </span>
                    <span>
                      {(item.product.price * item.quantity).toFixed(2)} EUR
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-domos-700">{total.toFixed(2)} EUR</span>
                </div>
              </div>

              {/* ① DomOSTool — même bouton déclenché par l'humain OU par l'agent */}
              <DomOSTool
                name="start_checkout"
                description={`Démarrer le checkout (adresse → livraison → paiement → confirmation). Panier: ${itemCount} article(s), total ${total.toFixed(2)} EUR.`}
                action="click"
              >
                <Link
                  to="/checkout"
                  className="btn-primary w-full mt-6 py-3 text-center block"
                >
                  Commander →
                </Link>
              </DomOSTool>

              {/* ② DomOSTool — action haute-risque, même bouton rouge */}
              <DomOSTool
                name="clear_cart"
                description="Vider complètement le panier. Action irréversible."
                risk="high"
                action="click"
              >
                <button
                  onClick={() => clearCart()}
                  className="w-full mt-3 text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Vider le panier
                </button>
              </DomOSTool>

              {/* Info DomOS */}
              <div className="mt-6 p-3 bg-domos-50 rounded-lg border border-domos-200">
                <p className="text-xs text-domos-700">
                  <strong>DomOSTool :</strong>{" "}
                  <code>start_checkout</code> et <code>clear_cart</code> sont co-localisés avec leurs boutons.
                  L&apos;agent clique le même élément que l&apos;humain.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
