import { useState, useCallback } from 'react';
import type { Product } from './products';

// ---------------------------------------------------------------------------
// Store global wishlist — meme pattern que cart.ts
// ---------------------------------------------------------------------------
let globalWishlist: Product[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((fn) => fn());
}

export function useWishlist() {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  const addToWishlist = useCallback((product: Product) => {
    if (!globalWishlist.find((p) => p.id === product.id)) {
      globalWishlist = [...globalWishlist, product];
      notify();
    }
    return globalWishlist;
  }, []);

  const removeFromWishlist = useCallback((productId: string) => {
    globalWishlist = globalWishlist.filter((p) => p.id !== productId);
    notify();
    return globalWishlist;
  }, []);

  const clearWishlist = useCallback(() => {
    globalWishlist = [];
    notify();
    return globalWishlist;
  }, []);

  const isInWishlist = useCallback(
    (productId: string) => globalWishlist.some((p) => p.id === productId),
    []
  );

  return {
    items: globalWishlist,
    count: globalWishlist.length,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
  };
}
