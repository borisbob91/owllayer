import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, fireEvent, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { OwlLayerContext, type HitlLabels, type PendingApproval } from '../src/provider/OwlLayerContext.js';
import { useApproval } from '../src/hooks/useApproval.js';
import { ApprovalModal } from '../src/components/hitl.ApprovalModal.js';
import { ApprovalBanner } from '../src/components/hitl.ApprovalBanner.js';

// Le Shadow DOM ferme n'est pas lisible dans jsdom : rendu direct pour ces tests
vi.mock('../src/components/shadow-dom.Container.js', () => ({
  ShadowContainer: ({ children }: { children: ReactNode }) => createElement('div', null, children),
}));

const pending: PendingApproval = {
  callId: 'call_1',
  toolName: 'confirm_checkout',
  args: { total: 42 },
  message: 'ACTION CRITIQUE : cette action est irreversible.',
  risk: 'critical',
  resolve: vi.fn(),
};

function renderWith(component: () => JSX.Element | null, hitlLabels?: HitlLabels) {
  const ctx = { pendingApproval: pending, hitlLabels } as any;
  return render(
    <OwlLayerContext.Provider value={ctx}>{createElement(component)}</OwlLayerContext.Provider>
  );
}

describe('Libelles HITL', () => {
  it('garde les textes actuels sans configuration (modal)', () => {
    renderWith(ApprovalModal);
    expect(screen.getByText('Confirmation requise')).toBeTruthy();
    expect(screen.getByText(pending.message)).toBeTruthy();
    expect(screen.getByText('confirm_checkout')).toBeTruthy();
    expect(screen.getByText('Annuler')).toBeTruthy();
    expect(screen.getByText('Confirmer')).toBeTruthy();
  });

  it('applique les libelles configures (modal)', () => {
    renderWith(ApprovalModal, {
      title: 'Confirmation required',
      approve: 'Confirm',
      deny: 'Cancel',
      toolLabels: { confirm_checkout: 'Place the order' },
    });
    expect(screen.getByText('Confirmation required')).toBeTruthy();
    expect(screen.getByText('Place the order')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Confirm')).toBeTruthy();
    // Le message de la politique HITL (avertissement critique) reste affiche
    expect(screen.getByText(pending.message)).toBeTruthy();
  });

  it('remplace le message de la politique seulement si message est fourni', () => {
    renderWith(ApprovalModal, { message: 'Please review this action.' });
    expect(screen.getByText('Please review this action.')).toBeTruthy();
    expect(screen.queryByText(pending.message)).toBeNull();
  });

  it('garde les textes actuels sans configuration (banner)', () => {
    renderWith(ApprovalBanner);
    expect(screen.getByText('Confirmation requise')).toBeTruthy();
    expect(screen.getByText('Refuser')).toBeTruthy();
    expect(screen.getByText('Approuver')).toBeTruthy();
  });

  it('applique les libelles configures et le message de refus (banner)', () => {
    renderWith(ApprovalBanner, { approve: 'Approve', deny: 'Deny', deniedMessage: 'Action denied' });
    expect(screen.getByText('Approve')).toBeTruthy();

    fireEvent.click(screen.getByText('Deny'));

    expect(pending.resolve).toHaveBeenCalledWith(false);
    expect(screen.getByText('Action denied')).toBeTruthy();
  });

  it('expose les libelles via useApproval', () => {
    const labels: HitlLabels = { approve: 'OK' };
    const { result } = renderHook(() => useApproval(), {
      wrapper: ({ children }) => (
        <OwlLayerContext.Provider value={{ pendingApproval: null, hitlLabels: labels } as any}>
          {children}
        </OwlLayerContext.Provider>
      ),
    });
    expect(result.current.labels).toEqual({ approve: 'OK' });
  });
});
