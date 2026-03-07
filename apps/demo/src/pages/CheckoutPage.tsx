import { useNavigate, Link } from 'react-router-dom';
import { useAgentTool, useAgentContext } from '@domos/react';
import { z } from 'zod';
import { useCart } from '../data/cart';
import {
  useOrder,
  SHIPPING_OPTIONS,
  type CheckoutStep,
  type ShippingMethod,
  type PaymentMethod,
} from '../data/order';

// ============================================================
// Sous-composants par etape
// ============================================================

function StepIndicator({ current }: { current: CheckoutStep }) {
  const steps: { id: CheckoutStep; label: string }[] = [
    { id: 'address', label: 'Adresse' },
    { id: 'shipping', label: 'Livraison' },
    { id: 'payment', label: 'Paiement' },
    { id: 'review', label: 'Confirmation' },
  ];
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                i < currentIndex
                  ? 'bg-green-500 text-white'
                  : i === currentIndex
                  ? 'bg-domos-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                i === currentIndex ? 'text-domos-600' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-0.5 mb-4 mx-1 transition-colors ${
                i < currentIndex ? 'bg-green-400' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function AddressStep() {
  const { address, setAddress } = useOrder();

  const fields = [
    { key: 'firstName', label: 'Prénom', type: 'text', placeholder: 'Jean' },
    { key: 'lastName', label: 'Nom', type: 'text', placeholder: 'Dupont' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'jean.dupont@email.com' },
    { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '+33 6 00 00 00 00' },
    { key: 'address', label: 'Adresse', type: 'text', placeholder: '12 rue de la Paix' },
    { key: 'city', label: 'Ville', type: 'text', placeholder: 'Paris' },
    { key: 'postalCode', label: 'Code postal', type: 'text', placeholder: '75001' },
  ] as const;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Adresse de livraison</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={address[key]}
              onChange={(e) => setAddress({ [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-domos-500 focus:border-transparent"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
          <select
            value={address.country}
            onChange={(e) => setAddress({ country: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-domos-500"
          >
            {['France', 'Belgique', 'Suisse', 'Luxembourg', 'Canada'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 p-3 bg-domos-50 rounded-xl border border-domos-200">
        <p className="text-xs text-domos-700">
          <strong>DomOS :</strong> Dites &ldquo;Remplis l&apos;adresse avec Jean Dupont, 12 rue de la Paix, Paris 75001&rdquo;
        </p>
      </div>
    </div>
  );
}

function ShippingStep() {
  const { shippingMethod, setShippingMethod } = useOrder();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Mode de livraison</h2>
      <div className="space-y-3">
        {SHIPPING_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              shippingMethod === option.id
                ? 'border-domos-500 bg-domos-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="shipping"
              value={option.id}
              checked={shippingMethod === option.id}
              onChange={() => setShippingMethod(option.id)}
              className="accent-domos-600"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{option.label}</p>
              <p className="text-sm text-gray-500">{option.delay}</p>
            </div>
            <span className="font-bold text-domos-700">
              {option.price === 0 ? 'Gratuit' : `${option.price.toFixed(2)} EUR`}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 p-3 bg-domos-50 rounded-xl border border-domos-200">
        <p className="text-xs text-domos-700">
          <strong>DomOS :</strong> Dites &ldquo;Choisir la livraison express&rdquo; ou &ldquo;Je veux retirer en magasin&rdquo;
        </p>
      </div>
    </div>
  );
}

function PaymentStep() {
  const { payment, setPayment } = useOrder();

  const methods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card', label: 'Carte bancaire', icon: '💳' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Mode de paiement</h2>

      <div className="space-y-3 mb-6">
        {methods.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              payment.method === m.id
                ? 'border-domos-500 bg-domos-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="payment"
              value={m.id}
              checked={payment.method === m.id}
              onChange={() => setPayment({ method: m.id })}
              className="accent-domos-600"
            />
            <span className="text-xl">{m.icon}</span>
            <span className="font-semibold text-gray-900">{m.label}</span>
          </label>
        ))}
      </div>

      {payment.method === 'card' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulaire</label>
            <input
              type="text"
              value={payment.cardHolder || ''}
              onChange={(e) => setPayment({ cardHolder: e.target.value })}
              placeholder="Jean Dupont"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-domos-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de carte
            </label>
            <input
              type="text"
              value={payment.cardLast4 ? `**** **** **** ${payment.cardLast4}` : ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(-4);
                if (digits.length === 4) setPayment({ cardLast4: digits });
              }}
              placeholder="1234 5678 9012 3456"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-domos-500"
              maxLength={19}
            />
          </div>
          <p className="text-xs text-gray-400">
            Demo — aucune donnée bancaire réelle n&apos;est traitée.
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-domos-50 rounded-xl border border-domos-200">
        <p className="text-xs text-domos-700">
          <strong>DomOS :</strong> Dites &ldquo;Payer par PayPal&rdquo; ou &ldquo;Utiliser une carte&rdquo;
        </p>
      </div>
    </div>
  );
}

function ReviewStep({ subtotal, shippingCost }: { subtotal: number; shippingCost: number }) {
  const { address, shippingOption, payment } = useOrder();
  const { items } = useCart();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Récapitulatif</h2>

      {/* Articles */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-3">Articles ({items.length})</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.product.name} × {item.quantity}
              </span>
              <span className="font-medium">
                {(item.product.price * item.quantity).toFixed(2)} EUR
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Livraison */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Livraison</h3>
        <p className="text-sm text-gray-600">
          {address.firstName} {address.lastName} — {address.address}, {address.postalCode}{' '}
          {address.city}, {address.country}
        </p>
        <p className="text-sm text-domos-600 mt-1">{shippingOption.label} — {shippingOption.delay}</p>
      </div>

      {/* Paiement */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">Paiement</h3>
        <p className="text-sm text-gray-600">
          {payment.method === 'card'
            ? `Carte ${payment.cardLast4 ? `**** ${payment.cardLast4}` : 'bancaire'}`
            : payment.method === 'paypal'
            ? 'PayPal'
            : 'Apple Pay'}
        </p>
      </div>

      {/* Total */}
      <div className="card p-4 bg-domos-50 border border-domos-200">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Sous-total</span>
          <span>{subtotal.toFixed(2)} EUR</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-3">
          <span>Livraison</span>
          <span>{shippingCost === 0 ? 'Gratuit' : `${shippingCost.toFixed(2)} EUR`}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-domos-700 border-t border-domos-200 pt-3">
          <span>Total</span>
          <span>{(subtotal + shippingCost).toFixed(2)} EUR</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const {
    step,
    address,
    shippingOption,
    isAddressComplete,
    setStep,
    setAddress,
    setShippingMethod,
    setPayment,
    confirmOrder,
  } = useOrder();

  const steps: CheckoutStep[] = ['address', 'shipping', 'payment', 'review'];
  const currentIndex = steps.indexOf(step);

  const canGoNext = () => {
    if (step === 'address') return isAddressComplete;
    if (step === 'shipping') return true;
    if (step === 'payment') return true;
    return true;
  };

  const handleNext = () => {
    const next = steps[currentIndex + 1];
    if (next) setStep(next);
  };

  const handleBack = () => {
    const prev = steps[currentIndex - 1];
    if (prev) setStep(prev);
    else navigate('/cart');
  };

  const handleConfirm = () => {
    const order = confirmOrder(items, total);
    clearCart();
    navigate(`/confirmation/${order.id}`);
  };

  // ============================================================
  // useAgentContext
  // ============================================================
  useAgentContext({
    page: 'checkout',
    checkoutStep: step,
    cartItemCount: items.length,
    cartTotal: total,
    addressFilled: isAddressComplete,
    shippingMethod: shippingOption.id,
    shippingLabel: shippingOption.label,
    shippingCost: shippingOption.price,
    address: {
      name: `${address.firstName} ${address.lastName}`.trim(),
      city: address.city,
      country: address.country,
    },
  });

  // ============================================================
  // useAgentTool - Tools specifiques au checkout
  // ============================================================

  // Remplir l'adresse via voix/texte
  useAgentTool<{
    firstName?: string; lastName?: string; email?: string; phone?: string;
    address?: string; city?: string; postalCode?: string; country?: string;
  }>(
    {
      name: 'fill_address',
      description: 'Remplir tout ou partie du formulaire d\'adresse de livraison. Passe automatiquement a l\'etape adresse.',
      schema: z.object({
        firstName: z.string().optional().describe('Prénom'),
        lastName: z.string().optional().describe('Nom'),
        email: z.string().email().optional().describe('Email'),
        phone: z.string().optional().describe('Téléphone'),
        address: z.string().optional().describe('Rue et numéro'),
        city: z.string().optional().describe('Ville'),
        postalCode: z.string().optional().describe('Code postal'),
        country: z.string().optional().describe('Pays (defaut: France)'),
      }),
      risk: 'none',
    },
    async (args) => {
      setStep('address');
      setAddress(args);
      return {
        success: true,
        filled: Object.keys(args).filter((k) => args[k as keyof typeof args]),
        message: 'Adresse mise a jour.',
      };
    }
  );

  // Choisir la livraison
  useAgentTool<{ method: ShippingMethod }>(
    {
      name: 'select_shipping',
      description: `Choisir le mode de livraison. Options: ${SHIPPING_OPTIONS.map(
        (o) => `${o.id} (${o.label}, ${o.delay}, ${o.price === 0 ? 'gratuit' : o.price + ' EUR'})`
      ).join(' | ')}`,
      schema: z.object({
        method: z
          .enum(['standard', 'express', 'pickup'])
          .describe('Mode de livraison'),
      }),
      risk: 'none',
    },
    async ({ method }) => {
      setStep('shipping');
      setShippingMethod(method);
      const option = SHIPPING_OPTIONS.find((o) => o.id === method)!;
      return {
        success: true,
        selected: option.label,
        delay: option.delay,
        cost: option.price === 0 ? 'Gratuit' : `${option.price.toFixed(2)} EUR`,
      };
    }
  );

  // Choisir le paiement
  useAgentTool<{ method: string; cardHolder?: string }>(
    {
      name: 'select_payment',
      description: 'Choisir le mode de paiement (card, paypal, apple_pay).',
      schema: z.object({
        method: z
          .enum(['card', 'paypal', 'apple_pay'])
          .describe('Methode de paiement'),
        cardHolder: z.string().optional().describe('Nom sur la carte (si methode card)'),
      }),
      risk: 'low',
    },
    async ({ method, cardHolder }) => {
      setStep('payment');
      setPayment({ method: method as PaymentMethod, cardHolder });
      return { success: true, method };
    }
  );

  // Avancer dans les etapes
  useAgentTool<{ step: CheckoutStep }>(
    {
      name: 'set_checkout_step',
      description: 'Naviguer vers une etape specifique du checkout (address, shipping, payment, review).',
      schema: z.object({
        step: z
          .enum(['address', 'shipping', 'payment', 'review'])
          .describe('Etape du checkout'),
      }),
      risk: 'none',
    },
    async ({ step: targetStep }) => {
      setStep(targetStep);
      return { success: true, step: targetStep };
    }
  );

  // Confirmer la commande (HITL critical)
  useAgentTool(
    {
      name: 'confirm_checkout',
      description: `Finaliser et confirmer la commande. Total: ${(total + shippingOption.price).toFixed(2)} EUR. Necessite approbation.`,
      risk: 'critical',
    },
    async () => {
      handleConfirm();
      return { success: true, message: 'Commande confirmee.' };
    }
  );

  if (items.length === 0 && step !== 'review') {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-gray-500 text-lg">Votre panier est vide</p>
        <Link to="/" className="btn-primary inline-block mt-6">
          Voir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-domos-600 transition-colors">Catalogue</Link>
        <span>/</span>
        <Link to="/cart" className="hover:text-domos-600 transition-colors">Panier</Link>
        <span>/</span>
        <span className="text-gray-900">Commande</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Finaliser la commande</h1>

      <StepIndicator current={step} />

      <div className="card p-6 mb-6">
        {step === 'address' && <AddressStep />}
        {step === 'shipping' && <ShippingStep />}
        {step === 'payment' && <PaymentStep />}
        {step === 'review' && (
          <ReviewStep subtotal={total} shippingCost={shippingOption.price} />
        )}
      </div>

      {/* Navigation etapes */}
      <div className="flex gap-4">
        <button
          onClick={handleBack}
          className="btn-secondary flex-1 py-3"
        >
          {currentIndex === 0 ? '← Retour au panier' : '← Retour'}
        </button>

        {step !== 'review' ? (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuer →
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            ✓ Confirmer la commande
          </button>
        )}
      </div>

      {/* Hint DomOS */}
      <div className="mt-6 p-4 bg-domos-50 rounded-xl border border-domos-200">
        <p className="text-sm font-medium text-domos-800 mb-1">Tools DomOS actifs :</p>
        <p className="text-xs text-domos-600">
          <code className="bg-domos-100 px-1 rounded">fill_address</code>,{' '}
          <code className="bg-domos-100 px-1 rounded">select_shipping</code>,{' '}
          <code className="bg-domos-100 px-1 rounded">select_payment</code>,{' '}
          <code className="bg-domos-100 px-1 rounded">set_checkout_step</code>,{' '}
          <code className="bg-domos-100 px-1 rounded">confirm_checkout</code> (HITL critical)
        </p>
      </div>
    </div>
  );
}
