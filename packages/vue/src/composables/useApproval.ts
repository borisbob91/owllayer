import { inject, type Ref } from 'vue';
import { OWLLAYER_APPROVAL_KEY, OWLLAYER_APPROVAL_RESOLVE_KEY, type PendingApproval } from '../plugin/OwlLayerPlugin.js';

/**
 * useApproval - Acceder aux demandes d'approbation HITL en attente.
 */
export function useApproval(): {
  pendingApproval: Ref<PendingApproval | null>;
  approve: () => void;
  deny: () => void;
} {
  const pendingApproval = inject(OWLLAYER_APPROVAL_KEY);
  const resolveApproval = inject(OWLLAYER_APPROVAL_RESOLVE_KEY);

  if (!pendingApproval || !resolveApproval) {
    throw new Error('useApproval: OwlLayerPlugin non installe.');
  }

  return {
    pendingApproval,
    approve: () => resolveApproval(true),
    deny: () => resolveApproval(false),
  };
}
