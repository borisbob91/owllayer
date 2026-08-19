import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSessionSnapshot, loadSessionSnapshot, saveSessionSnapshot } from '../src/runtime/sessionPersistence.js';

const KEY = 'owllayer_browser_test_session';

afterEach(() => {
  clearSessionSnapshot(KEY);
  vi.useRealTimers();
});

describe('sessionPersistence', () => {
  it('sauvegarde et relit un snapshot valide', () => {
    saveSessionSnapshot(KEY, {
      sessionId: 's_123',
      context: { page: 'home' },
      recentMessages: [{ role: 'user', content: 'hello', timestamp: Date.now() }],
    }, 10_000);

    const restored = loadSessionSnapshot(KEY);
    expect(restored?.sessionId).toBe('s_123');
    expect(restored?.context.page).toBe('home');
    expect(restored?.recentMessages).toHaveLength(1);
  });

  it('retourne null quand le snapshot est expire', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    saveSessionSnapshot(KEY, {
      sessionId: 's_exp',
      context: {},
      recentMessages: [],
    }, 1000);

    vi.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));

    const restored = loadSessionSnapshot(KEY);
    expect(restored).toBeNull();
  });
});
