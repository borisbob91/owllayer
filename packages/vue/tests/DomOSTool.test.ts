import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { DOMOS_CLIENT_KEY } from '../src/plugin/DomOSPlugin.js';
import DomOSTool from '../src/components/tool/DomOSTool.vue';
import DomOSToolBtn from '../src/components/tool/DomOSToolBtn.vue';

// ============================================================
// Mock client factory
// ============================================================

function makeMockClient() {
  return {
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
  };
}

/** Mount a component with the mock client provided via injection */
function mountWithClient<T extends Record<string, unknown>>(
  component: any,
  props: T,
  slots: Record<string, () => any> = {}
) {
  const client = makeMockClient();
  const wrapper = mount(component, {
    props,
    slots,
    global: {
      provide: {
        [DOMOS_CLIENT_KEY as unknown as string]: client,
      },
    },
  });
  return { wrapper, client };
}

// ============================================================
// DomOSTool — action DOM
// ============================================================

describe('DomOSTool — action="click"', () => {
  it('registers the tool on mount with the correct name and description', () => {
    const { client } = mountWithClient(
      DomOSTool,
      { name: 'clear_cart', description: 'Clear the cart', action: 'click' },
      { default: () => h('button', 'Clear') }
    );
    expect(client.registerTool).toHaveBeenCalledOnce();
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({ name: 'clear_cart', description: 'Clear the cart' }),
        handler: expect.any(Function),
        componentId: expect.any(String),
      })
    );
  });

  it('calls .click() on firstElementChild when the agent handler is invoked', async () => {
    const { client, wrapper } = mountWithClient(
      DomOSTool,
      { name: 'btn_tool', description: 'Click', action: 'click' },
      { default: () => h('button', { 'data-testid': 'child-btn' }, 'Go') }
    );

    const btn = wrapper.find('button').element;
    const clickSpy = vi.spyOn(btn, 'click');

    const { handler } = client.registerTool.mock.calls[0][0];
    await handler();
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('unregisters the tool on unmount', async () => {
    const { client, wrapper } = mountWithClient(
      DomOSTool,
      { name: 'nav_tool', description: 'Nav', action: 'click' },
      { default: () => h('a', { href: '#' }, 'Link') }
    );
    await wrapper.unmount();
    expect(client.unregisterTool).toHaveBeenCalledWith('nav_tool');
  });
});

describe('DomOSTool — action="focus"', () => {
  it('calls .focus() on firstElementChild', async () => {
    const { client, wrapper } = mountWithClient(
      DomOSTool,
      { name: 'focus_tool', description: 'Focus', action: 'focus' },
      { default: () => h('input', { 'data-testid': 'input' }) }
    );

    const input = wrapper.find('input').element;
    const focusSpy = vi.spyOn(input, 'focus');

    const { handler } = client.registerTool.mock.calls[0][0];
    await handler();
    expect(focusSpy).toHaveBeenCalledOnce();
  });
});

// ============================================================
// DomOSTool — direct handler
// ============================================================

describe('DomOSTool — direct handler', () => {
  it('calls the handler directly without DOM interaction', async () => {
    const directHandler = vi.fn().mockResolvedValue('ok');
    const { client } = mountWithClient(
      DomOSTool,
      { name: 'handler_tool', description: 'Direct', handler: directHandler },
      { default: () => h('span', 'content') }
    );

    const { handler } = client.registerTool.mock.calls[0][0];
    await handler();
    expect(directHandler).toHaveBeenCalledOnce();
  });
});

// ============================================================
// DomOSTool — context serialized into description
// ============================================================

describe('DomOSTool — context', () => {
  it('appends serialized context to the description', () => {
    const { client } = mountWithClient(
      DomOSTool,
      {
        name: 'ctx_tool',
        description: 'My tool',
        action: 'click',
        context: { productId: '42', name: 'Nike' },
      },
      { default: () => h('button', 'Go') }
    );
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({
          description: 'My tool. Context: {"productId":"42","name":"Nike"}',
        }),
      })
    );
  });

  it('uses raw description when no context is provided', () => {
    const { client } = mountWithClient(
      DomOSTool,
      { name: 'no_ctx', description: 'Simple', action: 'click' },
      { default: () => h('button', 'x') }
    );
    expect(client.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        declaration: expect.objectContaining({ description: 'Simple' }),
      })
    );
  });
});

