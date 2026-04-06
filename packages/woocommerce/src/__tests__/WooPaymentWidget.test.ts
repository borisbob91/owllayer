// Sprint 6 — Unit tests for WooPaymentWidgetApp (inline checkout panel)
// Tests the component API without @testing-library/preact.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { h, render } from 'preact';

vi.mock('../ui/payment/steps/OrderSummary.js', () => ({
  OrderSummary: () => h('div', { 'data-testid': 'step-order-summary' }, null),
}));
vi.mock('../ui/payment/steps/AddressForm.js', () => ({
  AddressForm: () => h('div', { 'data-testid': 'step-address-form' }, null),
}));
vi.mock('../ui/payment/steps/ShippingRates.js', () => ({
  ShippingRates: () => h('div', { 'data-testid': 'step-shipping' }, null),
}));
vi.mock('../ui/payment/steps/PromoCode.js', () => ({
  PromoCode: () => h('div', { 'data-testid': 'step-promo' }, null),
}));
vi.mock('../ui/payment/steps/PaymentMethods.js', () => ({
  PaymentMethods: () => h('div', { 'data-testid': 'step-payment' }, null),
}));

import { WooPaymentWidgetApp } from '../ui/payment/WooPaymentWidgetApp.js';
import type { StoreApiClient } from '../api/StoreApiClient.js';

function makeApiMock(): StoreApiClient {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    del: vi.fn().mockResolvedValue({}),
  } as unknown as StoreApiClient;
}

describe('WooPaymentWidgetApp (inline panel)', () => {
  let container: HTMLDivElement;
  let api: StoreApiClient;
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api = makeApiMock();
    onClose = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it('rend .checkout-panel dans le container', () => {
    render(h(WooPaymentWidgetApp, { api, onClose }), container);
    expect(container.querySelector('.checkout-panel')).not.toBeNull();
  });

  it('affiche le titre checkout-title', () => {
    render(h(WooPaymentWidgetApp, { api, onClose }), container);
    const title = container.querySelector('.checkout-title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toMatch(/finaliser/i);
  });

  it('rend le stepper avec 5 step-dot', () => {
    render(h(WooPaymentWidgetApp, { api, onClose }), container);
    const dots = container.querySelectorAll('.step-dot');
    expect(dots.length).toBe(5);
  });

  it('affiche le step-dot actif sur l\'etape 1', () => {
    render(h(WooPaymentWidgetApp, { api, onClose }), container);
    const activeDot = container.querySelector('.step-dot.active');
    expect(activeDot).not.toBeNull();
    expect(activeDot!.textContent).toBe('1');
  });

  it('accepte stripeKey et paypalClientId sans erreur', () => {
    expect(() =>
      render(h(WooPaymentWidgetApp, { api, onClose, stripeKey: 'pk_test', paypalClientId: 'pp_001' }), container)
    ).not.toThrow();
  });
});