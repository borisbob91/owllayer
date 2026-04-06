import { h, render } from 'preact';
import { WIDGET_CSS } from './styles';
import { ShopifyWidgetApp, type DomOSBridge } from './ShopifyWidgetApp';

const HOST_ID = 'domos-shopify-host';

/**
 * ShopifyWidget — mounts the chat/voice widget into an isolated Shadow DOM.
 *
 * Usage:
 *   const widget = new ShopifyWidget(domosBridge);
 *   widget.mount();
 *   // later:
 *   widget.unmount();
 */
export class ShopifyWidget {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private domos: DomOSBridge;

  constructor(domos: DomOSBridge) {
    this.domos = domos;
  }

  mount(): void {
    if (document.getElementById(HOST_ID)) return; // already mounted

    // Create host element outside the page's DOM tree styling
    this.host = document.createElement('div');
    this.host.id = HOST_ID;
    this.host.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:2147483638',
    ].join(';');

    document.body.appendChild(this.host);

    // Attach shadow root for full CSS isolation
    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = WIDGET_CSS;
    this.shadow.appendChild(styleEl);

    // Mount container (pointer-events: auto so the widget is interactive)
    const container = document.createElement('div');
    container.style.cssText = 'pointer-events:auto;';
    this.shadow.appendChild(container);

    // Render Preact app into shadow DOM container
    render(h(ShopifyWidgetApp, { domos: this.domos }), container);
  }

  unmount(): void {
    if (this.host) {
      if (this.shadow) {
        render(null, this.shadow.querySelector('div') as Element);
      }
      this.host.remove();
      this.host = null;
      this.shadow = null;
    }
  }
}
