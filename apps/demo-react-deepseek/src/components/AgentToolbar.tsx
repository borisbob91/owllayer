import { Notification } from '@owllayer/react';

/**
 * AgentToolbar - Barre d'outils agentique.
 * L'indicateur de connexion est affiche dans le header (Layout.tsx).
 */
export function AgentToolbar() {
  return (
    <>
      {/* Notifications toast (risk: low) */}
      <Notification message="Action effectuee." />
    </>
  );
}
