import type { OwlLayerClientPlugin, PluginClientContext } from '@owllayer/core';

// ============================================================
// Config
// ============================================================

export interface ScrollPluginConfig {
  /** Comportement de scroll par defaut : 'smooth' ou 'instant'. Defaut : 'smooth' */
  defaultBehavior?: ScrollBehavior;
  /** Selecteur CSS utilise par get_visible_sections pour detecter les sections. */
  sectionSelector?: string;
}

type ScrollBehavior = 'smooth' | 'instant';

// ============================================================
// Helpers — SSR-safe
// ============================================================

function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

function clampBehavior(value: unknown, fallback: ScrollBehavior): ScrollBehavior {
  return value === 'smooth' || value === 'instant' ? value : fallback;
}

// ============================================================
// Tool handlers
// ============================================================

function createScrollToElement(defaults: Required<ScrollPluginConfig>) {
  return (args: Record<string, unknown>) => {
    if (!isBrowser()) return { success: false, error: 'SSR environment — no DOM available' };

    const selector = String(args.selector ?? '');
    if (!selector) return { success: false, error: 'Missing required parameter: selector' };

    const el = document.querySelector(selector);
    if (!el) return { success: false, error: `Element not found: ${selector}` };

    const behavior = clampBehavior(args.behavior, defaults.defaultBehavior);
    const block = (['start', 'center', 'end', 'nearest'] as const).includes(
      args.block as 'start' | 'center' | 'end' | 'nearest',
    )
      ? (args.block as ScrollLogicalPosition)
      : 'start';

    el.scrollIntoView({ behavior, block });

    const rect = el.getBoundingClientRect();
    return {
      success: true,
      selector,
      rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
    };
  };
}

function createScrollToPosition(defaults: Required<ScrollPluginConfig>) {
  return (args: Record<string, unknown>) => {
    if (!isBrowser()) return { success: false, error: 'SSR environment — no DOM available' };

    const behavior = clampBehavior(args.behavior, defaults.defaultBehavior);
    const pos = args.position;

    let targetY: number;
    if (pos === 'top') {
      targetY = 0;
    } else if (pos === 'bottom') {
      targetY = document.documentElement.scrollHeight - window.innerHeight;
    } else {
      const n = Number(pos);
      if (Number.isFinite(n)) {
        targetY = Math.max(0, n);
      } else {
        return { success: false, error: `Invalid position: ${String(pos)}. Use "top", "bottom", or a pixel number.` };
      }
    }

    window.scrollTo({ top: targetY, behavior });
    return { success: true, scrollY: targetY };
  };
}

function createGetScrollInfo() {
  return () => {
    if (!isBrowser()) return { success: false, error: 'SSR environment — no DOM available' };

    const scrollY = Math.round(window.scrollY);
    const scrollX = Math.round(window.scrollX);
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const documentHeight = document.documentElement.scrollHeight;
    const documentWidth = document.documentElement.scrollWidth;
    const maxScroll = Math.max(documentHeight - viewportHeight, 1);
    const scrollPercent = Math.round((scrollY / maxScroll) * 100);

    return {
      success: true,
      scrollY,
      scrollX,
      viewportHeight,
      viewportWidth,
      documentHeight,
      documentWidth,
      scrollPercent: Math.min(scrollPercent, 100),
      isAtTop: scrollY <= 0,
      isAtBottom: scrollY + viewportHeight >= documentHeight - 1,
    };
  };
}

function createGetVisibleSections(defaults: Required<ScrollPluginConfig>) {
  return (args: Record<string, unknown>) => {
    if (!isBrowser()) return { success: false, error: 'SSR environment — no DOM available' };

    const selector = String(args.selector || defaults.sectionSelector);
    const elements = document.querySelectorAll(selector);
    const vpHeight = window.innerHeight;
    const sections: Array<{
      id: string;
      tag: string;
      top: number;
      bottom: number;
      visiblePercent: number;
    }> = [];

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const elHeight = rect.height;
      if (elHeight === 0) return;

      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, vpHeight);
      const visibleHeight = Math.max(visibleBottom - visibleTop, 0);
      const visiblePercent = Math.round((visibleHeight / elHeight) * 100);

      if (visiblePercent > 0) {
        sections.push({
          id: el.id || el.getAttribute('data-section') || '',
          tag: el.tagName.toLowerCase(),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          visiblePercent,
        });
      }
    });

    return { success: true, count: sections.length, sections };
  };
}

