import { useContext, useEffect } from 'react';
import { DomOSContext } from '../provider/DomOSContext.js';

/**
 * useAgentContext - Injecter des donnees contextuelles passives pour le LLM.
 *
 * Contrairement a useAgentTool, ceci ne cree pas d'outil.
 * Ca fournit simplement des informations supplementaires au LLM
 * pour qu'il comprenne mieux le contexte (utilisateur connecte, page, etc.).
 *
 * @example
 * ```tsx
 * function UserProfile({ user }) {
 *   // Le LLM saura toujours qui est l'utilisateur
 *   useAgentContext({
 *     userId: user.id,
 *     userName: user.name,
 *     userRole: user.role,
 *     cartItemCount: user.cart.length,
 *   });
 *
 *   return <div>Bienvenue {user.name}</div>;
 * }
 * ```
 */
export function useAgentContext(data: Record<string, unknown>): void {
  const ctx = useContext(DomOSContext);

  if (!ctx) {
    throw new Error('useAgentContext doit etre utilise dans un <DomOSProvider>');
  }

  useEffect(() => {
    ctx.updateContext(data);
  }, [JSON.stringify(data)]);
}
