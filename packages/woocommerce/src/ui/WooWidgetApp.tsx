import { h, Fragment } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type {
  AgentState,
  PanelView,
  UICartItem,
  UICartUpdatedDetail,
  UIMessage,
  UIProduct,
  UIShowCartDetail,
  UIShowNotificationDetail,
  UIShowProductDetailDetail,
  UIShowProductsDetail,
  UIShowUpsellDetail,
} from './types';
import { FloatingButton } from './components/FloatingButton';
import { VoiceOrb } from './components/VoiceOrb';
import { ChatMessages } from './components/ChatMessages';
import { ChatInput } from './components/ChatInput';
import { ProductGridView } from './views/ProductGridView';
import { ProductDetailView } from './views/ProductDetailView';
import { CartView } from './views/CartView';
import { WooPaymentWidgetApp } from './payment/WooPaymentWidgetApp';
import type { StoreApiClient } from '../api/StoreApiClient';

// ── DomOS bridge (injected as props) ─────────────────────────────────────────

export interface DomOSBridge {
  startVoice(): void;
  stopVoice(): void;
  muteMic(): void;
  sendText(text: string): void;
  onAgentStateChange(cb: (state: AgentState) => void): () => void;
  onResponse(cb: (data: { text: string; done: boolean }) => void): () => void;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  message: string;
  variant: UIShowNotificationDetail['variant'];
}

// ── Root component ────────────────────────────────────────────────────────────

interface Props {
  domos: DomOSBridge;
  /** Payment — only present when inChatPayments is enabled */
  api?: StoreApiClient;
  stripeKey?: string;
  paypalClientId?: string;
}