// ============================================================
// Plugin registration — tools registered in setup()
// ============================================================

function registerScrollTools(ctx: PluginClientContext, config: ScrollPluginConfig): void {
  const defaults: Required<ScrollPluginConfig> = {
    defaultBehavior: config.defaultBehavior ?? 'smooth',
    sectionSelector: config.sectionSelector ?? '[data-section], section[id], [id]',
  };

  ctx.registerTool('scroll_to_element', {
    description:
      'Scroll the page to a specific DOM element identified by a CSS selector. ' +
      'Useful to bring a section, heading, button, or any element into view. ' +
      'Returns the element bounding rect on success.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the target element (e.g. "#pricing", ".hero", "[data-section=faq]")' },
        behavior: { type: 'string', description: 'Scroll animation: "smooth" (default) or "instant"' },
        block: { type: 'string', description: 'Vertical alignment: "start" (default), "center", "end", or "nearest"' },
      },
      required: ['selector'],
    },
    risk: 'none',
    handler: createScrollToElement(defaults),
  });

  ctx.registerTool('scroll_to_position', {
    description:
      'Scroll the page to an absolute vertical position. ' +
      'Use "top" to go to the very top, "bottom" for the end, or a pixel number for a precise offset.',
    parameters: {
      type: 'object',
      properties: {
        position: { type: 'string', description: '"top", "bottom", or a pixel number (e.g. 500)' },
        behavior: { type: 'string', description: 'Scroll animation: "smooth" (default) or "instant"' },
      },
      required: ['position'],
    },
    risk: 'none',
    handler: createScrollToPosition(defaults),
  });

  ctx.registerTool('get_scroll_info', {
    description:
      'Get the current scroll position and page dimensions. ' +
      'Returns scrollY, scrollX, viewport size, document size, scroll percentage, and whether the user is at the top or bottom.',
    risk: 'none',
    handler: createGetScrollInfo(),
  });

  ctx.registerTool('get_visible_sections', {
    description:
      'Detect which page sections are currently visible in the viewport. ' +
      'Returns an array of sections with their ID, tag, position, and how much of each is visible (percent). ' +
      'Useful to understand what the user is currently looking at.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional CSS selector override to locate sections (default: "[data-section], section[id], [id]")' },
      },
    },
    risk: 'none',
    handler: createGetVisibleSections(defaults),
  });

  ctx.updateContext({
    scroll: {
      available: true,
      tools: ['scroll_to_element', 'scroll_to_position', 'get_scroll_info', 'get_visible_sections'],
      defaultBehavior: defaults.defaultBehavior,
    },
  });
}

// ============================================================
// ScrollPlugin — tool-only, framework-agnostic
// ============================================================

/**
 * ScrollPlugin — plugin OwlLayer de scroll pilote par l'IA.
 *
 * 100 % tool-only : tous les tools sont enregistres dans setup(),
 * aucun composant UI n'est necessaire. Compatible React, Vue,
 * Svelte, ou tout autre framework utilisant OwlLayerClient.
 *
 * Tools exposes :
 * - scroll_to_element  — scroller vers un element CSS
 * - scroll_to_position — scroller vers top/bottom/pixel
 * - get_scroll_info    — position actuelle et dimensions
 * - get_visible_sections — sections visibles dans le viewport
 */
export const ScrollPlugin: OwlLayerClientPlugin<ScrollPluginConfig> = {
  meta: {
    name: '@owllayer-plugins/scroll',
    version: '0.1.0',
    description:
      'Plugin OwlLayer de scroll pilote par l\'IA. ' +
      'Tool-only, framework-agnostic : scroll_to_element, scroll_to_position, get_scroll_info, get_visible_sections.',
  },
  setup(ctx, config = {}) {
    registerScrollTools(ctx, config);
  },
};
