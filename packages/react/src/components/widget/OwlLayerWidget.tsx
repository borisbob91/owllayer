'use client';

import type { WidgetConfig } from '@owllayer/core';
import { OwlLayerProvider } from '../../provider/OwlLayerProvider.js';
import { WidgetInner } from './WidgetInner.js';

export interface OwlLayerWidgetProps {
  /** Clé API publique */
  apiKey: string;

  /** Endpoint WebSocket du serveur OwlLayer */
  endpoint: string;

  /** Configuration du widget */
  config?: WidgetConfig;
}

/**
 * OwlLayerWidget — Widget de chat vocal/texte, style appel téléphonique.
 *
 * Injecte un bouton flottant + panneau compact dans le DOM.
 * Encapsule automatiquement `OwlLayerProvider`.
 * CSS isolé dans un Shadow DOM.
 *
 * @example
 * ```tsx
 * import { OwlLayerWidget } from '@owllayer/react';
 *
 * function App() {
 *   return (
 *     <>
 *       <MyShop />
 *       <OwlLayerWidget
 *         apiKey="pk_live_xxx"
 *         endpoint="wss://api.example.com/owllayer"
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
export function OwlLayerWidget({ apiKey, endpoint, config = {} }: OwlLayerWidgetProps) {
  return (
    <OwlLayerProvider
      apiKey={apiKey}
      endpoint={endpoint}
      config={{ voice: true, autoConnect: true, hitl: { ui: 'modal' } }}
    >
      <WidgetInner config={config} />
    </OwlLayerProvider>
  );
}
