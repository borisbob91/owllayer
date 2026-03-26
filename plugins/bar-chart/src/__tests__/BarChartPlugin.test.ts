import { describe, it, expect, beforeEach } from 'vitest';
import { installPlugin } from '@domos/core';
import type { DomOSClient, RegisteredTool } from '@domos/core';
import { BarChartPlugin } from '../index.js';
import { BarChartReactPlugin } from '../react/index.js';

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
}

// ============================================================
// Tests
// ============================================================

describe('BarChartPlugin (framework-agnostic)', () => {
  let fake: FakeClient;

  beforeEach(() => {
    fake = new FakeClient();
    installPlugin(fake as unknown as DomOSClient, BarChartPlugin, {});
  });

  it('registers no tools (tools come from the mounted component)', () => {
    expect(fake.toolCount()).toBe(0);
  });

  it('updates Shadow Context with chart metadata', () => {
    const ctx = fake.getContext();
    expect(ctx).toMatchObject({ chart: { type: 'bar', theme: 'dark', color: '#7c3aed' } });
  });

  it('respects custom theme and color config', () => {
    const fake2 = new FakeClient();
    installPlugin(fake2 as unknown as DomOSClient, BarChartPlugin, {
      theme: 'light',
      color: '#ef4444',
    });
    const ctx = fake2.getContext();
    expect(ctx).toMatchObject({ chart: { theme: 'light', color: '#ef4444' } });
  });
});

describe('BarChartReactPlugin — ui.components', () => {
  it('exposes BarChart in ui.components', () => {
    expect(BarChartReactPlugin.ui?.components?.BarChart).toBeDefined();
  });

  it('BarChart is a function (React component)', () => {
    expect(typeof BarChartReactPlugin.ui?.components?.BarChart).toBe('function');
  });

  it('retains all meta from BarChartPlugin', () => {
    expect(BarChartReactPlugin.meta.name).toBe('@domos-plugins/bar-chart');
    expect(BarChartReactPlugin.meta.version).toBe('0.1.0');
  });

  it('setup function is preserved from base plugin', () => {
    const fake2 = new FakeClient();
    installPlugin(fake2 as unknown as DomOSClient, BarChartReactPlugin, { theme: 'light' });
    expect(fake2.getContext()).toMatchObject({ chart: { theme: 'light' } });
  });
});
