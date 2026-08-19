import { generateId } from '../utils/uuid.js';

/**
 * Retourne un identifiant permanent pour ce navigateur/appareil.
 *
 * Le UUID est généré une seule fois et stocké dans localStorage sous `storageKey`.
 * Stable entre rechargements, onglets, et sessions.
 *
 * Retourne 'ssr-anon' en environnement SSR (sans localStorage).
 */
export function getBrowserId(storageKey = 'owllayer_browser_id'): string {
  if (typeof localStorage === 'undefined') return 'ssr-anon';
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const id = generateId();
    localStorage.setItem(storageKey, id);
    return id;
  } catch {
    return 'storage-error-anon';
  }
}
