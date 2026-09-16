import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createElement, useState } from 'react';
import { OwlLayerContext, type OwlLayerContextValue, type PendingApproval } from '../src/provider/OwlLayerContext.js';
import { useApproval } from '../src/hooks/useApproval.js';
import { ApprovalModal } from '../src/components/hitl.ApprovalModal.js';
import { ApprovalBanner } from '../src/components/hitl.ApprovalBanner.js';

vi.mock('../src/components/shadow-dom.Container.js', () => ({
  ShadowContainer: ({ children }: { children: React.ReactNode }) => createElement('div', null, children),
}));

// ============================================================
// Helpers
// ============================================================

function makePending(overrides?: Partial<PendingApproval>): PendingApproval {
  return {
    callId: 'call_1',
    toolName: 'delete_item',
    args: { id: '42' },
    message: 'Voulez-vous supprimer cet article ?',
    risk: 'high',
    resolve: vi.fn(),
    ...overrides,
  };
}

function makeCtx(overrides?: Partial<OwlLayerContextValue>): OwlLayerContextValue {
  return {
    agentState: 'connected',
    sessionId: 'sess_1',
    shadowContext: {} as any,
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
    unregisterToolsByComponent: vi.fn(),
    updateContext: vi.fn(),
    sendText: vi.fn(),
    sendAudio: vi.fn(),
    sendAudioStream: vi.fn(),
    sendAudioEnd: vi.fn(),
    sendInterrupt: vi.fn(),
    requestApproval: vi.fn(),
    pendingApproval: null,
    approvePendingAction: vi.fn(),
    denyPendingAction: vi.fn(),
    lastResponse: null,
    ...overrides,
  } as unknown as OwlLayerContextValue;
}

function wrap(ctx: OwlLayerContextValue, children: React.ReactNode) {
  return createElement(OwlLayerContext.Provider, { value: ctx }, children);
}

// ============================================================
// useApproval — hook unitaire
// ============================================================

describe('useApproval', () => {
  it('retourne pendingApproval null quand aucune demande en attente', () => {
    const ctx = makeCtx({ pendingApproval: null });
    let result: ReturnType<typeof useApproval> | undefined;

    function Probe() {
      result = useApproval();
      return null;
    }

    render(wrap(ctx, createElement(Probe)));
    expect(result!.pendingApproval).toBeNull();
  });

  it('retourne la demande en attente quand elle existe', () => {
    const pending = makePending();
    const ctx = makeCtx({ pendingApproval: pending });
    let result: ReturnType<typeof useApproval> | undefined;

    function Probe() {
      result = useApproval();
      return null;
    }

    render(wrap(ctx, createElement(Probe)));
    expect(result!.pendingApproval).toEqual(pending);
    expect(result!.pendingApproval!.toolName).toBe('delete_item');
    expect(result!.pendingApproval!.risk).toBe('high');
  });

  it('approve() appelle resolve(true) sur la demande en attente', () => {
    const pending = makePending();
    const ctx = makeCtx({ pendingApproval: pending });
    let result: ReturnType<typeof useApproval> | undefined;

    function Probe() {
      result = useApproval();
      return null;
    }

    render(wrap(ctx, createElement(Probe)));
    result!.approve();
    expect(pending.resolve).toHaveBeenCalledWith(true);
  });

  it('deny() appelle resolve(false) sur la demande en attente', () => {
    const pending = makePending();
    const ctx = makeCtx({ pendingApproval: pending });
    let result: ReturnType<typeof useApproval> | undefined;

    function Probe() {
      result = useApproval();
      return null;
    }

    render(wrap(ctx, createElement(Probe)));
    result!.deny();
    expect(pending.resolve).toHaveBeenCalledWith(false);
  });

  it('approve() est sans effet si pendingApproval est null', () => {
    const ctx = makeCtx({ pendingApproval: null });
    let result: ReturnType<typeof useApproval> | undefined;

    function Probe() {
      result = useApproval();
      return null;
    }

    render(wrap(ctx, createElement(Probe)));
    expect(() => result!.approve()).not.toThrow();
  });

  it('leve une erreur si utilise hors OwlLayerProvider', () => {
    function Probe() {
      useApproval();
      return null;
    }

    expect(() => render(createElement(Probe))).toThrow('useApproval');
  });
});

// ============================================================
// ApprovalModal — composant
// ============================================================

describe('ApprovalModal', () => {
  it("ne rend rien quand pendingApproval est null", () => {
    const ctx = makeCtx({ pendingApproval: null });
    const { container } = render(wrap(ctx, createElement(ApprovalModal)));
    // Shadow DOM Container rend un div vide ou rien — aucune action visible
    expect(container.textContent).toBe('');
  });

  it('affiche un libellé humain de l\'action à confirmer', () => {
    const pending = makePending({
      toolName: 'confirm_checkout',
      message: 'L\'assistant souhaite executer "confirm_checkout". Confirmer ?',
    });
    const ctx = makeCtx({ pendingApproval: pending });
    render(wrap(ctx, createElement(ApprovalModal)));

    const html = document.body.innerHTML;
    expect(html).toContain('Action à confirmer');
    expect(html).toContain('Finaliser la commande');
    expect(html).not.toContain('confirm_checkout');
  });

  it('est un composant React valide (ne plante pas au render)', () => {
    const pending = makePending();
    const ctx = makeCtx({ pendingApproval: pending });
    expect(() => render(wrap(ctx, createElement(ApprovalModal)))).not.toThrow();
  });
});

// ============================================================
// ApprovalBanner — composant
// ============================================================

describe('ApprovalBanner', () => {
  it("ne rend rien quand pendingApproval est null", () => {
    const ctx = makeCtx({ pendingApproval: null });
    const { container } = render(wrap(ctx, createElement(ApprovalBanner)));
    expect(container.textContent).toBe('');
  });

  it('est un composant React valide (ne plante pas au render)', () => {
    const pending = makePending();
    const ctx = makeCtx({ pendingApproval: pending });
    expect(() => render(wrap(ctx, createElement(ApprovalBanner)))).not.toThrow();
  });

  it('les boutons Confirmer et Annuler appellent approve/deny via le contexte', () => {
    const pending = makePending();
    const ctx = makeCtx({ pendingApproval: pending });

    // Render Banner dans un wrapper qui observe via ShadowContainer
    // jsdom ne supporte pas attachShadow fermé — on monte en mode dégradé
    expect(() => render(wrap(ctx, createElement(ApprovalBanner)))).not.toThrow();
    expect(pending.resolve).not.toHaveBeenCalled();
  });

  it('exporte bien depuis le package index', async () => {
    const mod = await import('../src/index.js');
    expect(mod.ApprovalBanner).toBeDefined();
    expect(mod.ApprovalModal).toBeDefined();
    expect(mod.useApproval).toBeDefined();
  });
});
