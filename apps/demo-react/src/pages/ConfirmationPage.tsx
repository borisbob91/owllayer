import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAgentTool, useAgentContext } from '@owllayer/react';
import { useOrder } from '../data/order';
import { useI18n } from '../i18n';

export function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { confirmedOrder, resetCheckout } = useOrder();
  const { t, locale, getProductName, formatPrice } = useI18n();

  // Si on arrive ici sans commande confirmee, rediriger
  useEffect(() => {
    if (!confirmedOrder) {
      navigate('/', { replace: true });
    }
  }, [confirmedOrder, navigate]);

  useAgentContext({
    page: t.pages.orderConfirmation,
    orderId: confirmedOrder?.id ?? orderId ?? null,
    orderStatus: confirmedOrder?.status ?? null,
    orderTotal: confirmedOrder?.total ? formatPrice(confirmedOrder.total) : null,
    itemCount: confirmedOrder?.items.length ?? null,
    language: locale,
  });

  useAgentTool(
    {
      name: 'continue_shopping',
      description: t.agent.continueShoppingConfirmationToolDesc,
      risk: 'none',
    },
    async () => {
      resetCheckout();
      navigate('/');
      return t.nav.catalog;
    }
  );

  useAgentTool(
    {
      name: 'view_order_details',
      description: t.agent.viewOrderDetailsToolDesc,
      risk: 'none',
    },
    async () => {
      if (!confirmedOrder) return { error: t.agent.noConfirmedOrder };
      return {
        orderId: confirmedOrder.id,
        status: confirmedOrder.status,
        items: confirmedOrder.items.map((i) => ({
          name: getProductName(i.product),
          quantity: i.quantity,
          subtotal: formatPrice(i.product.price * i.quantity),
        })),
        shipping: `${confirmedOrder.shipping.firstName} ${confirmedOrder.shipping.lastName}, ${confirmedOrder.shipping.address}, ${confirmedOrder.shipping.postalCode} ${confirmedOrder.shipping.city}`,
        shippingMethod: confirmedOrder.shippingMethod,
        subtotal: formatPrice(confirmedOrder.subtotal),
        shippingCost: formatPrice(confirmedOrder.shippingCost),
        total: formatPrice(confirmedOrder.total),
      };
    }
  );

  if (!confirmedOrder) return null;

  return (
    <div className="max-w-2xl mx-auto text-center">
      {/* Succes */}
      <div className="card p-10 mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.confirmation.title}</h1>
        <p className="text-gray-500 mb-6">
          {t.confirmation.thankYou} ({confirmedOrder.shipping.email})
        </p>

        <div className="inline-flex items-center gap-2 bg-owllayer-50 text-owllayer-700 px-4 py-2 rounded-full border border-owllayer-200 text-sm font-medium">
          <span>{t.confirmation.orderNumber}:</span>
          <code className="font-bold">{confirmedOrder.id}</code>
        </div>
      </div>

      {/* Resume commande */}
      <div className="card p-6 mb-6 text-left">
        <h2 className="font-bold text-gray-900 mb-4">{t.confirmation.orderSummary}</h2>

        <div className="space-y-2 mb-4">
          {confirmedOrder.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3">
              <img
                src={item.product.image}
                alt={getProductName(item.product)}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-900">{getProductName(item.product)}</p>
                <p className="text-gray-500">× {item.quantity}</p>
              </div>
              <span className="text-sm font-bold text-owllayer-700">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{t.confirmation.subtotal}</span>
            <span>{formatPrice(confirmedOrder.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>{t.confirmation.shipping} ({confirmedOrder.shippingMethod})</span>
            <span>
              {confirmedOrder.shippingCost === 0
                ? t.common.free
                : formatPrice(confirmedOrder.shippingCost)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-base text-owllayer-700 pt-2 border-t border-gray-100">
            <span>{t.confirmation.totalPaid}</span>
            <span>{formatPrice(confirmedOrder.total)}</span>
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div className="card p-6 mb-8 text-left">
        <h2 className="font-bold text-gray-900 mb-3">{t.checkout.shippingTitle}</h2>
        <p className="text-sm text-gray-700">
          {confirmedOrder.shipping.firstName} {confirmedOrder.shipping.lastName}
        </p>
        <p className="text-sm text-gray-600">{confirmedOrder.shipping.address}</p>
        <p className="text-sm text-gray-600">
          {confirmedOrder.shipping.postalCode} {confirmedOrder.shipping.city},{' '}
          {confirmedOrder.shipping.country}
        </p>
        <p className="text-sm text-gray-600 mt-1">{confirmedOrder.shipping.email}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          to="/"
          onClick={resetCheckout}
          className="btn-primary flex-1 py-3 text-center"
        >
          {t.confirmation.continueShopping}
        </Link>
      </div>
    </div>
  );
}
