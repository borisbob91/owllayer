import { useState, useCallback } from 'react';
import type { Product } from './products';

export interface CartItem {
  product: Product;
  quantity: number;
}

let globalCart: CartItem[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function useCart() {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  // Appeler subscribe au mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  const addToCart = useCallback((product: Product, quantity = 1) => {
    const existing = globalCart.find((item) => item.product.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      globalCart.push({ product, quantity });
    }
    notify();
    return globalCart;
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    globalCart = globalCart.filter((item) => item.product.id !== productId);
    notify();
    return globalCart;
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      globalCart = globalCart.filter((item) => item.product.id !== productId);
    } else {
      const item = globalCart.find((item) => item.product.id === productId);
      if (item) item.quantity = quantity;
    }
    notify();
    return globalCart;
  }, []);

  const clearCart = useCallback(() => {
    globalCart = [];
    notify();
    return globalCart;
  }, []);

  const total = globalCart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return {
    items: globalCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    total,
    itemCount: globalCart.reduce((sum, item) => sum + item.quantity, 0),
  };
}
