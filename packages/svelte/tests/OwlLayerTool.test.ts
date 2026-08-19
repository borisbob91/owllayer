import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import { owlLayerClient } from '../src/stores/owllayer.store.js';
import { agentTool } from '../src/actions/useAgentTool.js';
import OwlLayerTool from '../src/components/tool/OwlLayerTool.svelte';
import OwlLayerToolBtn from '../src/components/tool/OwlLayerToolBtn.svelte';

// ============================================================
// Mock client helpers
// ============================================================

function makeMockClient() {
  return {
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
  };
}

let container: HTMLElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  document.body.removeChild(container);
  owlLayerClient.set(null);
});

/** Mount a component with the mock client set in the store */
function mountWithClient(component: any, props: Record<string, unknown>) {
  const client = makeMockClient();
  owlLayerClient.set(client as any);
  let instance: any;
  flushSync(() => {
    instance = mount(component, { target: container, props });
  });
  return { instance, client };
}

// ============================================================
// OwlLayerTool — action DOM
// ============================================================

describe('OwlLayerTool — action="click"', () => {
  it('registers the tool on mount with the correct name and description', () => {
    const { client } = mountWithClient(OwlLayerTool, {
      name: 'clear_cart',
      description: 'Clear the cart',
      action: 'click',
      children: () => {
        const btn = document.createElement('button');
        btn.textContent = 'Clear';
        container.appendChild(btn);
      },
    });
    expect(client.registerTool).toHaveBeenCalledOnce();
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({ name: 'clear_cart', description: 'Clear the cart' }),
        handler: expect.any(Function),
        componentId: expect.any(String),
      })
    );
  });

  it('calls .click() on firstElementChild when the agent handler is invoked', () => {
    const { client } = mountWithClient(OwlLayerTool, {
      name: 'btn_tool',
      description: 'Click',
      action: 'click',
      children: () => {},
    });

    // Insert a child button into the wrapper span
    const span = container.querySelector('span')!;
    const btn = document.createElement('button');
    btn.setAttribute('data-testid', 'child-btn');
    span.appendChild(btn);
    const clickSpy = vi.spyOn(btn, 'click');

    const { handler } = client.registerTool.mock.calls[0][0];
    handler();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('unregisters the tool on unmount', () => {
    const { client, instance } = mountWithClient(OwlLayerTool, {
      name: 'nav_tool',
      description: 'Nav',
      action: 'click',
      children: () => {},
    });
    unmount(instance);
    expect(client.unregisterTool).toHaveBeenCalledWith('nav_tool');
  });
});

describe('OwlLayerTool — action="focus"', () => {
  it('calls .focus() on firstElementChild', () => {
    const { client } = mountWithClient(OwlLayerTool, {
      name: 'focus_tool',
      description: 'Focus',
      action: 'focus',
      children: () => {},
    });

    const span = container.querySelector('span')!;
    const input = document.createElement('input');
    span.appendChild(input);
    const focusSpy = vi.spyOn(input, 'focus');

    const { handler } = client.registerTool.mock.calls[0][0];
    handler();
    expect(focusSpy).toHaveBeenCalledOnce();
  });
});

// ============================================================
// OwlLayerTool — direct handler
// ============================================================

describe('OwlLayerTool — direct handler', () => {
  it('calls the handler directly without DOM interaction', async () => {
    const directHandler = vi.fn().mockResolvedValue('ok');
    const { client } = mountWithClient(OwlLayerTool, {
      name: 'handler_tool',
      description: 'Direct',
      handler: directHandler,
      children: () => {},
    });

    const { handler } = client.registerTool.mock.calls[0][0];
    await handler();
    expect(directHandler).toHaveBeenCalledOnce();
  });
});

// ============================================================
// OwlLayerTool — context serialized into description
// ============================================================

describe('OwlLayerTool — context', () => {
  it('appends serialized context to the description', () => {
    const { client } = mountWithClient(OwlLayerTool, {
      name: 'ctx_tool',
      description: 'My tool',
      action: 'click',
      context: { productId: '42', name: 'Nike' },
      children: () => {},
    });
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({
          description: 'My tool. Context: {"productId":"42","name":"Nike"}',
        }),
      })
    );
  });

  it('uses raw description when no context is provided', () => {
    const { client } = mountWithClient(OwlLayerTool, {
      name: 'no_ctx',
      description: 'Simple',
      action: 'click',
      children: () => {},
    });
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({ description: 'Simple' }),
      })
    );
  });
});

// ============================================================
// OwlLayerTool — runtime validation errors
// ============================================================

