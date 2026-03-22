import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readCustomerContext, getCustomerAccessToken } from '../context/CustomerContext.js';

declare const window: Window & {
  __st?: { cid?: number | string };
  __domos_customer_token?: string;
};

describe('CustomerContext', () => {
  beforeEach(() => {
    delete (window as Window & { __st?: unknown }).__st;
    delete (window as Window & { __domos_customer_token?: unknown }).__domos_customer_token;
  });

  afterEach(() => {
    delete (window as Window & { __st?: unknown }).__st;
    delete (window as Window & { __domos_customer_token?: unknown }).__domos_customer_token;
  });

  describe('readCustomerContext', () => {
    it('retourne isLoggedIn: false quand __st absent', () => {
      const ctx = readCustomerContext();
      expect(ctx.isLoggedIn).toBe(false);
      expect(ctx.id).toBeUndefined();
    });

    it('retourne isLoggedIn: false quand cid est 0', () => {
      (window as Window & { __st?: unknown }).__st = { cid: 0 };
      const ctx = readCustomerContext();
      expect(ctx.isLoggedIn).toBe(false);
    });

    it('retourne isLoggedIn: true et id quand cid est défini', () => {
      (window as Window & { __st?: unknown }).__st = { cid: 123456 };
      const ctx = readCustomerContext();
      expect(ctx.isLoggedIn).toBe(true);
      expect(ctx.id).toBe('123456');
    });

    it('accepte cid sous forme de string', () => {
      (window as Window & { __st?: unknown }).__st = { cid: '789' };
      const ctx = readCustomerContext();
      expect(ctx.isLoggedIn).toBe(true);
      expect(ctx.id).toBe('789');
    });
  });

  describe('getCustomerAccessToken', () => {
    it('retourne undefined quand __domos_customer_token absent', () => {
      expect(getCustomerAccessToken()).toBeUndefined();
    });

    it('retourne le token quand injecté', () => {
      (window as Window & { __domos_customer_token?: unknown }).__domos_customer_token = 'tok_abc123';
      expect(getCustomerAccessToken()).toBe('tok_abc123');
    });
  });
});