// ============================================================
// DomOSTool — runtime validation errors
// ============================================================

describe('DomOSTool — runtime errors', () => {
  it('throws if both action and handler are provided', () => {
    expect(() =>
      mountWithClient(
        DomOSTool,
        { name: 'bad', description: 'Bad', action: 'click', handler: vi.fn() },
        { default: () => h('button', 'x') }
      )
    ).toThrow('provide action OR handler, not both');
  });

  it('throws if neither action nor handler is provided', () => {
    expect(() =>
      mountWithClient(
        DomOSTool,
        { name: 'bad', description: 'Bad' },
        { default: () => h('button', 'x') }
      )
    ).toThrow('action or handler is required');
  });
});

// ============================================================
// DomOSTool — wrapper transparency
// ============================================================

describe('DomOSTool — wrapper span', () => {
  it('renders a span with display:contents', () => {
    const { wrapper } = mountWithClient(
      DomOSTool,
      { name: 'span_tool', description: 'Span', action: 'click' },
      { default: () => h('button', 'x') }
    );
    const span = wrapper.find('span');
    expect(span.attributes('style')).toContain('display: contents');
  });
});

// ============================================================
// DomOSTool — re-registration on context change
// ============================================================

describe('DomOSTool — context reactivity', () => {
  it('unregisters and re-registers when context changes', async () => {
    const { client, wrapper } = mountWithClient(
      DomOSTool,
      { name: 're_tool', description: 'Reactive', action: 'click', context: { count: 1 } },
      { default: () => h('button', 'x') }
    );

    expect(client.registerTool).toHaveBeenCalledOnce();

    await wrapper.setProps({ context: { count: 2 } });

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
// DomOSToolBtn
// ============================================================

describe('DomOSToolBtn', () => {
  it('registers the tool on mount', () => {
    const handler = vi.fn();
    const { client } = mountWithClient(
      DomOSToolBtn,
      { name: 'btn', description: 'A button', handler },
      { default: () => 'Click me' }
    );
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
    const { wrapper } = mountWithClient(
      DomOSToolBtn,
      { name: 'btn', description: 'Btn', handler },
      { default: () => 'Go' }
    );
    await wrapper.find('button').trigger('click');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('calls handler via agent (registerTool callback)', async () => {
    const handler = vi.fn().mockResolvedValue('done');
    const { client } = mountWithClient(
      DomOSToolBtn,
      { name: 'btn', description: 'Btn', handler },
      { default: () => 'Go' }
    );
    const { handler: agentHandler } = client.registerTool.mock.calls[0][0];
    await agentHandler();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('disables the button for humans but agent still works', async () => {
    const handler = vi.fn();
    const { client, wrapper } = mountWithClient(
      DomOSToolBtn,
      { name: 'btn', description: 'Btn', handler, disabled: true },
      { default: () => 'Go' }
    );
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();

    const { handler: agentHandler } = client.registerTool.mock.calls[0][0];
    await agentHandler();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('unregisters on unmount', async () => {
    const { client, wrapper } = mountWithClient(
      DomOSToolBtn,
      { name: 'btn', description: 'Btn', handler: vi.fn() },
      { default: () => 'x' }
    );
    await wrapper.unmount();
    expect(client.unregisterTool).toHaveBeenCalledWith('btn');
  });

  it('applies className to the button', () => {
    const { wrapper } = mountWithClient(
      DomOSToolBtn,
      { name: 'styled', description: 'Styled', handler: vi.fn(), class: 'btn-primary text-red' },
      { default: () => 'x' }
    );
    expect(wrapper.find('button').classes()).toContain('btn-primary');
    expect(wrapper.find('button').classes()).toContain('text-red');
  });
});
