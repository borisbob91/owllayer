import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WooContextBuilder } from '../context/WooContextBuilder.js';

function injectContextBlock(data: Record<string, unknown>): void {
  document.getElementById('domos-woo-context')?.remove();
  const el = document.createElement('script');
  el.id = 'domos-woo-context';
  el.type = 'application/json';
  el.textContent = JSON.stringify(data);
  document.body.appendChild(el);
}

function cleanContextBlock(): void {
  document.getElementById('domos-woo-context')?.remove();
}

describe('WooContextBuilder', () => {
  let builder: WooContextBuilder;

  beforeEach(() => {
    builder = new WooContextBuilder();
    cleanContextBlock();
    // Reset body classes
    document.body.className = '';
  });

  afterEach(() => {
    cleanContextBlock();
    document.body.className = '';
  });

  // ─── platform & siteUrl ───────────────────────────────────────────────────

  it('expose platform: woocommerce', () => {
    const ctx = builder.build();
    expect(ctx.platform).toBe('woocommerce');
  });

  it('siteUrl depuis le bloc JSON injecté', () => {
    injectContextBlock({ siteUrl: 'https://ma-boutique.com' });
    const ctx = builder.build();
    expect(ctx.siteUrl).toBe('https://ma-boutique.com');
  });

  it('siteUrl fallback sur window.location.origin si absent du bloc', () => {
    injectContextBlock({ pageType: 'home' });
    const ctx = builder.build();
    // jsdom default origin is 'http://localhost'
    expect(ctx.siteUrl).toBe(window.location.origin);
  });

  // ─── pageType depuis bloc JSON ────────────────────────────────────────────

  it('lit currentPage depuis le bloc JSON injecté', () => {
    injectContextBlock({ pageType: 'product', product: { name: 'T-Shirt' } });
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('product');
  });

  // ─── détection fallback via classes body ──────────────────────────────────

  it('détecte page produit via classe body single-product', () => {
    document.body.classList.add('single-product');
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('product');
  });

  it('détecte page category via classe body tax-product_cat', () => {
    document.body.classList.add('tax-product_cat');
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('category');
  });

  it('détecte page panier via woocommerce-cart', () => {
    document.body.classList.add('woocommerce-cart');
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('cart');
  });

  it('détecte page checkout via woocommerce-checkout', () => {
    document.body.classList.add('woocommerce-checkout');
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('checkout');
  });

  it('détecte page compte via woocommerce-account', () => {
    document.body.classList.add('woocommerce-account');
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('account');
  });

  it('fallback sur home si aucune classe reconnue', () => {
    const ctx = builder.build();
    expect(ctx.currentPage).toBe('home');
  });

  // ─── userLocation ─────────────────────────────────────────────────────────

  it('userLocation contient le nom du produit sur la page produit', () => {
    injectContextBlock({ pageType: 'product', product: { id: 1, name: 'Chemise Bleue' } });
    const ctx = builder.build();
    expect(ctx.userLocation).toContain('Chemise Bleue');
  });

  it('userLocation générique si pas de nom produit', () => {
    injectContextBlock({ pageType: 'product', product: null });
    const ctx = builder.build();
    expect(ctx.userLocation).toBe("L'utilisateur consulte le produit : ");
  });

  it('userLocation catégorie contient le nom de la catégorie', () => {
    injectContextBlock({ pageType: 'category', category: { id: 5, name: 'Vêtements' } });
    const ctx = builder.build();
    expect(ctx.userLocation).toContain('Vêtements');
  });

  it('userLocation panier', () => {
    document.body.classList.add('woocommerce-cart');
    const ctx = builder.build();
    expect(ctx.userLocation).toContain('Panier');
  });

  it('userLocation checkout', () => {
    document.body.classList.add('woocommerce-checkout');
    const ctx = builder.build();
    expect(ctx.userLocation).toContain('Commande');
  });

  // ─── availableActions ──────────────────────────────────────────────────────

  it('availableActions pour page produit contient add_to_cart', () => {
    injectContextBlock({ pageType: 'product' });
    const ctx = builder.build();
    const actions = ctx.availableActions as string[];
    expect(actions.some((a) => a.includes('add_to_cart'))).toBe(true);
  });

  it('availableActions pour page cart contient initiate_checkout', () => {
    document.body.classList.add('woocommerce-cart');
    const ctx = builder.build();
    const actions = ctx.availableActions as string[];
    expect(actions.some((a) => a.includes('initiate_checkout'))).toBe(true);
  });

  it('availableActions pour page home contient search_products', () => {
    const ctx = builder.build();
    const actions = ctx.availableActions as string[];
    expect(actions.some((a) => a.includes('search_products'))).toBe(true);
  });

  // ─── product / category / shop ────────────────────────────────────────────

  it('expose le produit depuis le bloc JSON', () => {
    const product = { id: 42, name: 'Pantalon Cargo', price: '59.99', inStock: true };
    injectContextBlock({ pageType: 'product', product });
    const ctx = builder.build();
    expect(ctx.product).toEqual(product);
  });

  it('product est null si absent du bloc', () => {
    injectContextBlock({ pageType: 'cart' });
    const ctx = builder.build();
    expect(ctx.product).toBeNull();
  });

  it('expose shop depuis le bloc JSON', () => {
    injectContextBlock({ shop: { name: 'Ma Boutique', currency: 'EUR' } });
    const ctx = builder.build();
    expect((ctx.shop as Record<string, string>).name).toBe('Ma Boutique');
    expect((ctx.shop as Record<string, string>).currency).toBe('EUR');
  });

  it('shop fallback sur document.title si bloc absent', () => {
    document.title = 'Boutique Test';
    const ctx = builder.build();
    expect((ctx.shop as Record<string, string>).name).toBe('Boutique Test');
  });

  // ─── customer ─────────────────────────────────────────────────────────────

  it('expose customer depuis le bloc JSON', () => {
    injectContextBlock({ customer: { isLoggedIn: true, id: 7, email: 'client@test.com' } });
    const ctx = builder.build();
    const customer = ctx.customer as Record<string, unknown>;
    expect(customer.isLoggedIn).toBe(true);
    expect(customer.id).toBe(7);
    expect(customer.email).toBe('client@test.com');
  });

  it('customer défaut isLoggedIn: false si absent', () => {
    injectContextBlock({ pageType: 'home' });
    const ctx = builder.build();
    expect((ctx.customer as Record<string, unknown>).isLoggedIn).toBe(false);
  });

  // ─── bloc JSON invalide ───────────────────────────────────────────────────

  it('gère silencieusement un bloc JSON malformé', () => {
    const el = document.createElement('script');
    el.id = 'domos-woo-context';
    el.type = 'application/json';
    el.textContent = '{ invalid json ';
    document.body.appendChild(el);
    // Should not throw
    expect(() => builder.build()).not.toThrow();
    const ctx = builder.build();
    expect(ctx.platform).toBe('woocommerce');
  });
});
