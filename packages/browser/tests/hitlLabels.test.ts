import { afterEach, describe, expect, it, vi } from 'vitest';
import { HitlOverlay } from '../src/ui/HitlOverlay.js';
import type { ApprovalRequest } from '@owllayer/core';

afterEach(() => {
  document.body.innerHTML = '';
});

const request: ApprovalRequest = {
  id: 'call_1',
  callId: 'call_1',
  toolName: 'confirm_checkout',
  args: { total: 42 },
  risk: 'critical' as any,
  message: 'ACTION CRITIQUE : cette action est irreversible.',
  requestedAt: Date.now(),
};

/** Lit le texte rendu dans le shadow root (mode "closed", non accessible depuis l'exterieur). */
function shadowText(overlay: HitlOverlay): string {
  return ((overlay as unknown as { shadowRoot: ShadowRoot }).shadowRoot.textContent) ?? '';
}

describe('Libelles HITL (Browser)', () => {
  it('garde les textes actuels sans configuration', () => {
    const overlay = new HitlOverlay();
    overlay.mount();
    overlay.show(request, vi.fn());

    const text = shadowText(overlay);
    expect(text).toContain('Confirmation requise');
    expect(text).toContain(request.message);
    expect(text).toContain(request.toolName);
    expect(text).toContain('Refuser');
    expect(text).toContain('Approuver');

    overlay.unmount();
  });

  it('applique les libelles configures, dont toolLabels', () => {
    const overlay = new HitlOverlay({
      title: 'Confirmation required',
      approve: 'Confirm',
      deny: 'Cancel',
      toolLabels: { confirm_checkout: 'Place the order' },
    });
    overlay.mount();
    overlay.show(request, vi.fn());

    const text = shadowText(overlay);
    expect(text).toContain('Confirmation required');
    expect(text).toContain('Cancel');
    expect(text).toContain('Confirm');
    expect(text).toContain('Place the order');
    expect(text).not.toContain('confirm_checkout');
    // Le message de la politique HITL (avertissement critique) reste affiche
    expect(text).toContain(request.message);

    overlay.unmount();
  });

  it('remplace le message de la politique seulement si message est fourni', () => {
    const overlay = new HitlOverlay({ message: 'Please review this action.' });
    overlay.mount();
    overlay.show(request, vi.fn());

    const text = shadowText(overlay);
    expect(text).toContain('Please review this action.');
    expect(text).not.toContain(request.message);

    overlay.unmount();
  });
});
