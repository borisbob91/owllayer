import { useAgent } from '../hooks/useAgent.js';
import { ShadowContainer } from './shadow-dom.Container.js';

const INDICATOR_STYLES = `
  .owllayer-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 50px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
  }

  .owllayer-indicator.listening {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
  }

  .owllayer-indicator.thinking {
    background: #fffbeb;
    color: #92400e;
    border: 1px solid #fde68a;
  }

  .owllayer-indicator.speaking {
    background: #eef2ff;
    color: #3730a3;
    border: 1px solid #c7d2fe;
  }

  .owllayer-indicator.disconnected {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }

  .owllayer-indicator.connected {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .owllayer-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: owllayer-pulse 1.5s infinite;
  }

  .listening .owllayer-dot { background: #10b981; }
  .thinking .owllayer-dot { background: #f59e0b; }
  .speaking .owllayer-dot { background: #6366f1; }
  .disconnected .owllayer-dot { background: #ef4444; animation: none; }
  .connected .owllayer-dot { background: #22c55e; animation: none; }

  @keyframes owllayer-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const STATE_LABELS: Record<string, string> = {
  disconnected: 'Deconnecte',
  connecting: 'Connexion...',
  connected: 'Connecte',
  listening: 'Ecoute...',
  thinking: 'Reflexion...',
  speaking: 'Parle...',
  error: 'Erreur',
};

/**
 * AgentIndicator - Indicateur visuel de l'etat de l'agent.
 *
 * Petit badge fixe en bas a droite qui montre si l'agent
 * ecoute, reflechit ou parle. Rendu dans un Shadow DOM.
 *
 * @example
 * ```tsx
 * <OwlLayerProvider>
 *   <App />
 *   <AgentIndicator />
 * </OwlLayerProvider>
 * ```
 */
export function AgentIndicator() {
  const { agentState } = useAgent();

  return (
    <ShadowContainer styles={INDICATOR_STYLES}>
      <div className={`owllayer-indicator ${agentState}`}>
        <span className="owllayer-dot" />
        <span>{STATE_LABELS[agentState] || agentState}</span>
      </div>
    </ShadowContainer>
  );
}
