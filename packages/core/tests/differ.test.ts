import { describe, it, expect } from 'vitest';
import {
  diffContext,
  hasChanges,
  createEmptyContext,
} from '../src/index.js';
import type { ShadowContext } from '../src/index.js';

function makeContext(overrides: Partial<ShadowContext> = {}): ShadowContext {
  return {
    url: '/home',
    data: {},
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('Context Differ', () => {
  describe('diffContext', () => {
    it('detecte un changement d\'URL', () => {
      const prev = makeContext({ url: '/home' });
      const curr = makeContext({ url: '/products' });
      const diff = diffContext(prev, curr);

      expect(diff.urlChanged).toBe(true);
      expect(diff.titleChanged).toBe(false);
    });

    it('detecte un changement de titre', () => {
      const prev = makeContext({ title: 'Accueil' });
      const curr = makeContext({ title: 'Produits' });
      const diff = diffContext(prev, curr);

      expect(diff.titleChanged).toBe(true);
    });

    it('detecte des cles ajoutees dans data', () => {
      const prev = makeContext({ data: {} });
      const curr = makeContext({ data: { userId: '123' } });
      const diff = diffContext(prev, curr);

      expect(diff.dataChanges.added).toEqual(['userId']);
    });

    it('detecte des cles supprimees dans data', () => {
      const prev = makeContext({ data: { userId: '123' } });
      const curr = makeContext({ data: {} });
      const diff = diffContext(prev, curr);

      expect(diff.dataChanges.removed).toEqual(['userId']);
    });

    it('detecte des cles modifiees dans data', () => {
      const prev = makeContext({ data: { count: 1 } });
      const curr = makeContext({ data: { count: 5 } });
      const diff = diffContext(prev, curr);

      expect(diff.dataChanges.modified).toEqual(['count']);
    });

    it('retourne aucun changement si identique', () => {
      const ctx = makeContext({ url: '/home', data: { x: 1 } });
      const diff = diffContext(ctx, ctx);

      expect(diff.urlChanged).toBe(false);
      expect(diff.titleChanged).toBe(false);
      expect(diff.dataChanges.added).toHaveLength(0);
      expect(diff.dataChanges.removed).toHaveLength(0);
      expect(diff.dataChanges.modified).toHaveLength(0);
    });
  });

  describe('hasChanges', () => {
    it('retourne false si aucun changement', () => {
      const ctx = makeContext();
      expect(hasChanges(diffContext(ctx, ctx))).toBe(false);
    });

    it('retourne true si URL change', () => {
      const prev = makeContext({ url: '/a' });
      const curr = makeContext({ url: '/b' });
      expect(hasChanges(diffContext(prev, curr))).toBe(true);
    });

    it('retourne true si data change', () => {
      const prev = makeContext({ data: {} });
      const curr = makeContext({ data: { new: true } });
      expect(hasChanges(diffContext(prev, curr))).toBe(true);
    });
  });

  describe('createEmptyContext', () => {
    it('cree un contexte vide', () => {
      const ctx = createEmptyContext();

      expect(ctx.url).toBe('');
      expect(ctx.data).toEqual({});
      expect(ctx.updatedAt).toBeGreaterThan(0);
    });
  });
});
