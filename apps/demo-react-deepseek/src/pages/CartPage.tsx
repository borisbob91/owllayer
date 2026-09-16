import { Link } from "react-router-dom";
import { useAgentTool, useAgentContext, OwlLayerTool } from "@owllayer/react";
import { z } from "zod";
import { useCart } from "../data/cart";
import { useI18n } from "../i18n";

export function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, total, itemCount } = useCart();
  const { t, locale, format, getProductName, formatPrice } = useI18n();

  // ============================================================
  // useAgentContext - L'agent connait l'etat du panier
  // ============================================================
  useAgentContext({
    page: t.pages.cart,
    cartItems: items.map((i) => ({
      id: i.product.id,
      name: getProductName(i.product),
      price: formatPrice(i.product.price),
      quantity: i.quantity,
    })),
    cartTotal: formatPrice(total),
    cartItemCount: itemCount,
    language: locale,
  });

  // ============================================================
  // useAgentTool - Tools specifiques au panier
  // ============================================================
  useAgentTool<{ productId: string; quantity: number }>(
    {
      name: "update_quantity",
      description: format(t.agent.cartUpdateQuantityDesc, {
        items: items.map((i) => `${getProductName(i.product)} [id:${i.product.id}, qty:${i.quantity}]`).join(" | ") || "empty",
      }),
      schema: z.object({
        productId: z.string().describe(t.agent.productIdCartParam),
        quantity: z.number().int().min(0).describe(t.agent.quantityCartParam),
      }),
      risk: "none",
    },
    async ({ productId, quantity }) => {
      const item = items.find((i) => i.product.id === productId);
      if (!item) return format(t.agent.productNotFound, { id: productId });
      updateQuantity(productId, quantity);
      const name = getProductName(item.product);
      return quantity === 0
        ? format(t.agent.productRemovedFromCart, { name })
        : format(t.agent.quantityUpdated, { name, quantity });
    },
  );

  useAgentTool<{ productId: string }>(
    {
      name: "remove_from_cart",
      description: format(t.agent.cartRemoveDesc, {
        items: items.map((i) => `${getProductName(i.product)} [id:${i.product.id}, qty:${i.quantity}]`).join(" | ") || "empty",
      }),
      schema: z.object({
        productId: z.string().describe(t.agent.productIdCartParam),
      }),
      risk: "low",
    },
    async ({ productId }) => {
      const item = items.find((i) => i.product.id === productId);
      removeFromCart(productId);
      return item
        ? format(t.agent.productRemovedFromCart, { name: getProductName(item.product) })
        : format(t.agent.productNotFound, { id: productId });
    },
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t.cart.title} ({itemCount} {itemCount !== 1 ? t.common.items : t.common.item})
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">&#128722;</div>
          <p className="text-gray-500 text-lg">{t.cart.emptyTitle}</p>
          <OwlLayerTool
            name="continue_shopping"
            description={t.agent.continueShoppingToolDesc}
            action="click"
          >
            <Link to="/" className="btn-primary inline-block mt-6">
              {t.cart.startShopping}
            </Link>
          </OwlLayerTool>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Liste articles */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const name = getProductName(item.product);
              return (
                <div key={item.product.id} className="card flex gap-4 p-4">
                  <img
                    src={item.product.image}
                    alt={name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />

                  <div className="flex-1">
                    <Link
                      to={`/product/${item.product.id}`}
                      className="font-semibold text-gray-900 hover:text-owllayer-600 transition-colors"
                    >
                      {name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatPrice(item.product.price)} x {item.quantity}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <span className="font-bold text-owllayer-700">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      {t.wishlist.remove}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resume */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-bold text-lg text-gray-900 mb-4">{t.cart.summaryTitle}</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-gray-600"
                  >
                    <span>
                      {getProductName(item.product)} x{item.quantity}
                    </span>
                    <span>
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t.cart.total}</span>
                  <span className="text-owllayer-700">{formatPrice(total)}</span>
                </div>
              </div>

              <OwlLayerTool
                name="start_checkout"
                description={t.agent.startCheckoutToolDesc}
                action="click"
              >
                <Link
                  to="/checkout"
                  className="btn-primary w-full mt-6 py-3 text-center block"
                >
                  {t.cart.checkoutBtn} →
                </Link>
              </OwlLayerTool>

              <OwlLayerTool
                name="clear_cart"
                description={t.agent.clearCartToolDesc}
                risk="high"
                action="click"
              >
                <button
                  onClick={() => clearCart()}
                  className="w-full mt-3 text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  {t.cart.clearCart}
                </button>
              </OwlLayerTool>

              <div className="mt-6 p-3 bg-owllayer-50 rounded-lg border border-owllayer-200">
                <p className="text-xs text-owllayer-700">
                  <strong>OwlLayerTool:</strong> <code>start_checkout</code>, <code>clear_cart</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
