import { useApproval } from '../hooks/useApproval.js';
import { ShadowContainer } from './shadow-dom.Container.js';

function getApprovalActionLabel(toolName: string, args: Record<string, unknown> = {}): string {
  switch (toolName) {
    case 'confirm_checkout':
      return 'Finaliser la commande';
    case 'clear_cart':
      return 'Vider le panier';
    case 'add_to_cart':
      return 'Ajouter au panier';
    case 'remove_from_cart':
      return 'Retirer du panier';
    case 'update_cart_quantity':
      return 'Mettre à jour le panier';
    default:
      return toolName
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

const MODAL_STYLES = `
  .owllayer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .owllayer-modal {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .owllayer-modal-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .owllayer-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #111;
    margin-bottom: 8px;
  }

  .owllayer-modal-message {
    font-size: 14px;
    color: #555;
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .owllayer-modal-tool {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 20px;
    font-family: monospace;
    font-size: 13px;
    color: #333;
  }

  .owllayer-modal-tool-name {
    font-weight: 700;
    color: #d97706;
  }

  .owllayer-modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .owllayer-btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: opacity 0.2s;
  }

  .owllayer-btn:hover {
    opacity: 0.85;
  }

  .owllayer-btn-deny {
    background: #f3f4f6;
    color: #374151;
  }

  .owllayer-btn-approve {
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
 * <OwlLayerProvider>
 *   <App />
 *   <ApprovalModal />
 * </OwlLayerProvider>
 * ```
 */
export function ApprovalModal() {
  const { pendingApproval, approve, deny, hitlLabels } = useApproval();

  if (!pendingApproval) return null;

  const defaultLabels = {
    title: 'Action pending approval',
    message: 'You are about to execute a critical action.',
    approve: 'Confirm',
    deny: 'Cancel',
  };
  
  const labels = { ...defaultLabels, ...hitlLabels };

  return (
    <ShadowContainer styles={MODAL_STYLES}>
      <div className="owllayer-overlay" onClick={deny}>
        <div className="owllayer-modal" onClick={(e) => e.stopPropagation()}>
          <div className="owllayer-modal-icon">&#9888;</div>
          <div className="owllayer-modal-title">{labels.title}</div>
          <div className="owllayer-modal-message">
            {labels.message}
          </div>

          <div className="owllayer-modal-tool">
            <span className="owllayer-modal-tool-name">{getApprovalActionLabel(pendingApproval.toolName, pendingApproval.args)}</span>
            {pendingApproval.args && Object.keys(pendingApproval.args).length > 0 ? ` — ${JSON.stringify(pendingApproval.args)}` : ''}
          </div>

          <div className="owllayer-modal-actions">
            <button className="owllayer-btn owllayer-btn-deny" onClick={deny}>
              {labels.deny}
            </button>
            <button className="owllayer-btn owllayer-btn-approve" onClick={approve}>
              {labels.approve}
            </button>
          </div>
        </div>
      </div>
    </ShadowContainer>
  );
}
