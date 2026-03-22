import type { DiscoveredToolConfig } from '../types.js';

interface AutoDiscoveryCallbacks {
  onToolDiscovered: (tool: DiscoveredToolConfig, handler: (args: Record<string, unknown>) => Promise<unknown>) => void;
  onToolRemoved: (toolName: string) => void;
  onContextData?: (data: Record<string, unknown>) => void;
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

    const alreadyBound = [...this.boundElements.values()].includes(name);
    if (alreadyBound) {
      if (this.callbacks.debug) {
        // eslint-disable-next-line no-console
        console.warn(`[DomOS/browser] Auto-discovery: tool "${name}" déjà enregistré — élément ignoré.`);
      }
      return;
    }

    const action = this.parseAction(el.getAttribute('data-domos-action'));
    const description =
      el.getAttribute('data-domos-description')?.trim() ||
      `Action DOM auto-discovered: ${action}`;

    let schema: Record<string, unknown> | undefined;
    const schemaRaw = el.getAttribute('data-domos-schema');
    if (schemaRaw) {
      try { schema = JSON.parse(schemaRaw); } catch {
        // eslint-disable-next-line no-console
        console.warn(`[DomOS/browser] data-domos-schema invalide sur "${name}"`);
      }
    }

    let contextData: Record<string, unknown> | undefined;
    const contextRaw = el.getAttribute('data-domos-context');
    if (contextRaw) {
      try { contextData = JSON.parse(contextRaw); } catch {
        // eslint-disable-next-line no-console
        console.warn(`[DomOS/browser] data-domos-context invalide sur "${name}"`);
      }
    }

    if (contextData && this.callbacks.onContextData) {
      this.callbacks.onContextData(contextData);
    }

    const tool: DiscoveredToolConfig = {
      name,
      description,
      risk: this.parseRisk(el.getAttribute('data-domos-risk')),
      action,
      selector: el.getAttribute('data-domos-selector')?.trim() || undefined,
      target: el.getAttribute('data-domos-target')?.trim() || undefined,
      schema,
      contextData,
    };

    const handler = async (args: Record<string, unknown>) => {
      const target = this.resolveTarget(el, tool.selector, args, tool.target);
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
        case 'show':
          (target as HTMLElement).classList.remove('hidden');
          (target as HTMLElement).style.display = 'block';
          break;
        case 'hide':
          (target as HTMLElement).classList.add('hidden');
          (target as HTMLElement).style.display = 'none';
          break;
        case 'addClass': {
          const cn = String(args.className ?? '').trim();
          if (cn) target.classList.add(...cn.split(/\s+/));
          break;
        }
        case 'removeClass': {
          const cn = String(args.className ?? '').trim();
          if (cn) target.classList.remove(...cn.split(/\s+/));
          break;
        }
      }

      return { status: 'success', result: `${tool.action} execut�`, tool: tool.name };
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
    if (value === 'show' || value === 'hide' || value === 'addClass' || value === 'removeClass') return value;
    return 'click';
  }

  private interpolate(template: string, args: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(args[key] ?? ''));
  }

  private resolveTarget(el: Element, selector: string | undefined, args: Record<string, unknown>, target?: string): Element | null {
    if (typeof document === 'undefined') return null;

    if (target) {
      return document.querySelector(this.interpolate(target, args));
    }

    const selectorFromArgs = typeof args.selector === 'string' ? args.selector : undefined;
    const resolvedSelector = selectorFromArgs || selector;
    if (resolvedSelector) {
      return document.querySelector(resolvedSelector);
    }

    return el;
  }
}