export function WooWidgetApp({ domos, api, stripeKey, paypalClientId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>('connecting');
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [panelView, setPanelView] = useState<PanelView>({ type: 'none' });
  const [cartItems, setCartItems] = useState<UICartItem[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgIdRef = useRef(0);

  const isExpanded = panelView.type !== 'none';
  const isThinking = agentState === 'thinking' || agentState === 'connecting';

  // ── DomOS subscriptions ─────────────────────────────────────────────────────

  useEffect(() => {
    const unsub1 = domos.onAgentStateChange((state) => setAgentState(state));
    const unsub2 = domos.onResponse(({ text, done }) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'agent' && last.streaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + text, streaming: !done },
          ];
        }
        return [
          ...prev,
          { id: String(++msgIdRef.current), role: 'agent', content: text, streaming: !done },
        ];
      });
    });
    return () => { unsub1(); unsub2(); };
  }, [domos]);

  // ── Cart sync event (CartContextSync → Widget) ───────────────────────────────

  useEffect(() => {
    const handleCartUpdated = (e: Event) => {
      const detail = (e as CustomEvent<UICartUpdatedDetail>).detail;
      setCartItems(detail.items);
      if (panelView.type === 'cart') {
        setPanelView({ type: 'cart', items: detail.items });
      }
    };
    window.addEventListener('domos:woo:cart_updated', handleCartUpdated);
    return () => window.removeEventListener('domos:woo:cart_updated', handleCartUpdated);
  }, [panelView]);

  // ── Custom UI-tool events ────────────────────────────────────────────────────

  useEffect(() => {
    const handleShowProducts = (e: Event) => {
      const detail = (e as CustomEvent<UIShowProductsDetail>).detail;
      setPanelView({ type: 'products', products: detail.products, query: detail.query });
      setIsOpen(true);
    };

    const handleShowProductDetail = (e: Event) => {
      const detail = (e as CustomEvent<UIShowProductDetailDetail>).detail;
      setPanelView({ type: 'product-detail', product: detail.product });
      setIsOpen(true);
    };

    const handleShowCart = (e: Event) => {
      const detail = (e as CustomEvent<UIShowCartDetail>).detail;
      const items = detail.items?.length ? detail.items : cartItems;
      setPanelView({ type: 'cart', items });
      setIsOpen(true);
    };

    const handleShowNotification = (e: Event) => {
      const detail = (e as CustomEvent<UIShowNotificationDetail>).detail;
      showToast({ id: String(Date.now()), message: detail.message, variant: detail.variant ?? 'info' });
    };

    const handleShowUpsell = (e: Event) => {
      const detail = (e as CustomEvent<UIShowUpsellDetail>).detail;
      setPanelView({ type: 'upsell', product: detail.product, reason: detail.reason });
      setIsOpen(true);
    };

    const handleClosePanel = () => setPanelView({ type: 'none' });

    // Payment: open checkout inline in the same widget (no second modal)
    const handlePaymentOpen = () => {
      setPanelView({ type: 'checkout' });
      setIsOpen(true);
    };
    const handlePaymentClose = () => setPanelView({ type: 'none' });

    window.addEventListener('domos:ui:show_products', handleShowProducts);
    window.addEventListener('domos:ui:show_product_detail', handleShowProductDetail);
    window.addEventListener('domos:ui:show_cart', handleShowCart);
    window.addEventListener('domos:ui:show_notification', handleShowNotification);
    window.addEventListener('domos:ui:show_upsell', handleShowUpsell);
    window.addEventListener('domos:ui:close_panel', handleClosePanel);
    window.addEventListener('domos:payment:open', handlePaymentOpen);
    window.addEventListener('domos:payment:close', handlePaymentClose);

    return () => {
      window.removeEventListener('domos:ui:show_products', handleShowProducts);
      window.removeEventListener('domos:ui:show_product_detail', handleShowProductDetail);
      window.removeEventListener('domos:ui:show_cart', handleShowCart);
      window.removeEventListener('domos:ui:show_notification', handleShowNotification);
      window.removeEventListener('domos:ui:show_upsell', handleShowUpsell);
      window.removeEventListener('domos:ui:close_panel', handleClosePanel);
      window.removeEventListener('domos:payment:open', handlePaymentOpen);
      window.removeEventListener('domos:payment:close', handlePaymentClose);
    };
  }, [cartItems]);

  // ── Toast auto-dismiss ───────────────────────────────────────────────────────

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Mic control ──────────────────────────────────────────────────────────────

  const handleToggleMic = useCallback(() => {
    if (isMicOn) {
      domos.stopVoice();
      setIsMicOn(false);
    } else {
      domos.startVoice();
      setIsMicOn(true);
    }
  }, [isMicOn, domos]);

  // ── Text send ────────────────────────────────────────────────────────────────

  const handleSend = useCallback((text: string) => {
    const id = String(++msgIdRef.current);
    setMessages((prev) => [...prev, { id, role: 'user', content: text }]);
    domos.sendText(text);
  }, [domos]);

  // ── Cart operations ──────────────────────────────────────────────────────────

  const handleAddToCart = useCallback((item: UICartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id || c.variantId === item.variantId);
      if (existing) {
        return prev.map((c) => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, item];
    });
    showToast({ id: String(Date.now()), message: `${item.title} ajouté au panier`, variant: 'success' });
  }, [showToast]);

  const handleUpdateQty = useCallback((id: string, delta: number) => {
    setCartItems((prev) => {
      const next = prev
        .map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0);
      if (panelView.type === 'cart') setPanelView({ type: 'cart', items: next });
      return next;
    });
  }, [panelView]);

  const handleRemoveItem = useCallback((id: string) => {
    setCartItems((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (panelView.type === 'cart') setPanelView({ type: 'cart', items: next });
      return next;
    });
  }, [panelView]);

  // ── Panel navigation ─────────────────────────────────────────────────────────

  const handleProductSelect = useCallback((product: UIProduct) => {
    setPanelView({ type: 'product-detail', product });
  }, []);

  const handleBackToProducts = useCallback(() => {
    setPanelView({ type: 'none' });
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelView({ type: 'none' });
  }, []);

  // ── Resolved cart items ───────────────────────────────────────────────────────

  const resolvedCartItems =
    panelView.type === 'cart' && panelView.items.length > 0
      ? panelView.items
      : cartItems;

  // ── Tooltip ───────────────────────────────────────────────────────────────────

  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMouseEnterBtn = () => {
    tooltipTimeout.current = setTimeout(() => setShowTooltip(true), 600);
  };
  const handleMouseLeaveBtn = () => {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setShowTooltip(false);
  };

  // ── Panel title ───────────────────────────────────────────────────────────────

  const getPanelTitle = () => {
    switch (panelView.type) {
      case 'products': return `Produits${panelView.query ? ` — ${panelView.query}` : ''}`;
      case 'cart': return `Panier${cartItems.length ? ` (${cartItems.reduce((s, i) => s + i.quantity, 0)})` : ''}`;
      case 'upsell': return 'Vous aimerez aussi';
      case 'checkout': return 'Finaliser la commande';
      default: return '';
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        onMouseEnter={handleMouseEnterBtn}
        onMouseLeave={handleMouseLeaveBtn}
        style={{ display: 'contents' }}
      >
        <FloatingButton
          isOpen={isOpen}
          agentState={agentState}
          onClick={() => setIsOpen((o) => !o)}
          showTooltip={showTooltip && !isOpen}
        />
      </div>

      {isOpen && (
        <div class={`widget-panel ${isExpanded ? 'expanded' : 'compact'}`} role="dialog" aria-modal="true" aria-label="Assistant vocal DomOS">
          {toast && (
            <div class={`toast ${toast.variant}`} role="alert">
              {toast.message}
            </div>
          )}

          {/* Left voice sidebar */}
          <aside class="voice-sidebar">
            <VoiceOrb agentState={agentState} size={isExpanded ? 'small' : 'large'} />
            <div class="agent-info">
              <p class="agent-name">Assistant DomOS</p>
              <p class="agent-status">
                <span class={`status-dot ${agentState}`} aria-hidden="true" />
                <span class={`status-text ${agentState}`}>
                  {agentState === 'connecting' && 'Connexion…'}
                  {agentState === 'idle' && 'Prêt'}
                  {agentState === 'listening' && 'Écoute…'}
                  {agentState === 'thinking' && 'Réflexion…'}
                  {agentState === 'speaking' && 'En train de parler'}
                  {agentState === 'streaming' && 'Réponse…'}
                  {agentState === 'error' && 'Erreur'}
                </span>
              </p>
            </div>
            <button
              class={`mic-btn ${isMicOn ? 'on' : 'off'}`}
              onClick={handleToggleMic}
              aria-label={isMicOn ? 'Désactiver le micro' : 'Activer le micro'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 14a6 6 0 0 0 6-6H6a6 6 0 0 0 6 6zm-1 4v-2.07A8 8 0 0 1 4 5H2a10 10 0 0 0 9 9.93V19H9v2h6v-2h-2v-.07z" />
              </svg>
            </button>
          </aside>

          {/* Chat area */}
          <div class="chat-area">
            <ChatMessages messages={messages} isThinking={isThinking} />
            <ChatInput
              agentState={agentState}
              isMicOn={isMicOn}
              onSend={handleSend}
              onToggleMic={handleToggleMic}
            />
          </div>

          {/* Content panel (products / cart / upsell) */}
          {isExpanded && (
            <div class="content-panel">
              <div class="panel-header">
                {panelView.type !== 'product-detail' ? (
                  <span class="panel-title">{getPanelTitle()}</span>
                ) : (
                  <span />
                )}
                <button class="panel-close" onClick={handleClosePanel} aria-label="Fermer le panneau">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {panelView.type === 'products' && (
                <ProductGridView
                  products={panelView.products}
                  query={panelView.query}
                  onSelect={handleProductSelect}
                />
              )}

              {panelView.type === 'product-detail' && (
                <ProductDetailView
                  product={panelView.product}
                  onAddToCart={handleAddToCart}
                  onBack={handleBackToProducts}
                />
              )}

              {panelView.type === 'cart' && (
                <CartView
                  items={resolvedCartItems}
                  onUpdateQty={handleUpdateQty}
                  onRemove={handleRemoveItem}
                />
              )}

              {panelView.type === 'upsell' && (
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                    💡 {panelView.reason}
                  </p>
                  <ProductDetailView
                    product={panelView.product}
                    onAddToCart={handleAddToCart}
                    onBack={handleClosePanel}
                  />
                </div>
              )}

              {panelView.type === 'checkout' && api && (
                <WooPaymentWidgetApp
                  api={api}
                  stripeKey={stripeKey}
                  paypalClientId={paypalClientId}
                  onClose={handleClosePanel}
                />
              )}

              {panelView.type === 'checkout' && !api && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  Paiement in-chat non configuré.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
