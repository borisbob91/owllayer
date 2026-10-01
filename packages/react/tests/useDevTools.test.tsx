import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { OwlLayerContext, type OwlLayerContextValue } from '../src/provider/OwlLayerContext.js';
import { useDevTools } from '../src/plugins/useDevTools.js';

// Le panneau partage (@owllayer/ui/devtools) est remplace par un mock qui garde la config
const mounted: { config: any } = { config: null };
vi.mock('@owllayer/ui/devtools', () => ({
  mountDevTools: (_el: Element, config: unknown) => { mounted.config = config; },
  unmountDevTools: vi.fn(),
}));

function makeCtx(overrides?: Partial<OwlLayerContextValue>): OwlLayerContextValue {
  return {
    agentState: 'disconnected',
    sessionId: null,
    toolSurface: { effectiveTools: [], serverTools: [], clientTools: [], ignoredClientTools: [] },
    getInstalledPlugins: () => [{ name: '@acme/charts', version: '1.0.0', components: ['BarChart'] }],
    getRegisteredTools: () => [],
    getEffectiveTools: () => [],
    getIgnoredClientTools: () => [],
    callTool: vi.fn(),
    subscribeEvent: vi.fn(() => () => {}),
    subscribeAnyEvent: vi.fn(() => () => {}),
    ...overrides,
  } as unknown as OwlLayerContextValue;
}

function DevTools() {
  useDevTools();
  return null;
}

const tree = (ctx: OwlLayerContextValue) => createElement(OwlLayerContext.Provider, { value: ctx }, createElement(DevTools));

describe('useDevTools — panneau partage @owllayer/ui', () => {
  it('monte le panneau avec les plugins installes', async () => {
    render(tree(makeCtx()));
    await waitFor(() => expect(mounted.config).not.toBeNull());
    expect(mounted.config.plugins).toEqual([{ name: '@acme/charts', version: '1.0.0', components: ['BarChart'] }]);
  });

  it('lit l\'etat du dernier rendu, pas celui du montage', async () => {
    mounted.config = null;
    const { rerender } = render(tree(makeCtx()));
    await waitFor(() => expect(mounted.config).not.toBeNull());
    expect(mounted.config.getAgentState()).toBe('disconnected');

    const tools = [{ name: 'fill_checkout_form', description: 'Fill', risk: 'none' }];
    rerender(tree(makeCtx({
      agentState: 'connected',
      sessionId: 'sess_1',
      getRegisteredTools: () => tools as any,
    })));

    expect(mounted.config.getAgentState()).toBe('connected');
    expect(mounted.config.getSessionId()).toBe('sess_1');
    expect(mounted.config.getRegisteredTools()).toBe(tools);
  });
});