describe('OwlLayerTool — runtime errors', () => {
  it('throws if both action and handler are provided', () => {
    owlLayerClient.set(makeMockClient() as any);
    expect(() =>
      mount(OwlLayerTool, {
        target: container,
        props: { name: 'bad', description: 'Bad', action: 'click', handler: vi.fn(), children: () => {} },
      })
    ).toThrow('provide action OR handler, not both');
  });

  it('throws if neither action nor handler is provided', () => {
    owlLayerClient.set(makeMockClient() as any);
    expect(() =>
      mount(OwlLayerTool, {
        target: container,
        props: { name: 'bad', description: 'Bad', children: () => {} },
      })
    ).toThrow('action or handler is required');
  });
});

// ============================================================
// OwlLayerTool — wrapper span transparency
// ============================================================

describe('OwlLayerTool — wrapper span', () => {
  it('renders a span with display:contents', () => {
    mountWithClient(OwlLayerTool, {
      name: 'span_tool',
      description: 'Span',
      action: 'click',
      children: () => {},
    });
    const span = container.querySelector('span');
    expect(span).not.toBeNull();
    expect(span!.getAttribute('style')).toContain('display: contents');
  });
});

// ============================================================
// OwlLayerTool — update() re-registration on context change
// Tests agentTool.update() directly — this is what Svelte calls when
// the $derived fullDescription changes inside OwlLayerTool.svelte
// ============================================================

describe('OwlLayerTool — context reactivity (update)', () => {
  it('unregisters and re-registers when context prop changes', () => {
    const client = makeMockClient();
    owlLayerClient.set(client as any);
    const node = document.createElement('span');

    const action = agentTool(node, {
      name: 're_tool',
      description: 'Reactive. Context: {"count":1}',
      risk: 'none',
      handler: vi.fn(),
    });

    expect(client.registerTool).toHaveBeenCalledOnce();

    // Simulate what Svelte calls when $derived fullDescription changes
    action?.update?.({
      name: 're_tool',
      description: 'Reactive. Context: {"count":2}',
      risk: 'none',
      handler: vi.fn(),
    });

    expect(client.unregisterTool).toHaveBeenCalledWith('re_tool');
    expect(client.registerTool).toHaveBeenCalledTimes(2);
    expect(client.registerTool).toHaveBeenLastCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({
          description: 'Reactive. Context: {"count":2}',
        }),
      })
    );
  });
});

// ============================================================
// OwlLayerToolBtn
// ============================================================

describe('OwlLayerToolBtn', () => {
  it('registers the tool on mount', () => {
    const handler = vi.fn();
    const { client } = mountWithClient(OwlLayerToolBtn, {
      name: 'btn',
      description: 'A button',
      handler,
      children: () => {},
    });
    expect(client.registerTool).toHaveBeenCalledOnce();
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({ name: 'btn', description: 'A button' }),
        handler: expect.any(Function),
      })
    );
  });

  it('calls handler on user click', async () => {
    const handler = vi.fn();
    mountWithClient(OwlLayerToolBtn, {
      name: 'btn',
      description: 'Btn',
      handler,
      children: () => {},
    });
    container.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls handler via agent (registerTool callback)', async () => {
    const handler = vi.fn().mockResolvedValue('done');
    const { client } = mountWithClient(OwlLayerToolBtn, {
      name: 'btn',
      description: 'Btn',
      handler,
      children: () => {},
    });
    const { handler: agentHandler } = client.registerTool.mock.calls[0][0];
    await agentHandler();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('disables the button for humans but agent still works', async () => {
    const handler = vi.fn();
    const { client } = mountWithClient(OwlLayerToolBtn, {
      name: 'btn',
      description: 'Btn',
      handler,
      disabled: true,
      children: () => {},
    });
    expect(container.querySelector('button')!.disabled).toBe(true);

    const { handler: agentHandler } = client.registerTool.mock.calls[0][0];
    await agentHandler();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('unregisters on unmount', () => {
    const { client, instance } = mountWithClient(OwlLayerToolBtn, {
      name: 'btn',
      description: 'Btn',
      handler: vi.fn(),
      children: () => {},
    });
    unmount(instance);
    expect(client.unregisterTool).toHaveBeenCalledWith('btn');
  });

  it('applies class to the button', () => {
    mountWithClient(OwlLayerToolBtn, {
      name: 'styled',
      description: 'Styled',
      handler: vi.fn(),
      class: 'btn-primary text-red',
      children: () => {},
    });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('btn-primary');
    expect(btn.className).toContain('text-red');
  });
});
