/**
 * storeIdentity — Utilitaires d'identité de boutique (Sprint 7 — Store Connect)
 *
 * Fournit :
 *   - resolveSiteUrl()  : auto-détection + normalisation de l'URL boutique
 *   - validateApiKey()  : validation du format de clé API OwlLayer WooCommerce
 */

/**
 * Détermine l'URL canonique de la boutique.
 * Priorité : configSiteUrl fourni > window.location.origin > chaîne vide.
 * Normalise : protocole + hostname + port optionnel (sans chemin ni trailing slash).
 */
export function resolveSiteUrl(configSiteUrl?: string): string {
  if (configSiteUrl) return normalizeSiteUrl(configSiteUrl);
  if (typeof window !== 'undefined') return normalizeSiteUrl(window.location.origin);
  return '';
}

/**
 * Valide le format d'une clé API OwlLayer WooCommerce.
 * Format attendu : pk_(live|dev)_woo_{6 chars hex}_{10+ chars alphanumériques}
 * Exemples valides :
 *   pk_live_woo_a3f8b2_x9kL4mN7pQ2
 *   pk_dev_woo_c1d2e3_AbCdEfGhIj
 */
export function validateApiKey(key: string): boolean {
  return /^pk_(live|dev)_woo_[a-z0-9]{6}_[a-zA-Z0-9]{10,}$/.test(key);
}

function normalizeSiteUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.port ? ':' + u.port : ''}`;
  } catch {
    // URL invalide — retirer trailing slash et passer en minuscule
    return url.replace(/\/$/, '').toLowerCase();
  }
}
