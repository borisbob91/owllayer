import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import { get } from 'svelte/store';
import { pendingApproval, hitlLabels } from '../src/stores/owllayer.store.js';
import ApprovalBanner from '../src/components/hitl.ApprovalBanner.svelte';
import ApprovalModal from '../src/components/hitl.ApprovalModal.svelte';
import type { ApprovalRequest, HitlLabels } from '@owllayer/core';

function makePendingRequest(overrides?: Partial<ApprovalRequest>): ApprovalRequest {
  return {
    id: 'req_1',
    callId: 'call_1',
    toolName: 'confirm_checkout',
    args: { total: 42 },
    message: 'ACTION CRITIQUE : cette action est irreversible.',
    risk: 'critical' as any,
    requestedAt: Date.now(),
    ...overrides,
  };
}

describe('Libelles HITL (Svelte)', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    pendingApproval.set(null);
    hitlLabels.set({});
  });

  afterEach(() => {
    container.remove();
    pendingApproval.set(null);
    hitlLabels.set({});
  });

  it('hitlLabels store est vide par defaut', () => {
    expect(get(hitlLabels)).toEqual({});
  });

  describe('ApprovalModal', () => {
    it('garde les textes actuels sans configuration', () => {
      flushSync(() => {
        mount(ApprovalModal, {
          target: container,
          props: {
            toolName: 'confirm_checkout',
            message: 'ACTION CRITIQUE : cette action est irreversible.',
            risk: 'critical' as const,
            args: {},
            onapprove: vi.fn(),
            ondeny: vi.fn(),
          },
        });
      });

      expect(container.textContent).toContain('Approbation requise');
      expect(container.textContent).toContain('ACTION CRITIQUE : cette action est irreversible.');
      expect(container.textContent).toContain('Refuser');
      expect(container.textContent).toContain('Approuver');
    });

    it('applique les libelles configures', () => {
      const labels: HitlLabels = { title: 'Confirmation required', approve: 'Confirm', deny: 'Cancel' };
      flushSync(() => {
        mount(ApprovalModal, {
          target: container,
          props: {
            toolName: 'confirm_checkout',
            message: 'ACTION CRITIQUE : cette action est irreversible.',
            risk: 'critical' as const,
            args: {},
            labels,
            onapprove: vi.fn(),
            ondeny: vi.fn(),
          },
        });
      });

      expect(container.textContent).toContain('Confirmation required');
      expect(container.textContent).toContain('Cancel');
      expect(container.textContent).toContain('Confirm');
      // Le message de la politique HITL (avertissement critique) reste affiche
      expect(container.textContent).toContain('ACTION CRITIQUE : cette action est irreversible.');
    });

    it('remplace le message de la politique seulement si message est fourni', () => {
      flushSync(() => {
        mount(ApprovalModal, {
          target: container,
          props: {
            toolName: 'confirm_checkout',
            message: 'ACTION CRITIQUE : cette action est irreversible.',
            risk: 'critical' as const,
            args: {},
            labels: { message: 'Please review this action.' },
            onapprove: vi.fn(),
            ondeny: vi.fn(),
          },
        });
      });

      expect(container.textContent).toContain('Please review this action.');
      expect(container.textContent).not.toContain('ACTION CRITIQUE');
    });
  });

  describe('ApprovalBanner', () => {
    it('garde les textes actuels sans configuration', () => {
      pendingApproval.set(makePendingRequest());
      flushSync(() => {
        mount(ApprovalBanner, { target: container });
      });

      expect(container.textContent).toContain('Confirmation requise');
      expect(container.textContent).toContain('confirm_checkout');
      expect(container.textContent).toContain('Refuser');
      expect(container.textContent).toContain('Approuver');
    });

    it('applique les libelles configures, dont toolLabels', () => {
      hitlLabels.set({
        approve: 'Approve',
        deny: 'Deny',
        toolLabels: { confirm_checkout: 'Place the order' },
      });
      pendingApproval.set(makePendingRequest());
      flushSync(() => {
        mount(ApprovalBanner, { target: container });
      });

      expect(container.textContent).toContain('Approve');
      expect(container.textContent).toContain('Deny');
      expect(container.textContent).toContain('Place the order');
      expect(container.textContent).not.toContain('confirm_checkout');
    });

    it('remplace le message de la politique seulement si message est fourni', () => {
      hitlLabels.set({ message: 'Please review this action.' });
      pendingApproval.set(makePendingRequest());
      flushSync(() => {
        mount(ApprovalBanner, { target: container });
      });

      expect(container.textContent).toContain('Please review this action.');
      expect(container.textContent).not.toContain('ACTION CRITIQUE');
    });
  });

  it('exporte bien hitlLabels depuis le package index', async () => {
    const mod = await import('../src/index.js');
    expect(mod.hitlLabels).toBeDefined();
  });
});
