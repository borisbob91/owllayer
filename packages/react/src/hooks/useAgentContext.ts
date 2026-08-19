import { useContext, useEffect } from 'react';
import { OwlLayerContext } from '../provider/OwlLayerContext.js';

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
  const ctx = useContext(OwlLayerContext);

  if (!ctx) {
    throw new Error('useAgentContext doit etre utilise dans un <OwlLayerProvider>');
  }

  useEffect(() => {
    ctx.updateContext(data);
  }, [JSON.stringify(data)]);
}
