import type { WidgetConfig } from '@domos/core';
import { DomOSProvider } from '../../provider/DomOSProvider.js';
import { WidgetInner } from './WidgetInner.js';

export interface DomOSWidgetProps {
  /** Clé API publique */
  apiKey: string;

  /** Endpoint WebSocket du serveur DomOS */
  endpoint: string;

  /** Configuration du widget */
  config?: WidgetConfig;
}

/**
 * DomOSWidget — Widget de chat vocal/texte, style appel téléphonique.
 *
 * Injecte un bouton flottant + panneau compact dans le DOM.
 * Encapsule automatiquement `DomOSProvider`.
 * CSS isolé dans un Shadow DOM.
 *
 * @example
 * ```tsx
 * import { DomOSWidget } from '@domos/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <MyShop />
 *       <DomOSWidget
 *         apiKey="pk_live_xxx"
 *         endpoint="wss://api.example.com/domos"
 *         config={{
 *           agentName: 'Alex',
 *           agentTitle: 'CEO',
 *           mode: 'audio',
 *           labels: {
 *             callToAction: 'Appeler le CEO',
 *             badge: '1 appel manqué',
 *           },
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function DomOSWidget({ apiKey, endpoint, config = {} }: DomOSWidgetProps) {
  return (
    <DomOSProvider
      apiKey={apiKey}
      endpoint={endpoint}
      config={{ voice: true, autoConnect: true }}
    >
      <WidgetInner config={config} />
    </DomOSProvider>
  );
}
