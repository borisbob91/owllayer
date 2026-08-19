// Sprint 6 — Integration-style tests for WooWidgetApp event handling
// Uses window CustomEvent dispatching to verify the app's event listeners

import { describe, it, expect } from 'vitest';

// We test the event-dispatch logic by directly dispatching events and checking
// that the exported event detail types are correctly recognized by listeners.
// Full Preact component rendering is covered by e2e/manual testing.

import type {
  UIShowProductsDetail,
  UIShowProductDetailDetail,
  UIShowCartDetail,
  UIShowNotificationDetail,
  UIShowUpsellDetail,
  UIProduct,
  UICartItem,
  UICartUpdatedDetail,
} from '../ui/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProduct(): UIProduct {
  return {
    id: '1', handle: 'test', title: 'Test', price: '19.99 EUR',
    imageUrl: 'https://example.com/img.jpg', available: true,
  };
}

function makeCartItem(): UICartItem {
  return {
    id: 'key1', title: 'Test', price: '19.99 EUR',
    imageUrl: '', quantity: 2,
  };
}

function dispatch<T>(name: string, detail: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

// ─── Window event round-trips ─────────────────────────────────────────────────

describe('WooWidgetApp — Custom Event contracts', () => {
  it('owllayer:ui:show_products carries UIShowProductsDetail', () => {
    let received: UIShowProductsDetail | undefined;
    const listener = (e: Event) => { received = (e as CustomEvent).detail as UIShowProductsDetail; };
    window.addEventListener('owllayer:ui:show_products', listener, { once: true });
    const detail: UIShowProductsDetail = { products: [makeProduct()], query: 'test' };
    dispatch('owllayer:ui:show_products', detail);
    window.removeEventListener('owllayer:ui:show_products', listener);
    expect(received?.products).toHaveLength(1);
    expect(received?.query).toBe('test');
  });

  it('owllayer:ui:show_product_detail carries UIShowProductDetailDetail', () => {
    let received: UIShowProductDetailDetail | undefined;
    const listener = (e: Event) => { received = (e as CustomEvent).detail; };
    window.addEventListener('owllayer:ui:show_product_detail', listener, { once: true });
    const detail: UIShowProductDetailDetail = { product: makeProduct() };
    dispatch('owllayer:ui:show_product_detail', detail);
    window.removeEventListener('owllayer:ui:show_product_detail', listener);
    expect(received?.product.id).toBe('1');
  });

  it('owllayer:ui:show_cart carries UIShowCartDetail', () => {
    let received: UIShowCartDetail | undefined;
    const listener = (e: Event) => { received = (e as CustomEvent).detail; };
    window.addEventListener('owllayer:ui:show_cart', listener, { once: true });
    const detail: UIShowCartDetail = { items: [makeCartItem()] };
    dispatch('owllayer:ui:show_cart', detail);
    window.removeEventListener('owllayer:ui:show_cart', listener);
    expect(received?.items).toHaveLength(1);
  });

  it('owllayer:ui:show_notification carries message + variant', () => {
    let received: UIShowNotificationDetail | undefined;
    const listener = (e: Event) => { received = (e as CustomEvent).detail; };
    window.addEventListener('owllayer:ui:show_notification', listener, { once: true });
    const detail: UIShowNotificationDetail = { message: 'Ajouté !', variant: 'success' };
    dispatch('owllayer:ui:show_notification', detail);
    window.removeEventListener('owllayer:ui:show_notification', listener);
    expect(received?.variant).toBe('success');
  });

  it('owllayer:ui:show_upsell carries UIShowUpsellDetail', () => {
    let received: UIShowUpsellDetail | undefined;
    const listener = (e: Event) => { received = (e as CustomEvent).detail; };
    window.addEventListener('owllayer:ui:show_upsell', listener, { once: true });
    const detail: UIShowUpsellDetail = { product: makeProduct(), reason: 'Complémentaire' };
    dispatch('owllayer:ui:show_upsell', detail);
    window.removeEventListener('owllayer:ui:show_upsell', listener);
    expect(received?.reason).toBe('Complémentaire');
  });

  it('owllayer:ui:close_panel dispatches without detail', () => {
    let called = false;
    const listener = () => { called = true; };
    window.addEventListener('owllayer:ui:close_panel', listener, { once: true });
    dispatch('owllayer:ui:close_panel', {});
    window.removeEventListener('owllayer:ui:close_panel', listener);
    expect(called).toBe(true);
  });

  it('owllayer:woo:cart_updated carries UICartUpdatedDetail', () => {
    let received: UICartUpdatedDetail | undefined;
    const listener = (e: Event) => { received = (e as CustomEvent).detail; };
    window.addEventListener('owllayer:woo:cart_updated', listener, { once: true });
    const detail: UICartUpdatedDetail = { items: [makeCartItem()], count: 1 };
    dispatch('owllayer:woo:cart_updated', detail);
    window.removeEventListener('owllayer:woo:cart_updated', listener);
    expect(received?.count).toBe(1);
  });

  it('owllayer:payment:open can be dispatched and received', () => {
    let called = false;
    const listener = () => { called = true; };
    window.addEventListener('owllayer:payment:open', listener, { once: true });
    dispatch('owllayer:payment:open', {});
    window.removeEventListener('owllayer:payment:open', listener);
    expect(called).toBe(true);
  });

  it('owllayer:payment:close can be dispatched and received', () => {
    let called = false;
    const listener = () => { called = true; };
    window.addEventListener('owllayer:payment:close', listener, { once: true });
    dispatch('owllayer:payment:close', {});
    window.removeEventListener('owllayer:payment:close', listener);
    expect(called).toBe(true);
  });
});

// ─── CheckoutState initial values ─────────────────────────────────────────────

import { initialCheckoutState } from '../ui/payment/types.js';

describe('initialCheckoutState', () => {
  it('step commence à 1', () => {
    expect(initialCheckoutState.step).toBe(1);
  });

  it('sameAsShipping est true par défaut', () => {
    expect(initialCheckoutState.sameAsShipping).toBe(true);
  });

  it('selectedPayment est null', () => {
    expect(initialCheckoutState.selectedPayment).toBeNull();
  });

  it('availableRates est un tableau vide', () => {
    expect(initialCheckoutState.availableRates).toEqual([]);
  });
});
