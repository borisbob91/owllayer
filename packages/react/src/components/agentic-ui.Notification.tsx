import { useState, useEffect } from 'react';
import { ShadowContainer } from './shadow-dom.Container.js';

const NOTIFICATION_STYLES = `
  .domos-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 10px;
    background: #1e293b;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    animation: domos-slide-in 0.3s ease;
    max-width: 320px;
  }

  .domos-notification-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  @keyframes domos-slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

interface NotificationProps {
  /** Message a afficher */
  message: string;
  /** Duree d'affichage en ms (defaut: 3000) */
  duration?: number;
  /** Callback quand la notification disparait */
  onDismiss?: () => void;
}

/**
 * Notification - Affichage temporaire pour les actions risk: LOW.
 *
 * Montre brievement ce que l'agent a fait (ex: "Produit ajoute au panier").
 * Rendu dans un Shadow DOM.
 */
export function Notification({ message, duration = 3000, onDismiss }: NotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <ShadowContainer styles={NOTIFICATION_STYLES}>
      <div className="domos-notification">
        <div className="domos-notification-label">DomOS Agent</div>
        <div>{message}</div>
      </div>
    </ShadowContainer>
  );
}
