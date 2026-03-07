import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAgentTool, useAgentContext } from '@domos/react';
import { useOrder } from '../data/order';

export function ConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { confirmedOrder, resetCheckout } = useOrder();

  // Si on arrive ici sans commande confirmee, rediriger
  useEffect(() => {
    if (!confirmedOrder) {
      navigate('/', { replace: true });
    }
  }, [confirmedOrder, navigate]);

  useAgentContext({
    page: 'order_confirmation',
    orderId: confirmedOrder?.id ?? orderId ?? null,
    orderStatus: confirmedOrder?.status ?? null,
    orderTotal: confirmedOrder?.total ?? null,
    itemCount: confirmedOrder?.items.length ?? null,
  });

  useAgentTool(
    {
      name: 'continue_shopping',
      description: 'Retourner au catalogue pour continuer les achats apres la confirmation de commande.',
      risk: 'none',
    },
    async () => {
      resetCheckout();
      navigate('/');
      return 'Retour au catalogue.';
    }
  );

  useAgentTool(
    {
      name: 'view_order_details',
      description: 'Lire le detail de la commande confirmee (articles, adresse, total).',
      risk: 'none',
    },
    async () => {
      if (!confirmedOrder) return { error: 'Aucune commande confirmee.' };
      return {
        orderId: confirmedOrder.id,
        status: confirmedOrder.status,
        items: confirmedOrder.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          subtotal: (i.product.price * i.quantity).toFixed(2) + ' EUR',
        })),
        shipping: `${confirmedOrder.shipping.firstName} ${confirmedOrder.shipping.lastName}, ${confirmedOrder.shipping.address}, ${confirmedOrder.shipping.postalCode} ${confirmedOrder.shipping.city}`,
        shippingMethod: confirmedOrder.shippingMethod,
        subtotal: confirmedOrder.subtotal.toFixed(2) + ' EUR',
        shippingCost: confirmedOrder.shippingCost.toFixed(2) + ' EUR',
        total: confirmedOrder.total.toFixed(2) + ' EUR',
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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Commande confirmée !</h1>
        <p className="text-gray-500 mb-6">
          Merci pour votre achat. Un email de confirmation a été envoyé à{' '}
          <strong>{confirmedOrder.shipping.email}</strong>.
        </p>

        <div className="inline-flex items-center gap-2 bg-domos-50 text-domos-700 px-4 py-2 rounded-full border border-domos-200 text-sm font-medium">
          <span>Commande</span>
          <code className="font-bold">{confirmedOrder.id}</code>
        </div>
      </div>

      {/* Resume commande */}
      <div className="card p-6 mb-6 text-left">
        <h2 className="font-bold text-gray-900 mb-4">Récapitulatif</h2>

        <div className="space-y-2 mb-4">
          {confirmedOrder.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex-1 text-sm">
                <p className="font-medium text-gray-900">{item.product.name}</p>
                <p className="text-gray-500">× {item.quantity}</p>
              </div>
              <span className="text-sm font-bold text-domos-700">
                {(item.product.price * item.quantity).toFixed(2)} EUR
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Sous-total</span>
            <span>{confirmedOrder.subtotal.toFixed(2)} EUR</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Livraison ({confirmedOrder.shippingMethod})</span>
            <span>
              {confirmedOrder.shippingCost === 0
                ? 'Gratuit'
                : `${confirmedOrder.shippingCost.toFixed(2)} EUR`}
            </span>
          </div>
          <div className="flex justify-between font-bold text-base text-domos-700 pt-2 border-t border-gray-100">
            <span>Total payé</span>
            <span>{confirmedOrder.total.toFixed(2)} EUR</span>
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div className="card p-6 mb-8 text-left">
        <h2 className="font-bold text-gray-900 mb-3">Livraison</h2>
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
          Continuer les achats
        </Link>
      </div>

      {/* Hint DomOS */}
      <div className="mt-6 p-4 bg-domos-50 rounded-xl border border-domos-200 text-left">
        <p className="text-xs text-domos-700">
          <strong>DomOS :</strong> Dites &ldquo;Dis-moi le détail de ma commande&rdquo; ou{' '}
          &ldquo;Retourner au catalogue&rdquo;
        </p>
      </div>
    </div>
  );
}
