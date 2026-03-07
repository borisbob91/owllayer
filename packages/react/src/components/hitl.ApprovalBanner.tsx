import { useState } from 'react';
import { useApproval } from '../hooks/useApproval.js';
import { ShadowContainer } from './shadow-dom.Container.js';
import { Notification } from './agentic-ui.Notification.js';

const BANNER_STYLES = `
  .domos-approval-banner {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 12px;
    padding: 14px 16px;
    max-width: 360px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    z-index: 999999;
  }

  .domos-approval-title {
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.2px;
    margin-bottom: 6px;
  }

  .domos-approval-message {
    color: #cbd5f5;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .domos-approval-tool {
    background: #111827;
    border-radius: 8px;
    padding: 8px 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 12px;
    margin-bottom: 10px;
  }

  .domos-approval-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .domos-approval-btn {
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 600;
    cursor: pointer;
    font-size: 12px;
  }

  .domos-approval-btn-approve {
    background: #22c55e;
    color: #0f172a;
  }

  .domos-approval-btn-deny {
    background: #334155;
    color: #e2e8f0;
  }
`;

/**
 * ApprovalBanner (HITL) - Bandeau de confirmation compact par defaut.
 *
 * Utilise useApproval et s'affiche quand un tool a risque attend une approbation.
 * Rendu dans un Shadow DOM.
 */
export function ApprovalBanner() {
  const { pendingApproval, approve, deny } = useApproval();
  const [refusedMessage, setRefusedMessage] = useState<string | null>(null);

  if (!pendingApproval) return null;

  const handleDeny = () => {
    deny();
    setRefusedMessage('Action refusee par l’utilisateur');
  };

  return (
    <>
      {refusedMessage && (
        <Notification
          message={refusedMessage}
          onDismiss={() => setRefusedMessage(null)}
        />
      )}
      <ShadowContainer styles={BANNER_STYLES}>
        <div className="domos-approval-banner">
          <div className="domos-approval-title">Confirmation requise</div>
          <div className="domos-approval-message">{pendingApproval.message}</div>
          <div className="domos-approval-tool">
            {pendingApproval.toolName}({JSON.stringify(pendingApproval.args)})
          </div>
          <div className="domos-approval-actions">
            <button className="domos-approval-btn domos-approval-btn-deny" onClick={handleDeny}>
              Refuser
            </button>
            <button className="domos-approval-btn domos-approval-btn-approve" onClick={approve}>
              Approuver
            </button>
          </div>
        </div>
      </ShadowContainer>
    </>
  );
}
