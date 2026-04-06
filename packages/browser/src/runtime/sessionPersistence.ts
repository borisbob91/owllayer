import type { PersistedBrowserSession } from '../types.js';

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export function loadSessionSnapshot(storageKey: string): PersistedBrowserSession | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedBrowserSession;
    if (!parsed || parsed.version !== 1) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(storageKey);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveSessionSnapshot(
  storageKey: string,
  data: Omit<PersistedBrowserSession, 'version' | 'savedAt' | 'expiresAt'>,
  ttlMs?: number
): void {
  if (typeof localStorage === 'undefined') return;

  const now = Date.now();
  const snapshot: PersistedBrowserSession = {
    ...data,
    version: 1,
    savedAt: now,
    expiresAt: now + (ttlMs ?? DEFAULT_TTL_MS),
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Ignore quota/security errors to keep SDK non-blocking.
  }
}

export function clearSessionSnapshot(storageKey: string): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.removeItem(storageKey);
  } catch {
    // noop
  }
}
