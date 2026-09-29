import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, ToolLimitError, RiskLevel } from '../src/index.js';
import type { ToolDefinition } from '../src/index.js';

function makeTool(name: string, componentId?: string): ToolDefinition {
  return {
    name,
    description: `Tool ${name}`,
    risk: RiskLevel.NONE,
    source: 'client',
    componentId,
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('add / get / remove', () => {
    it('ajoute et recupere un tool', () => {
      registry.add(makeTool('search'));

      expect(registry.has('search')).toBe(true);
      expect(registry.get('search')?.name).toBe('search');
      expect(registry.size).toBe(1);
    });

    it('remplace un tool existant avec le meme nom', () => {
      registry.add(makeTool('search'));
      registry.add({ ...makeTool('search'), description: 'Updated' });

      expect(registry.size).toBe(1);
      expect(registry.get('search')?.description).toBe('Updated');
    });

    it('supprime un tool', () => {
      registry.add(makeTool('search'));

      expect(registry.remove('search')).toBe(true);
      expect(registry.has('search')).toBe(false);
      expect(registry.size).toBe(0);
    });

    it('retourne false si le tool n\'existe pas', () => {
      expect(registry.remove('inexistant')).toBe(false);
    });
  });

  describe('removeByComponent', () => {
    it('supprime tous les tools d\'un composant', () => {
      registry.add(makeTool('like', 'comp_1'));
      registry.add(makeTool('share', 'comp_1'));
      registry.add(makeTool('search', 'comp_2'));

      const removed = registry.removeByComponent('comp_1');

      expect(removed).toEqual(['like', 'share']);
      expect(registry.size).toBe(1);
      expect(registry.has('search')).toBe(true);
    });
  });

  describe('getDeclarations', () => {
    it('retourne les declarations sans handler', () => {
      const tool = makeTool('search');
      tool.handler = async () => ({ results: [] });
      registry.add(tool);

      const declarations = registry.getDeclarations();

      expect(declarations).toHaveLength(1);
      expect(declarations[0].name).toBe('search');
      expect((declarations[0] as any).handler).toBeUndefined();
    });
  });

  describe('diff / flush', () => {
    it('detecte les tools ajoutes', () => {
      registry.add(makeTool('search'));
      registry.add(makeTool('cart'));

      const diff = registry.diff();

      expect(diff.added).toHaveLength(2);
      expect(diff.removed).toHaveLength(0);
    });

    it('flush met a jour le snapshot', () => {
      registry.add(makeTool('search'));
      registry.flush();

      // Pas de changement
      const diff = registry.diff();
      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
    });

    it('detecte les tools supprimes apres flush', () => {
      registry.add(makeTool('search'));
      registry.add(makeTool('cart'));
      registry.flush();

      registry.remove('search');
      const diff = registry.diff();

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toEqual(['search']);
    });

    it('detecte les ajouts et suppressions combines', () => {
      registry.add(makeTool('search'));
      registry.flush();

      registry.remove('search');
      registry.add(makeTool('checkout'));

      const diff = registry.flush();

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].name).toBe('checkout');
      expect(diff.removed).toEqual(['search']);
    });
  });

  describe('limites', () => {
    it('refuse d\'ajouter au-dela de la limite', () => {
      const small = new ToolRegistry(2);
      small.add(makeTool('a'));
      small.add(makeTool('b'));

      expect(() => small.add(makeTool('c'))).toThrow('nombre max');
    });

    it('permet de remplacer meme a la limite', () => {
      const small = new ToolRegistry(2);
      small.add(makeTool('a'));
      small.add(makeTool('b'));

      // Remplacer ne devrait pas throw
      expect(() => small.add(makeTool('a'))).not.toThrow();
    });
  });

  describe('clear', () => {
    it('vide le registre et le snapshot', () => {
      registry.add(makeTool('search'));
      registry.flush();
      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.diff().added).toHaveLength(0);
      expect(registry.diff().removed).toHaveLength(0);
    });
  });

  describe('outils global et metadonnees', () => {
    it('removeByComponent garde les tools global du composant', () => {
      registry.add({ ...makeTool('local', 'comp_1') });
      registry.add({ ...makeTool('nav', 'comp_1'), global: true });

      const removed = registry.removeByComponent('comp_1');

      expect(removed).toEqual(['local']);
      expect(registry.has('nav')).toBe(true);
      expect(registry.has('local')).toBe(false);
    });

    it('conserve les champs plugin et global', () => {
      registry.add({ ...makeTool('weather'), plugin: 'weather-plugin', global: true });

      expect(registry.get('weather')?.plugin).toBe('weather-plugin');
      expect(registry.get('weather')?.global).toBe(true);
    });

    it('un remplacement garde la position du tool', () => {
      registry.add(makeTool('a'));
      registry.add(makeTool('b'));
      registry.add(makeTool('c'));
      registry.add({ ...makeTool('a'), description: 'Updated' });

      expect(registry.getAll().map((t) => t.name)).toEqual(['a', 'b', 'c']);
      expect(registry.getDeclarations().map((d) => d.name)).toEqual(['a', 'b', 'c']);
      expect(registry.getDeclarations()[0].description).toBe('Updated');
    });
  });

  describe('onChange / lastChangedAt', () => {
    it('notifie une fois par changement reel', () => {
      const changes: Array<{ added: string[]; removed: string[] }> = [];
      registry.onChange((change) => changes.push(change));

      registry.add(makeTool('a', 'comp_1'));
      registry.add({ ...makeTool('a', 'comp_1'), description: 'Updated' });
      registry.remove('a');

      expect(changes).toEqual([
        { added: ['a'], removed: [] },
        { added: ['a'], removed: [] },
        { added: [], removed: ['a'] },
      ]);
    });

    it('ne notifie pas une suppression sans effet', () => {
      const changes: unknown[] = [];
      registry.add(makeTool('nav', 'comp_1'));
      registry.onChange((change) => changes.push(change));

      expect(registry.remove('absent')).toBe(false);
      expect(registry.removeByComponent('comp_absent')).toEqual([]);
      registry.clear();
      registry.clear();

      expect(changes).toEqual([{ added: [], removed: ['nav'] }]);
    });

    it('notifie removeByComponent avec les noms retires', () => {
      const changes: Array<{ added: string[]; removed: string[] }> = [];
      registry.add(makeTool('x', 'comp_1'));
      registry.add(makeTool('y', 'comp_1'));
      registry.onChange((change) => changes.push(change));

      registry.removeByComponent('comp_1');

      expect(changes).toEqual([{ added: [], removed: ['x', 'y'] }]);
    });

    it('lastChangedAt ne bouge que sur un changement reel', () => {
      expect(registry.lastChangedAt).toBe(0);
      const before = Date.now();
      registry.add(makeTool('a'));
      const first = registry.lastChangedAt;
      expect(first).toBeGreaterThanOrEqual(before);

      registry.remove('absent');
      registry.removeByComponent('absent');
      expect(registry.lastChangedAt).toBe(first);
    });

    it('onChange retourne une fonction de desabonnement', () => {
      const changes: unknown[] = [];
      const unsubscribe = registry.onChange((change) => changes.push(change));

      registry.add(makeTool('a'));
      unsubscribe();
      registry.add(makeTool('b'));

      expect(changes).toHaveLength(1);
    });
  });

  describe('limite : ToolLimitError, replaceAll, setMaxTools', () => {
    it('add au-dela de la limite leve ToolLimitError avec le meme message', () => {
      const small = new ToolRegistry(2);
      small.add(makeTool('a'));
      small.add(makeTool('b'));

      let caught: unknown;
      try {
        small.add(makeTool('c'));
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(ToolLimitError);
      expect(caught).toBeInstanceOf(Error);
      expect((caught as ToolLimitError).message).toBe(
        'ToolRegistry: nombre max de tools atteint (2). Impossible d\'ajouter "c".',
      );
      expect((caught as ToolLimitError).toolName).toBe('c');
      expect((caught as ToolLimitError).limit).toBe(2);
      expect(small.has('c')).toBe(false);
      expect(small.size).toBe(2);
    });

    it('le refus ne notifie pas et ne change pas lastChangedAt', () => {
      const small = new ToolRegistry(1);
      small.add(makeTool('a'));
      const at = small.lastChangedAt;
      const changes: unknown[] = [];
      small.onChange((change) => changes.push(change));

      expect(() => small.add(makeTool('b'))).toThrow(ToolLimitError);
      expect(changes).toEqual([]);
      expect(small.lastChangedAt).toBe(at);
    });

    it('replaceAll au-dela de la limite ne change rien', () => {
      const small = new ToolRegistry(2);
      small.add(makeTool('a'));
      const changes: unknown[] = [];
      small.onChange((change) => changes.push(change));

      let caught: unknown;
      try {
        small.replaceAll([makeTool('x'), makeTool('y'), makeTool('z')]);
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(ToolLimitError);
      expect((caught as ToolLimitError).count).toBe(3);
      expect((caught as ToolLimitError).limit).toBe(2);
      expect((caught as ToolLimitError).toolName).toBeUndefined();
      expect(small.getAll().map((t) => t.name)).toEqual(['a']);
      expect(changes).toEqual([]);
    });

    it('replaceAll a la limite remplace le contenu et notifie une fois', () => {
      const small = new ToolRegistry(2);
      small.add(makeTool('a'));
      small.add(makeTool('b'));
      const changes: Array<{ added: string[]; removed: string[] }> = [];
      small.onChange((change) => changes.push(change));

      small.replaceAll([makeTool('b'), makeTool('c')]);

      expect(small.getAll().map((t) => t.name)).toEqual(['b', 'c']);
      expect(changes).toEqual([{ added: ['b', 'c'], removed: ['a'] }]);
    });

    it('replaceAll avec une liste vide vide le registre', () => {
      registry.add(makeTool('a'));

      registry.replaceAll([]);

      expect(registry.size).toBe(0);
    });

    it('maxTools expose la limite active', () => {
      expect(registry.maxTools).toBe(30);
      expect(new ToolRegistry(5).maxTools).toBe(5);
    });

    it('setMaxTools garde les premiers tools et retourne les autres', () => {
      registry.add(makeTool('a'));
      registry.add(makeTool('b'));
      registry.add(makeTool('c'));
      registry.add(makeTool('d'));
      const changes: Array<{ added: string[]; removed: string[] }> = [];
      registry.onChange((change) => changes.push(change));

      const removed = registry.setMaxTools(2);

      expect(removed).toEqual(['c', 'd']);
      expect(registry.getAll().map((t) => t.name)).toEqual(['a', 'b']);
      expect(registry.maxTools).toBe(2);
      expect(changes).toEqual([{ added: [], removed: ['c', 'd'] }]);
      expect(() => registry.add(makeTool('e'))).toThrow(ToolLimitError);
    });

    it('setMaxTools plus grand ne retire rien et ne notifie pas', () => {
      registry.add(makeTool('a'));
      const changes: unknown[] = [];
      registry.onChange((change) => changes.push(change));

      expect(registry.setMaxTools(50)).toEqual([]);
      expect(registry.maxTools).toBe(50);
      expect(changes).toEqual([]);
    });

    it('setMaxTools refuse une valeur invalide', () => {
      for (const value of [0, -1, 2.5, Number.NaN]) {
        expect(() => registry.setMaxTools(value)).toThrow(RangeError);
      }
      expect(registry.maxTools).toBe(30);
    });
  });
});
