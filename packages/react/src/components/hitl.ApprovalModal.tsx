import { useApproval } from '../hooks/useApproval.js';
import { ShadowContainer } from './shadow-dom.Container.js';

const MODAL_STYLES = `
  .domos-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .domos-modal {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .domos-modal-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .domos-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #111;
    margin-bottom: 8px;
  }

  .domos-modal-message {
    font-size: 14px;
    color: #555;
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .domos-modal-tool {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 20px;
    font-family: monospace;
    font-size: 13px;
    color: #333;
  }

  .domos-modal-tool-name {
    font-weight: 700;
    color: #d97706;
  }

  .domos-modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .domos-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: opacity 0.2s;
  }

  .domos-btn:hover {
    opacity: 0.85;
  }

  .domos-btn-deny {
    background: #f3f4f6;
    color: #374151;
  }

  .domos-btn-approve {
    background: #4f46e5;
    color: #fff;
  }
`;

/**
 * ApprovalModal (HITL) - Modale de confirmation pour les actions a risque.
 *
 * Rendue dans un Shadow DOM ferme pour empecher l'IA de la manipuler.
 * S'affiche automatiquement quand un tool avec risk >= HIGH est appele.
 *
 * @example
 * ```tsx
 * <DomOSProvider>
 *   <App />
 *   <ApprovalModal />
 * </DomOSProvider>
 * ```
 */
export function ApprovalModal() {
  const { pendingApproval, approve, deny } = useApproval();

  if (!pendingApproval) return null;

  return (
    <ShadowContainer styles={MODAL_STYLES}>
      <div className="domos-overlay" onClick={deny}>
        <div className="domos-modal" onClick={(e) => e.stopPropagation()}>
          <div className="domos-modal-icon">&#9888;</div>
          <div className="domos-modal-title">Confirmation requise</div>
          <div className="domos-modal-message">{pendingApproval.message}</div>

          <div className="domos-modal-tool">
            <span className="domos-modal-tool-name">{pendingApproval.toolName}</span>
            ({JSON.stringify(pendingApproval.args)})
          </div>

          <div className="domos-modal-actions">
            <button className="domos-btn domos-btn-deny" onClick={deny}>
              Annuler
            </button>
            <button className="domos-btn domos-btn-approve" onClick={approve}>
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </ShadowContainer>
  );
}
