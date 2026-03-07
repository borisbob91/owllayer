import { inject, type Ref } from 'vue';
import { DOMOS_APPROVAL_KEY, DOMOS_APPROVAL_RESOLVE_KEY, type PendingApproval } from '../plugin/DomOSPlugin.js';

/**
 * useApproval - Acceder aux demandes d'approbation HITL en attente.
 */
export function useApproval(): {
  pendingApproval: Ref<PendingApproval | null>;
  approve: () => void;
  deny: () => void;
} {
  const pendingApproval = inject(DOMOS_APPROVAL_KEY);
  const resolveApproval = inject(DOMOS_APPROVAL_RESOLVE_KEY);

  if (!pendingApproval || !resolveApproval) {
    throw new Error('useApproval: DomOSPlugin non installe.');
  }

  return {
    pendingApproval,
    approve: () => resolveApproval(true),
    deny: () => resolveApproval(false),
  };
}
