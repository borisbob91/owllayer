import { h, render } from 'preact';
import { WIDGET_CSS } from './styles';
import { WooWidgetApp, type OwlLayerBridge } from './WooWidgetApp';
import type { StoreApiClient } from '../api/StoreApiClient.js';

const HOST_ID = 'owllayer-woo-chat-host';

export interface WooWidgetOptions {
  owllayer: OwlLayerBridge;
  /** Required if inChatPayments is enabled */
  api?: StoreApiClient;
  stripeKey?: string;
  paypalClientId?: string;
}

/**
 * WooWidget — mounts the chat/voice widget + inline checkout panel into an
 * isolated Shadow DOM. The payment panel is rendered inside the content-panel
 * of the same widget (no second modal).
 */
export class WooWidget {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private opts: WooWidgetOptions;

  constructor(opts: WooWidgetOptions | OwlLayerBridge) {
    // Backwards-compat: accept plain OwlLayerBridge (no payment)
    if ('startVoice' in opts) {
      this.opts = { owllayer: opts as OwlLayerBridge };
    } else {
      this.opts = opts as WooWidgetOptions;
    }
  }

  mount(): void {
    if (document.getElementById(HOST_ID)) return;

    this.host = document.createElement('div');
    this.host.id = HOST_ID;
    this.host.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:2147483638',
    ].join(';');

    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = WIDGET_CSS;
    this.shadow.appendChild(styleEl);

    const container = document.createElement('div');
    container.style.cssText = 'pointer-events:auto;';
    this.shadow.appendChild(container);

    render(h(WooWidgetApp, {
      owllayer: this.opts.owllayer,
      api: this.opts.api,
      stripeKey: this.opts.stripeKey,
      paypalClientId: this.opts.paypalClientId,
    }), container);
  }

  unmount(): void {
    if (this.host) {
      const container = this.shadow?.querySelector('div');
      if (container) render(null, container);
      this.host.remove();
      this.host = null;
      this.shadow = null;
    }
  }
}