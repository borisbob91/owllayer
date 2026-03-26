import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormFillerPlugin } from '../index.js';
import { FormFillerReactPlugin, MultiStepForm } from '../react/index.js';

// ============================================================
// FormFillerPlugin (framework-agnostic)
// ============================================================

describe('FormFillerPlugin — base framework-agnostic', () => {
  const mockCtx = {
    updateContext: vi.fn(),
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('a les bonnes métadonnées', () => {
    expect(FormFillerPlugin.meta.name).toBe('@domos-plugins/form-filler');
    expect(FormFillerPlugin.meta.version).toBe('0.1.0');
    expect(FormFillerPlugin.meta.description).toBeTruthy();
  });

  it('setup() publie le contexte avec les valeurs par défaut', () => {
    FormFillerPlugin.setup(mockCtx as any, {});
    expect(mockCtx.updateContext).toHaveBeenCalledWith({
      formFiller: {
        theme: 'dark',
        accentColor: '#7c3aed',
      },
    });
  });

  it('setup() respecte la config personnalisée', () => {
    FormFillerPlugin.setup(mockCtx as any, { theme: 'light', accentColor: '#06b6d4' });
    expect(mockCtx.updateContext).toHaveBeenCalledWith({
      formFiller: {
        theme: 'light',
        accentColor: '#06b6d4',
      },
    });
  });

  it("n'enregistre aucun tool directement (les tools sont gérés par le composant)", () => {
    FormFillerPlugin.setup(mockCtx as any, {});
    expect(mockCtx.registerTool).not.toHaveBeenCalled();
  });
});

// ============================================================
// FormFillerReactPlugin
// ============================================================

describe('FormFillerReactPlugin — plugin React avec composant UI', () => {
  it('expose MultiStepForm dans ui.components', () => {
    expect(FormFillerReactPlugin.ui?.components?.MultiStepForm).toBeDefined();
    expect(FormFillerReactPlugin.ui?.components?.MultiStepForm).toBe(MultiStepForm);
  });

  it('MultiStepForm est une fonction (composant React)', () => {
    expect(typeof MultiStepForm).toBe('function');
  });

  it('préserve les métadonnées du plugin de base', () => {
    expect(FormFillerReactPlugin.meta.name).toBe('@domos-plugins/form-filler');
    expect(FormFillerReactPlugin.meta.version).toBe('0.1.0');
  });

  it('préserve la fonction setup() du plugin de base', () => {
    expect(typeof FormFillerReactPlugin.setup).toBe('function');
  });

  it('ne modifie pas FormFillerPlugin (spread isolé)', () => {
    expect((FormFillerPlugin as any).ui).toBeUndefined();
  });
});
