// Sprint 7 — Tests unitaires pour storeIdentity.ts
// Couvre: resolveSiteUrl(), validateApiKey(), normalization

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveSiteUrl, validateApiKey } from '../utils/storeIdentity.js';

// ─── resolveSiteUrl ───────────────────────────────────────────────────────────

describe('resolveSiteUrl()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retourne configSiteUrl normalisé si fourni (avec trailing slash)', () => {
    expect(resolveSiteUrl('https://www.ma-boutique.com/')).toBe('https://www.ma-boutique.com');
  });

  it('retourne configSiteUrl normalisé sans trailing slash', () => {
    expect(resolveSiteUrl('https://ma-boutique.com')).toBe('https://ma-boutique.com');
  });

  it('préserve le sous-domaine (www)', () => {
    expect(resolveSiteUrl('https://www.boutique.fr')).toBe('https://www.boutique.fr');
  });

  it('préserve le port non-standard', () => {
    expect(resolveSiteUrl('https://shop.example.com:8443')).toBe('https://shop.example.com:8443');
  });

  it('supprime le port 80 (HTTP par défaut)', () => {
    // La spec URL supprime les ports par défaut pour le protocole
    expect(resolveSiteUrl('http://example.com:80')).toBe('http://example.com');
  });

  it('supprime le port 443 (HTTPS par défaut)', () => {
    expect(resolveSiteUrl('https://example.com:443')).toBe('https://example.com');
  });

  it('utilise window.location.origin si configSiteUrl absent', () => {
    vi.stubGlobal('window', { location: { origin: 'https://la-boutique.com' } });
    expect(resolveSiteUrl()).toBe('https://la-boutique.com');
  });

  it('retourne chaîne vide si window indisponible (SSR) et pas de config', () => {
    vi.stubGlobal('window', undefined);
    expect(resolveSiteUrl()).toBe('');
  });

  it('gere une URL invalide gracieusement (sans erreur)', () => {
    const result = resolveSiteUrl('pas-une-url');
    expect(typeof result).toBe('string');
  });
});

// ─── validateApiKey ───────────────────────────────────────────────────────────

describe('validateApiKey()', () => {
  // Clés valides
  it('accepte une clé pk_live_woo_ valide', () => {
    expect(validateApiKey('pk_live_woo_a3f8b2_x9kL4mN7pQ2')).toBe(true);
  });

  it('accepte une clé pk_dev_woo_ valide', () => {
    expect(validateApiKey('pk_dev_woo_c1d2e3_AbCdEfGhIj')).toBe(true);
  });

  it('accepte une clé avec partie random longue', () => {
    expect(validateApiKey('pk_live_woo_aabbcc_xYz1234567890AbCdEfG')).toBe(true);
  });

  // Clés invalides
  it('rejette une clé Shopify (mauvaise plateforme)', () => {
    expect(validateApiKey('pk_live_shopify_a3f8b2_x9kL4mN7pQ2')).toBe(false);
  });

  it('rejette une clé sans préfixe pk_', () => {
    expect(validateApiKey('sk_live_woo_a3f8b2_x9kL4mN7pQ2')).toBe(false);
  });

  it('rejette une clé avec hash trop court (< 6 chars)', () => {
    expect(validateApiKey('pk_live_woo_a3f8_x9kL4mN7pQ2')).toBe(false);
  });

  it('rejette une clé avec random trop court (< 10 chars)', () => {
    expect(validateApiKey('pk_live_woo_a3f8b2_x9kL4')).toBe(false);
  });

  it('rejette une clé vide', () => {
    expect(validateApiKey('')).toBe(false);
  });

  it('rejette une clé avec env inconnu (pk_staging_woo_)', () => {
    expect(validateApiKey('pk_staging_woo_a3f8b2_x9kL4mN7pQ2')).toBe(false);
  });

  it('rejette une clé avec majuscules dans le hash (hash doit être [a-z0-9])', () => {
    expect(validateApiKey('pk_live_woo_A3F8B2_x9kL4mN7pQ2')).toBe(false);
  });
});
