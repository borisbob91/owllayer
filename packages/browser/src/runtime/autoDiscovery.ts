import type { DiscoveredToolConfig } from '../types.js';

interface AutoDiscoveryCallbacks {
  onToolDiscovered: (tool: DiscoveredToolConfig, handler: (args: Record<string, unknown>) => Promise<unknown>) => void;
  onToolRemoved: (toolName: string) => void;
  debug?: boolean;
}

const TOOL_ATTR = 'data-domos-tool';

export class AutoDiscoveryManager {
  private readonly callbacks: AutoDiscoveryCallbacks;
  private observer: MutationObserver | null = null;
  private readonly boundElements = new Map<Element, string>();

  constructor(callbacks: AutoDiscoveryCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (typeof document === 'undefined') return;
    this.scan(document);

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) this.scan(node);
        });
        mutation.removedNodes.forEach((node) => {
          if (node instanceof Element) this.cleanup(node);
        });
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;

    for (const toolName of this.boundElements.values()) {
      this.callbacks.onToolRemoved(toolName);
    }
    this.boundElements.clear();
  }

  private scan(root: Element | Document): void {
    const elements = root.querySelectorAll?.(`[${TOOL_ATTR}]`) ?? [];
    elements.forEach((el) => this.bindElement(el));

    if (root instanceof Element && root.hasAttribute(TOOL_ATTR)) {
      this.bindElement(root);
    }
  }

  private cleanup(root: Element): void {
    if (this.boundElements.has(root)) {
      const toolName = this.boundElements.get(root)!;
      this.callbacks.onToolRemoved(toolName);
      this.boundElements.delete(root);
    }

    const elements = root.querySelectorAll(`[${TOOL_ATTR}]`);
    elements.forEach((el) => {
      const toolName = this.boundElements.get(el);
      if (!toolName) return;
      this.callbacks.onToolRemoved(toolName);
      this.boundElements.delete(el);
    });
  }

  private bindElement(el: Element): void {
    if (this.boundElements.has(el)) return;

    const name = el.getAttribute('data-domos-tool')?.trim();
    if (!name) return;

    const action = this.parseAction(el.getAttribute('data-domos-action'));
    const description =
      el.getAttribute('data-domos-description')?.trim() ||
      `Action DOM auto-discovered: ${action}`;

    const tool: DiscoveredToolConfig = {
      name,
      description,
      risk: this.parseRisk(el.getAttribute('data-domos-risk')),
      action,
      selector: el.getAttribute('data-domos-selector')?.trim() || undefined,
    };

    const handler = async (args: Record<string, unknown>) => {
      const target = this.resolveTarget(el, tool.selector, args);
      if (!target) {
        return { status: 'error', result: `Target introuvable pour ${tool.name}` };
      }

      switch (tool.action) {
        case 'click':
          (target as HTMLElement).click?.();
          break;
        case 'focus':
          (target as HTMLElement).focus?.();
          break;
        case 'scrollIntoView':
          (target as HTMLElement).scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          break;
        case 'setValue': {
          const value = String(args.value ?? el.getAttribute('data-domos-value') ?? '');
          if ('value' in (target as HTMLInputElement)) {
            (target as HTMLInputElement).value = value;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        }
      }

      return { status: 'success', result: `${tool.action} executé`, tool: tool.name };
    };

    this.callbacks.onToolDiscovered(tool, handler);
    this.boundElements.set(el, name);

    if (this.callbacks.debug) {
      // eslint-disable-next-line no-console
      console.debug(`[DomOS/browser] Tool auto-discovered: ${name}`);
    }
  }

  private parseRisk(value: string | null): DiscoveredToolConfig['risk'] {
    if (value === 'low' || value === 'high' || value === 'critical') return value;
    return 'none';
  }

  private parseAction(value: string | null): DiscoveredToolConfig['action'] {
    if (value === 'focus' || value === 'scrollIntoView' || value === 'setValue') return value;
    return 'click';
  }

  private resolveTarget(el: Element, selector: string | undefined, args: Record<string, unknown>): Element | null {
    if (typeof document === 'undefined') return null;

    const selectorFromArgs = typeof args.selector === 'string' ? args.selector : undefined;
    const resolvedSelector = selectorFromArgs || selector;
    if (resolvedSelector) {
      return document.querySelector(resolvedSelector);
    }

    return el;
  }
}
