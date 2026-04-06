import { Link } from "react-router-dom";
import { useAgentTool, useAgentContext, DomOSTool } from "@domos/react";
import { z } from "zod";
import { useCart } from "../data/cart";

export function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total, itemCount } = useCart();

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
      description: `Modifier la quantité absolue d'un produit déjà présent dans le panier. Utiliser quand l'utilisateur veut augmenter ou diminuer une quantité (ex: "mets-en 3" → quantity:3, "enlève-en un" → quantité actuelle - 1). Passer quantity:0 pour supprimer l'article. Ne pas utiliser pour un produit absent du panier — utiliser add_to_cart à la place. Produits actuels dans le panier : ${items.map((i) => `${i.product.name} (id:${i.product.id}, qté actuelle:${i.quantity}, prix unitaire:${i.product.price.toFixed(2)}€)`).join(" | ") || "panier vide — aucun produit à modifier"}.`,
      schema: z.object({
        productId: z.string().describe("ID exact du produit à modifier (doit figurer dans la liste ci-dessus)"),
        quantity: z.number().int().min(0).describe("Nouvelle quantité absolue souhaitée. 0 = supprimer l'article du panier."),
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
      description: `Retirer complètement un produit du panier, quelle que soit sa quantité. Utiliser quand l'utilisateur dit "enlève X", "je ne veux plus de X" ou "retire X du panier". Différent de update_quantity qui ajuste une quantité partielle. Produits retirables : ${items.map((i) => `${i.product.name} (id:${i.product.id}, qté:${i.quantity})`).join(" | ") || "panier vide — aucun produit à retirer"}.`,
      schema: z.object({
        productId: z.string().describe("ID exact du produit à retirer entièrement du panier"),
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

  // continue_shopping, start_checkout et clear_cart sont enregistrés via DomOSTool
  // → pattern DomOSTool : un seul élément déclenché par l'humain ET par l'agent (click sur le même bouton).

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Panier ({itemCount} article{itemCount !== 1 ? "s" : ""})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">&#128722;</div>
          <p className="text-gray-500 text-lg">Votre panier est vide</p>
          {/* DomOSTool co-localisé — l'agent clique ce lien exactement comme l'humain */}
          <DomOSTool
            name="continue_shopping"
            description="Naviguer vers la page d'accueil (catalogue produits, route '/') pour que l'utilisateur puisse parcourir les articles et en ajouter au panier. À utiliser quand le panier est vide, quand l'utilisateur dit 'retour au catalogue', 'voir les produits', 'continuer mes achats' ou équivalent. Ne pas utiliser si le panier contient des articles et que l'utilisateur veut passer commande — utiliser start_checkout à la place."
            action="click"
          >
            <Link to="/" className="btn-primary inline-block mt-6">
              Voir le catalogue
            </Link>
          </DomOSTool>
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
                description={`Naviguer vers le checkout pour finaliser la commande (route '/checkout'). Déclencher quand l'utilisateur dit "commander", "passer commande", "finaliser", "procéder au paiement" ou équivalent. Prérequis : panier non vide. Panier actuel : ${itemCount} article(s), total ${total.toFixed(2)} EUR. Si le panier est vide, ne pas utiliser — orienter vers continue_shopping à la place.`}
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
                description={`Vider intégralement le panier en supprimant tous les articles d'un coup. Action irréversible — aucune confirmation supplémentaire possible après. Utiliser uniquement si l'utilisateur demande explicitement de tout vider ("vide le panier", "recommence à zéro", "efface tout"). Ne pas utiliser pour retirer un seul article — préférer remove_from_cart. Panier actuel : ${itemCount} article(s) pour ${total.toFixed(2)} EUR.`}
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
                  <code>continue_shopping</code>, <code>start_checkout</code> et <code>clear_cart</code> sont co-localisés avec leurs éléments UI.
                  L&apos;agent clique le même élément que l&apos;humain — zéro duplication de logique.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
