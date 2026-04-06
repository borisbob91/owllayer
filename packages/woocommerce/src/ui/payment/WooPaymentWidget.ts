// WooPaymentWidget — mounts the in-chat payment modal in an isolated Shadow DOM.
// The modal listens to 'domos:payment:open' / 'domos:payment:close' DOM events.
import { h, render } from 'preact';
import { PAYMENT_CSS } from './payment-styles.js';
import { WooPaymentWidgetApp } from './WooPaymentWidgetApp.js';
import type { StoreApiClient } from '../../api/StoreApiClient.js';

const PAY_HOST_ID = 'domos-woo-pay-host';

export class WooPaymentWidget {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private readonly api: StoreApiClient;
  private stripeKey?: string;
  private paypalClientId?: string;

  constructor(api: StoreApiClient, stripeKey?: string, paypalClientId?: string) {
    this.api = api;
    this.stripeKey = stripeKey;
    this.paypalClientId = paypalClientId;
  }

  mount(): void {
    if (document.getElementById(PAY_HOST_ID)) return;

    this.host = document.createElement('div');
    this.host.id = PAY_HOST_ID;
    this.host.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:2147483647',
    ].join(';');
    document.body.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = PAYMENT_CSS;
    this.shadow.appendChild(styleEl);

    const container = document.createElement('div');
    container.style.cssText = 'pointer-events:auto;';
    this.shadow.appendChild(container);

    render(
      h(WooPaymentWidgetApp, {
        api: this.api,
        stripeKey: this.stripeKey,
        paypalClientId: this.paypalClientId,
        onClose: () => this.unmount(),
      }),
      container,
    );
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
