import { useContext } from 'react';
import { OwlLayerContext, type PendingApproval } from '../provider/OwlLayerContext.js';

/**
 * useApproval - Acceder aux demandes d'approbation HITL en attente.
 *
 * Permet de creer des UI de confirmation custom pour les actions a risque.
 *
 * @example
 * ```tsx
 * function ApprovalBanner() {
 *   const { pendingApproval, approve, deny } = useApproval();
 *
 *   if (!pendingApproval) return null;
 *
 *   return (
 *     <div className="approval-banner">
 *       <p>{pendingApproval.message}</p>
 *       <button onClick={approve}>Confirmer</button>
 *       <button onClick={deny}>Annuler</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useApproval(): {
  pendingApproval: PendingApproval | null;
  approve: () => void;
  deny: () => void;
} {
  const ctx = useContext(OwlLayerContext);

  if (!ctx) {
    throw new Error('useApproval doit etre utilise dans un <OwlLayerProvider>');
  }

  return {
    pendingApproval: ctx.pendingApproval,
    approve: () => ctx.pendingApproval?.resolve(true),
    deny: () => ctx.pendingApproval?.resolve(false),
  };
}
