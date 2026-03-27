import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installPlugin } from '@domos/core';
import type { DomOSClient, RegisteredTool } from '@domos/core';
import { ScrollPlugin } from '../index.js';

// ============================================================
// FakeClient (same pattern as other plugin tests)
// ============================================================

class FakeClient {
  private _tools = new Map<string, RegisteredTool>();
  private _ctx: Record<string, unknown> = {};

  registerTool(tool: RegisteredTool): void { this._tools.set(tool.declaration.name, tool); }
  unregisterTool(name: string): void { this._tools.delete(name); }
  unregisterToolsByComponent(id: string): void {
    for (const [k, v] of this._tools) { if (v.componentId === id) this._tools.delete(k); }
  }
  hasTool(name: string): boolean { return this._tools.has(name); }
  updateContext(data: Record<string, unknown>): void { this._ctx = { ...this._ctx, ...data }; }
  getContext(): Record<string, unknown> { return { ...this._ctx }; }
  toolCount(): number { return this._tools.size; }
  getTool(name: string): RegisteredTool | undefined { return this._tools.get(name); }
}

// ============================================================
// Tests
// ============================================================

describe('ScrollPlugin — meta & setup', () => {
  let fake: FakeClient;

  beforeEach(() => {
    fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, ScrollPlugin, {});
  });

  it('has correct metadata', () => {
    expect(ScrollPlugin.meta.name).toBe('@domos-plugins/scroll');
    expect(ScrollPlugin.meta.version).toBe('0.1.0');
    expect(ScrollPlugin.meta.description).toBeTruthy();
  });

  it('registers exactly 4 tools', () => {
    expect(fake.toolCount()).toBe(4);
  });

  it('registers scroll_to_element tool', () => {
    expect(fake.hasTool('@domos-plugins/scroll/scroll_to_element')).toBe(true);
  });

  it('registers scroll_to_position tool', () => {
    expect(fake.hasTool('@domos-plugins/scroll/scroll_to_position')).toBe(true);
  });

  it('registers get_scroll_info tool', () => {
    expect(fake.hasTool('@domos-plugins/scroll/get_scroll_info')).toBe(true);
  });

  it('registers get_visible_sections tool', () => {
    expect(fake.hasTool('@domos-plugins/scroll/get_visible_sections')).toBe(true);
  });

  it('updates Shadow Context with scroll metadata', () => {
    const ctx = fake.getContext();
    expect(ctx).toMatchObject({
      scroll: {
        available: true,
        tools: ['scroll_to_element', 'scroll_to_position', 'get_scroll_info', 'get_visible_sections'],
        defaultBehavior: 'smooth',
      },
    });
  });

  it('respects custom defaultBehavior config', () => {
    const fake2 = new FakeClient();
    installPlugin(fake2 as unknown as DomOSClient, ScrollPlugin, { defaultBehavior: 'instant' });
    expect(fake2.getContext()).toMatchObject({ scroll: { defaultBehavior: 'instant' } });
  });

  it('has no ui property (tool-only plugin)', () => {
    expect((ScrollPlugin as any).ui).toBeUndefined();
  });
});

describe('ScrollPlugin — scroll_to_element handler', () => {
  let fake: FakeClient;

  beforeEach(() => {
    fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, ScrollPlugin, {});
  });

  it('returns error when selector is missing', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_element')!;
    const result = await tool.handler({});
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('selector') });
  });

  it('returns error when element is not found', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_element')!;
    const result = await tool.handler({ selector: '#nonexistent-element-xyz' });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('not found') });
  });

  it('scrolls to an existing element', async () => {
    const div = document.createElement('div');
    div.id = 'test-scroll-target';
    document.body.appendChild(div);
    div.scrollIntoView = vi.fn();

    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_element')!;
    const result = await tool.handler({ selector: '#test-scroll-target' });

    expect(result).toMatchObject({ success: true, selector: '#test-scroll-target' });
    expect(div.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    document.body.removeChild(div);
  });

  it('respects behavior and block parameters', async () => {
    const div = document.createElement('div');
    div.id = 'test-block-param';
    document.body.appendChild(div);
    div.scrollIntoView = vi.fn();

    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_element')!;
    await tool.handler({ selector: '#test-block-param', behavior: 'instant', block: 'center' });

    expect(div.scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'center' });

    document.body.removeChild(div);
  });
});

describe('ScrollPlugin — scroll_to_position handler', () => {
  let fake: FakeClient;

  beforeEach(() => {
    fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, ScrollPlugin, {});
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  it('scrolls to top', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_position')!;
    const result = await tool.handler({ position: 'top' });
    expect(result).toMatchObject({ success: true, scrollY: 0 });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('scrolls to bottom', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_position')!;
    const result = await tool.handler({ position: 'bottom' });
    expect(result).toMatchObject({ success: true });
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('scrolls to a pixel number', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_position')!;
    const result = await tool.handler({ position: 500 });
    expect(result).toMatchObject({ success: true, scrollY: 500 });
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
  });

  it('returns error for invalid position', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/scroll_to_position')!;
    const result = await tool.handler({ position: 'invalid' });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('Invalid position') });
  });
});

describe('ScrollPlugin — get_scroll_info handler', () => {
  let fake: FakeClient;

  beforeEach(() => {
    fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, ScrollPlugin, {});
  });

  it('returns scroll position info', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/get_scroll_info')!;
    const result = await tool.handler({}) as Record<string, unknown>;
    expect(result).toMatchObject({
      success: true,
      scrollY: expect.any(Number),
      scrollX: expect.any(Number),
      viewportHeight: expect.any(Number),
      viewportWidth: expect.any(Number),
      documentHeight: expect.any(Number),
      documentWidth: expect.any(Number),
      scrollPercent: expect.any(Number),
      isAtTop: expect.any(Boolean),
      isAtBottom: expect.any(Boolean),
    });
  });
});

describe('ScrollPlugin — get_visible_sections handler', () => {
  let fake: FakeClient;

  beforeEach(() => {
    fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, ScrollPlugin, {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns empty sections when none match', async () => {
    const tool = fake.getTool('@domos-plugins/scroll/get_visible_sections')!;
    const result = await tool.handler({}) as Record<string, unknown>;
    expect(result).toMatchObject({ success: true, count: 0, sections: [] });
  });

  it('detects sections with data-section attribute', async () => {
    const section = document.createElement('section');
    section.setAttribute('data-section', 'hero');
    // jsdom: getBoundingClientRect returns zeros, so visibility = 0 unless mocked
    section.getBoundingClientRect = vi.fn(() => ({
      top: 0, bottom: 100, left: 0, right: 800, width: 800, height: 100, x: 0, y: 0, toJSON: () => {},
    }));
    document.body.appendChild(section);

    // Mock window.innerHeight so section is "visible"
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

    const tool = fake.getTool('@domos-plugins/scroll/get_visible_sections')!;
    const result = await tool.handler({}) as any;
    expect(result.success).toBe(true);
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections[0].id).toBe('hero');
  });
});

describe('ScrollPlugin — uninstall cleanup', () => {
  it('removes all tools when uninstalled via unregisterToolsByComponent', () => {
    const fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, ScrollPlugin, {});
    expect(fake.toolCount()).toBe(4);

    fake.unregisterToolsByComponent('plugin:@domos-plugins/scroll');
    expect(fake.toolCount()).toBe(0);
  });
});
