import { useState, useCallback } from 'react';
import type { CartItem } from './cart';

// ============================================================
// Types
// ============================================================

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export type PaymentMethod = 'card' | 'paypal' | 'apple_pay';

export interface PaymentInfo {
  method: PaymentMethod;
  /** Masque — jamais les vrais chiffres */
  cardLast4?: string;
  cardHolder?: string;
}

export type ShippingMethod = 'standard' | 'express' | 'pickup';

export interface ShippingOption {
  id: ShippingMethod;
  label: string;
  delay: string;
  price: number;
}

export type CheckoutStep = 'address' | 'shipping' | 'payment' | 'review';

export interface Order {
  id: string;
  items: CartItem[];
  shipping: ShippingAddress;
  shippingMethod: ShippingMethod;
  payment: PaymentInfo;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
}

// ============================================================
// Constantes
// ============================================================

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'standard', label: 'Livraison Standard', delay: '5-7 jours ouvrés', price: 4.99 },
  { id: 'express', label: 'Livraison Express', delay: '1-2 jours ouvrés', price: 9.99 },
  { id: 'pickup', label: 'Retrait en magasin', delay: 'Disponible sous 2h', price: 0 },
];

export const EMPTY_ADDRESS: ShippingAddress = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
};

// ============================================================
// Global checkout state
// ============================================================

let globalCheckout: {
  step: CheckoutStep;
  address: ShippingAddress;
  shippingMethod: ShippingMethod;
  payment: Partial<PaymentInfo>;
  confirmedOrder: Order | null;
} = {
  step: 'address',
  address: { ...EMPTY_ADDRESS },
  shippingMethod: 'standard',
  payment: { method: 'card' },
  confirmedOrder: null,
};

let checkoutListeners: Array<() => void> = [];

function notifyCheckout() {
  checkoutListeners.forEach((fn) => fn());
}

// ============================================================
// Hook
// ============================================================

export function useOrder() {
  const [, forceUpdate] = useState(0);

  useState(() => {
    const listener = () => forceUpdate((n) => n + 1);
    checkoutListeners.push(listener);
    return () => {
      checkoutListeners = checkoutListeners.filter((l) => l !== listener);
    };
  });

  const setStep = useCallback((step: CheckoutStep) => {
    globalCheckout = { ...globalCheckout, step };
    notifyCheckout();
  }, []);

  const setAddress = useCallback((address: Partial<ShippingAddress>) => {
    globalCheckout = {
      ...globalCheckout,
      address: { ...globalCheckout.address, ...address },
    };
    notifyCheckout();
  }, []);

  const setShippingMethod = useCallback((method: ShippingMethod) => {
    globalCheckout = { ...globalCheckout, shippingMethod: method };
    notifyCheckout();
  }, []);

  const setPayment = useCallback((payment: Partial<PaymentInfo>) => {
    globalCheckout = {
      ...globalCheckout,
      payment: { ...globalCheckout.payment, ...payment },
    };
    notifyCheckout();
  }, []);

  const confirmOrder = useCallback((items: CartItem[], subtotal: number): Order => {
    const shippingOption = SHIPPING_OPTIONS.find(
      (o) => o.id === globalCheckout.shippingMethod
    )!;
    const order: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      items,
      shipping: { ...globalCheckout.address },
      shippingMethod: globalCheckout.shippingMethod,
      payment: globalCheckout.payment as PaymentInfo,
      subtotal,
      shippingCost: shippingOption.price,
      total: subtotal + shippingOption.price,
      createdAt: Date.now(),
      status: 'confirmed',
    };

    globalCheckout = {
      step: 'address',
      address: { ...EMPTY_ADDRESS },
      shippingMethod: 'standard',
      payment: { method: 'card' },
      confirmedOrder: order,
    };

    notifyCheckout();
    return order;
  }, []);

  const resetCheckout = useCallback(() => {
    globalCheckout = {
      step: 'address',
      address: { ...EMPTY_ADDRESS },
      shippingMethod: 'standard',
      payment: { method: 'card' },
      confirmedOrder: null,
    };
    notifyCheckout();
  }, []);

  const shippingOption = SHIPPING_OPTIONS.find(
    (o) => o.id === globalCheckout.shippingMethod
  )!;

  const isAddressComplete = () => {
    const a = globalCheckout.address;
    return !!(a.firstName && a.lastName && a.email && a.address && a.city && a.postalCode);
  };

  return {
    step: globalCheckout.step,
    address: globalCheckout.address,
    shippingMethod: globalCheckout.shippingMethod,
    shippingOption,
    payment: globalCheckout.payment,
    confirmedOrder: globalCheckout.confirmedOrder,
    isAddressComplete: isAddressComplete(),
    setStep,
    setAddress,
    setShippingMethod,
    setPayment,
    confirmOrder,
    resetCheckout,
  };
}
