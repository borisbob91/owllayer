import { h } from 'preact';
import type { AgentState } from '../types';

interface Props {
  isOpen: boolean;
  agentState: AgentState;
  onClick: () => void;
  showTooltip?: boolean;
}

const ICONS = {
  mic: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 14a6 6 0 0 0 6-6H6a6 6 0 0 0 6 6zm-1 4v-2.07A8 8 0 0 1 4 5H2a10 10 0 0 0 9 9.93V19H9v2h6v-2h-2v-.07z" />
    </svg>
  ),
  close: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

const STATE_LABEL: Record<AgentState, string> = {
  connecting: 'Connexion…',
  idle: 'Parlez avec moi',
  listening: 'Je vous écoute…',
  thinking: 'Je réfléchis…',
  speaking: 'En train de parler',
  streaming: 'En train de répondre',
  error: 'Erreur',
};

export function FloatingButton({ isOpen, agentState, onClick, showTooltip }: Props) {
  const showRing = !isOpen && (agentState === 'idle' || agentState === 'listening');
  const showBadge = !isOpen && agentState === 'idle';

  return (
    <button
      class={`float-btn${isOpen ? ' open' : ''}${!isOpen && agentState === 'idle' ? ' idle-glow' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat vocal'}
    >
      {showRing && <span class="float-btn-ring" aria-hidden="true" />}
      {showBadge && <span class="float-btn-badge" aria-hidden="true" />}
      {isOpen ? ICONS.close : ICONS.mic}
      {showTooltip && !isOpen && (
        <span class="float-tooltip">{STATE_LABEL[agentState]}</span>
      )}
    </button>
  );
}
