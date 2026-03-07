import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, RiskLevel } from '../src/index.js';
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
});
