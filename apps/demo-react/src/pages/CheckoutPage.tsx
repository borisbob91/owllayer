import { useNavigate, Link } from 'react-router-dom';
import { useAgentTool, useAgentContext } from '@owllayer/react';
import { z } from 'zod';
import { useCart } from '../data/cart';
import {
  useOrder,
  SHIPPING_OPTIONS,
  type CheckoutStep,
  type ShippingMethod,
  type PaymentMethod,
} from '../data/order';
import { useI18n } from '../i18n';

// ============================================================
// Sous-composants par etape
// ============================================================

function StepIndicator({ current }: { current: CheckoutStep }) {
  const { t } = useI18n();
  const steps: { id: CheckoutStep; label: string }[] = [
    { id: 'address', label: t.checkout.addressTitle },
    { id: 'shipping', label: t.checkout.shippingTitle },
    { id: 'payment', label: t.checkout.paymentTitle },
    { id: 'review', label: t.checkout.reviewTitle },
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
                  ? 'bg-owllayer-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs font-medium ${
                i === currentIndex ? 'text-owllayer-600' : 'text-gray-400'
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
  const { t } = useI18n();

  const fields = [
    { key: 'firstName', label: t.checkout.firstName, type: 'text', placeholder: 'Jean' },
    { key: 'lastName', label: t.checkout.lastName, type: 'text', placeholder: 'Dupont' },
    { key: 'email', label: t.checkout.email, type: 'email', placeholder: 'jean.dupont@email.com' },
    { key: 'phone', label: t.checkout.phone, type: 'tel', placeholder: '+33 6 00 00 00 00' },
    { key: 'address', label: t.checkout.street, type: 'text', placeholder: '12 rue de la Paix' },
    { key: 'city', label: t.checkout.city, type: 'text', placeholder: 'Paris' },
    { key: 'postalCode', label: t.checkout.postalCode, type: 'text', placeholder: '75001' },
  ] as const;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.addressTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key} className={key === 'address' ? 'sm:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={address[key]}
              onChange={(e) => setAddress({ [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-owllayer-500 focus:border-transparent"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.checkout.country}</label>
          <select
            value={address.country}
            onChange={(e) => setAddress({ country: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-owllayer-500"
          >
            {([
              'france',
              'belgium',
              'switzerland',
              'luxembourg',
              'canada',
              'unitedStates',
              'unitedKingdom',
              'germany',
            ] as const).map((key) => {
              const name = t.countries[key] || key;
              return (
                <option key={key} value={name}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}

function ShippingStep() {
  const { shippingMethod, setShippingMethod } = useOrder();
  const { t, formatPrice } = useI18n();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.shippingTitle}</h2>
      <div className="space-y-3">
        {SHIPPING_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              shippingMethod === option.id
                ? 'border-owllayer-500 bg-owllayer-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="shipping"
              value={option.id}
              checked={shippingMethod === option.id}
              onChange={() => setShippingMethod(option.id)}
              className="accent-owllayer-600"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{option.label}</p>
              <p className="text-sm text-gray-500">{option.delay}</p>
            </div>
            <span className="font-bold text-owllayer-700">
              {option.price === 0 ? t.common.free : formatPrice(option.price)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PaymentStep() {
  const { payment, setPayment } = useOrder();
  const { t } = useI18n();

  const methods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: 'card', label: t.checkout.creditCard, icon: '💳' },
    { id: 'paypal', label: 'PayPal', icon: '🅿️' },
    { id: 'apple_pay', label: 'Apple Pay', icon: '🍎' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.paymentTitle}</h2>

      <div className="space-y-3 mb-6">
        {methods.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              payment.method === m.id
                ? 'border-owllayer-500 bg-owllayer-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="payment"
              value={m.id}
              checked={payment.method === m.id}
              onChange={() => setPayment({ method: m.id })}
              className="accent-owllayer-600"
            />
            <span className="text-xl">{m.icon}</span>
            <span className="font-semibold text-gray-900">{m.label}</span>
          </label>
        ))}
      </div>

      {payment.method === 'card' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.checkout.cardHolder}</label>
            <input
              type="text"
              value={payment.cardHolder || ''}
              onChange={(e) => setPayment({ cardHolder: e.target.value })}
              placeholder="Jean Dupont"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-owllayer-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.checkout.cardNumber}
            </label>
            <input
              type="text"
              value={payment.cardLast4 ? `**** **** **** ${payment.cardLast4}` : ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(-4);
                if (digits.length === 4) setPayment({ cardLast4: digits });
              }}
              placeholder="1234 5678 9012 3456"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-owllayer-500"
              maxLength={19}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ subtotal, shippingCost }: { subtotal: number; shippingCost: number }) {
  const { address, shippingOption, payment } = useOrder();
  const { items } = useCart();
  const { t, getProductName, formatPrice } = useI18n();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t.checkout.reviewTitle}</h2>

      {/* Articles */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-3">{t.cart.title} ({items.length})</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.product.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {getProductName(item.product)} × {item.quantity}
              </span>
              <span className="font-medium">
                {formatPrice(item.product.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Livraison */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">{t.checkout.shippingTitle}</h3>
        <p className="text-sm text-gray-600">
          {address.firstName} {address.lastName} — {address.address}, {address.postalCode}{' '}
          {address.city}, {address.country}
        </p>
        <p className="text-sm text-owllayer-600 mt-1">{shippingOption.label} — {shippingOption.delay}</p>
      </div>

      {/* Paiement */}
      <div className="card p-4 mb-4">
        <h3 className="font-semibold text-gray-700 mb-2">{t.checkout.paymentTitle}</h3>
        <p className="text-sm text-gray-600">
          {payment.method === 'card'
            ? `${t.checkout.creditCard} ${payment.cardLast4 ? `**** ${payment.cardLast4}` : ''}`
            : payment.method === 'paypal'
            ? 'PayPal'
            : 'Apple Pay'}
        </p>
      </div>

      {/* Total */}
      <div className="card p-4 bg-owllayer-50 border border-owllayer-200">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{t.checkout.subtotal}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-3">
          <span>{t.checkout.shipping}</span>
          <span>{shippingCost === 0 ? t.common.free : formatPrice(shippingCost)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-owllayer-700 border-t border-owllayer-200 pt-3">
          <span>{t.cart.total}</span>
          <span>{formatPrice(subtotal + shippingCost)}</span>
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
  const { t, locale, formatPrice, format } = useI18n();

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
    page: t.pages.checkout,
    checkoutStep: step,
    cartItemCount: items.length,
    cartTotal: formatPrice(total),
    addressFilled: isAddressComplete,
    shippingMethod: shippingOption.id,
    shippingLabel: shippingOption.label,
    shippingCost: formatPrice(shippingOption.price),
    address: {
      name: `${address.firstName} ${address.lastName}`.trim(),
      city: address.city,
      country: address.country,
    },
    language: locale,
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
      name: 'fill_checkout_form',
      description: t.agent.fillAddressToolDesc,
      schema: z.object({
        firstName: z.string().optional().describe(t.agent.firstNameParam),
        lastName: z.string().optional().describe(t.agent.lastNameParam),
        email: z.string().email().optional().describe(t.agent.emailParam),
        phone: z.string().optional().describe(t.agent.phoneParam),
        address: z.string().optional().describe(t.agent.addressParam),
        city: z.string().optional().describe(t.agent.cityParam),
        postalCode: z.string().optional().describe(t.agent.postalCodeParam),
        country: z.string().optional().describe(t.agent.countryParam),
      }),
      risk: 'none',
    },
    async (args) => {
      setStep('address');
      setAddress(args);
      return {
        success: true,
        filled: Object.keys(args).filter((k) => args[k as keyof typeof args]),
        message: t.agent.addressUpdated,
      };
    }
  );

  // Choisir la livraison
  useAgentTool<{ method: ShippingMethod }>(
    {
      name: 'select_shipping',
      description: `${t.agent.selectShippingToolDesc} Options: ${SHIPPING_OPTIONS.map(
        (o) => `${o.id} (${o.label}, ${o.delay}, ${o.price === 0 ? t.common.free : formatPrice(o.price)})`
      ).join(' | ')}`,
      schema: z.object({
        method: z
          .enum(['standard', 'express', 'pickup'])
          .describe(t.agent.shippingMethodParam),
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
        cost: option.price === 0 ? t.common.free : formatPrice(option.price),
      };
    }
  );

  // Choisir le paiement
  useAgentTool<{ method: string; cardHolder?: string }>(
    {
      name: 'select_payment',
      description: t.agent.selectPaymentToolDesc,
      schema: z.object({
        method: z
          .enum(['card', 'paypal', 'apple_pay'])
          .describe(t.agent.paymentMethodParam),
        cardHolder: z.string().optional().describe(t.agent.cardHolderParam),
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
      description: t.agent.setCheckoutStepToolDesc,
      schema: z.object({
        step: z
          .enum(['address', 'shipping', 'payment', 'review'])
          .describe(t.agent.checkoutStepParam),
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
      description: format(t.agent.confirmCheckoutToolDesc, {
        total: formatPrice(total + shippingOption.price),
      }),
      risk: 'critical',
    },
    async () => {
      handleConfirm();
      return { success: true, message: t.agent.orderConfirmed };
    }
  );

  if (items.length === 0 && step !== 'review') {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <p className="text-gray-500 text-lg">{t.cart.emptyTitle}</p>
        <Link to="/" className="btn-primary inline-block mt-6">
          {t.cart.startShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-owllayer-600 transition-colors">{t.nav.catalog}</Link>
        <span>/</span>
        <Link to="/cart" className="hover:text-owllayer-600 transition-colors">{t.nav.cart}</Link>
        <span>/</span>
        <span className="text-gray-900">{t.checkout.title}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t.checkout.title}</h1>

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
          {currentIndex === 0 ? `← ${t.product.backToCatalog}` : `← ${t.checkout.back}`}
        </button>

        {step !== 'review' ? (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.checkout.next} →
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            ✓ {t.checkout.confirm}
          </button>
        )}
      </div>
    </div>
  );
}
