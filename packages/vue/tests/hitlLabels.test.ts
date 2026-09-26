import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import {
  OWLLAYER_APPROVAL_KEY,
  OWLLAYER_APPROVAL_RESOLVE_KEY,
  OWLLAYER_HITL_LABELS_KEY,
  type PendingApproval,
} from '../src/plugin/OwlLayerPlugin.js';
import { useApproval } from '../src/composables/useApproval.js';
import ApprovalModal from '../src/components/hitl.ApprovalModal.vue';
import ApprovalBanner from '../src/components/hitl.ApprovalBanner.vue';
import type { HitlLabels } from '@owllayer/core';

const pending: PendingApproval = {
  callId: 'call_1',
  toolName: 'confirm_checkout',
  args: { total: 42 },
  message: 'ACTION CRITIQUE : cette action est irreversible.',
  risk: 'critical',
};

/** Monte un composant avec les cles d'injection HITL fournies (approval + labels) */
function mountWithApproval(
  component: any,
  pendingValue: PendingApproval | null,
  labels?: HitlLabels,
  resolveFn = vi.fn(),
  props: Record<string, unknown> = {},
  attachTo?: Element
) {
  const pendingRef = ref<PendingApproval | null>(pendingValue);
  const provide: Record<symbol, unknown> = {
    [OWLLAYER_APPROVAL_KEY as unknown as symbol]: pendingRef,
    [OWLLAYER_APPROVAL_RESOLVE_KEY as unknown as symbol]: resolveFn,
  };
  // N'injecte la cle des libelles que si elle est fournie, pour laisser
  // useApproval() retomber sur sa valeur par defaut ({}) sinon.
  if (labels !== undefined) {
    provide[OWLLAYER_HITL_LABELS_KEY as unknown as symbol] = labels;
  }
  return mount(component, {
    props,
    attachTo,
    global: {
      provide,
      stubs: {
        Teleport: false,
      },
    },
  });
}

// ApprovalModal/ApprovalBanner rendent via <Teleport to="body">: avec le
// vrai Teleport (non stubbe), le contenu est deplace dans document.body et
// n'apparait pas dans wrapper.text() (meme pattern que useApproval.test.ts).
function bodyText(): string {
  return document.body.textContent ?? '';
}

describe('Libelles HITL (Vue)', () => {
  // Les tests montent avec attachTo: document.body (Teleport reel) :
  // on nettoie apres chaque test pour ne pas accumuler le rendu precedent.
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('garde les textes actuels sans configuration (modal)', () => {
    mount(ApprovalModal, {
      props: { toolName: pending.toolName, message: pending.message, risk: pending.risk, args: pending.args },
      global: { stubs: { Teleport: false } },
      attachTo: document.body,
    });

    expect(bodyText()).toContain('Approbation requise');
    expect(bodyText()).toContain(pending.message);
    expect(bodyText()).toContain('Refuser');
    expect(bodyText()).toContain('Approuver');
  });

  it('applique les libelles configures (modal)', () => {
    mount(ApprovalModal, {
      props: {
        toolName: pending.toolName,
        message: pending.message,
        risk: pending.risk,
        args: pending.args,
        labels: { title: 'Confirmation required', approve: 'Confirm', deny: 'Cancel' },
      },
      global: { stubs: { Teleport: false } },
      attachTo: document.body,
    });

    expect(bodyText()).toContain('Confirmation required');
    expect(bodyText()).toContain('Cancel');
    expect(bodyText()).toContain('Confirm');
    // Le message de la politique HITL (avertissement critique) reste affiche
    expect(bodyText()).toContain(pending.message);
  });

  it('remplace le message de la politique seulement si message est fourni (modal)', () => {
    mount(ApprovalModal, {
      props: {
        toolName: pending.toolName,
        message: pending.message,
        risk: pending.risk,
        args: pending.args,
        labels: { message: 'Please review this action.' },
      },
      global: { stubs: { Teleport: false } },
      attachTo: document.body,
    });

    expect(bodyText()).toContain('Please review this action.');
    expect(bodyText()).not.toContain(pending.message);
  });

  it('garde les textes actuels sans configuration (banner)', () => {
    mountWithApproval(ApprovalBanner, pending, undefined, vi.fn(), {}, document.body);

    expect(bodyText()).toContain('Confirmation requise');
    expect(bodyText()).toContain(pending.toolName);
    expect(bodyText()).toContain('Refuser');
    expect(bodyText()).toContain('Approuver');
  });

  it('applique les libelles configures, dont toolLabels (banner)', () => {
    mountWithApproval(
      ApprovalBanner,
      pending,
      { approve: 'Approve', deny: 'Deny', toolLabels: { confirm_checkout: 'Place the order' } },
      vi.fn(),
      {},
      document.body
    );

    expect(bodyText()).toContain('Approve');
    expect(bodyText()).toContain('Deny');
    expect(bodyText()).toContain('Place the order');
    expect(bodyText()).not.toContain('confirm_checkout');
  });

  it('expose les libelles via useApproval', () => {
    const labels: HitlLabels = { approve: 'OK' };
    let result: ReturnType<typeof useApproval> | undefined;

    const TestComp = defineComponent({
      setup() {
        result = useApproval();
        return () => null;
      },
    });

    mountWithApproval(TestComp, null, labels);
    expect(result!.labels).toEqual({ approve: 'OK' });
  });

  it("useApproval renvoie un objet labels vide quand hitl.labels n'est pas configure", () => {
    let result: ReturnType<typeof useApproval> | undefined;

    const TestComp = defineComponent({
      setup() {
        result = useApproval();
        return () => null;
      },
    });

    mountWithApproval(TestComp, null, undefined);
    expect(result!.labels).toEqual({});
  });
});
