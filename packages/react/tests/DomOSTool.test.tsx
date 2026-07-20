import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import { DomOSContext } from '../src/provider/DomOSContext.js';
import { DomOSTool } from '../src/components/tool/DomOSTool.js';
import { DomOSToolBtn } from '../src/components/tool/DomOSToolBtn.js';
import type { DomOSContextValue } from '../src/provider/DomOSContext.js';

// ============================================================
// Mock DomOSContext
// ============================================================

function makeMockCtx(overrides?: Partial<DomOSContextValue>): DomOSContextValue {
  return {
    agentState: 'connected',
    sessionId: 'test-session',
    shadowContext: {} as any,
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
    unregisterToolsByComponent: vi.fn(),
    updateContext: vi.fn(),
    sendText: vi.fn(),
    sendAudio: vi.fn(),
    sendAudioStream: vi.fn(),
    sendAudioEnd: vi.fn(),
    sendInterrupt: vi.fn(),
    requestApproval: vi.fn(),
    pendingApproval: null,
    approvePendingAction: vi.fn(),
    denyPendingAction: vi.fn(),
    ...overrides,
  } as unknown as DomOSContextValue;
}

function wrap(ctx: DomOSContextValue, children: React.ReactNode) {
  return createElement(DomOSContext.Provider, { value: ctx }, children);
}

// ============================================================
// DomOSTool — action DOM
// ============================================================

describe('DomOSTool — action="click"', () => {
  it('enregistre le tool au montage avec le bon name et description', () => {
    const ctx = makeMockCtx();
    render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'clear_cart', description: 'Vider le panier', action: 'click' },
          createElement('button', null, 'Vider')
        )
      )
    );
    expect(ctx.registerTool).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: 'clear_cart', description: 'Vider le panier' }),
      expect.any(Function),
      undefined,
    );
  });

  it('appelle .click() sur firstElementChild quand le handler agent est invoqué', async () => {
    const ctx = makeMockCtx();
    let registeredHandler: ((args: any) => unknown) | undefined;
    (ctx.registerTool as ReturnType<typeof vi.fn>).mockImplementation(
      (_id: string, _decl: any, handler: (args: any) => unknown) => { registeredHandler = handler; }
    );

    render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'btn_tool', description: 'Cliquer', action: 'click' },
          createElement('button', { 'data-testid': 'child-btn' }, 'Go')
        )
      )
    );

    const btn = screen.getByTestId('child-btn');
    const clickSpy = vi.spyOn(btn, 'click');

    await registeredHandler?.({});
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('désenregistre le tool au démontage', () => {
    const ctx = makeMockCtx();
    const { unmount } = render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'nav_tool', description: 'Nav', action: 'click' },
          createElement('a', { href: '#' }, 'Lien')
        )
      )
    );
    unmount();
    expect(ctx.unregisterTool).toHaveBeenCalledWith('nav_tool');
  });
});

describe('DomOSTool — action="focus"', () => {
  it('appelle .focus() sur firstElementChild', async () => {
    const ctx = makeMockCtx();
    let registeredHandler: ((args: any) => unknown) | undefined;
    (ctx.registerTool as ReturnType<typeof vi.fn>).mockImplementation(
      (_id: string, _decl: any, handler: (args: any) => unknown) => { registeredHandler = handler; }
    );

    render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'focus_tool', description: 'Focus', action: 'focus' },
          createElement('input', { 'data-testid': 'input' })
        )
      )
    );

    const input = screen.getByTestId('input');
    const focusSpy = vi.spyOn(input, 'focus');
    await registeredHandler?.({});
    expect(focusSpy).toHaveBeenCalledOnce();
  });
});

// ============================================================
// DomOSTool — handler direct
// ============================================================

describe('DomOSTool — handler direct', () => {
  it('appelle le handler directement sans interaction DOM', async () => {
    const ctx = makeMockCtx();
    let registeredHandler: ((args: any) => unknown) | undefined;
    (ctx.registerTool as ReturnType<typeof vi.fn>).mockImplementation(
      (_id: string, _decl: any, handler: (args: any) => unknown) => { registeredHandler = handler; }
    );

    const directHandler = vi.fn().mockResolvedValue('ok');

    render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'direct_tool', description: 'Direct', handler: directHandler },
          createElement('span', null, 'content')
        )
      )
    );

    await registeredHandler?.({});
    expect(directHandler).toHaveBeenCalledOnce();
  });
});

// ============================================================
// DomOSTool — context sérialisé dans la description
// ============================================================

describe('DomOSTool — context', () => {
  it('injecte le context sérialisé en fin de description', () => {
    const ctx = makeMockCtx();
    render(
      wrap(ctx,
        createElement(DomOSTool, {
          name: 'ctx_tool',
          description: 'Mon tool',
          action: 'click',
          context: { productId: '42', name: 'Nike' },
        },
          createElement('button', null, 'Go')
        )
      )
    );
    expect(ctx.registerTool).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        description: 'Mon tool. Context: {"productId":"42","name":"Nike"}',
      }),
      expect.any(Function),
      undefined,
    );
  });

  it('description sans context = description brute', () => {
    const ctx = makeMockCtx();
    render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'no_ctx', description: 'Simple', action: 'click' },
          createElement('button', null, 'x')
        )
      )
    );
    expect(ctx.registerTool).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ description: 'Simple' }),
      expect.any(Function),
      undefined,
    );
  });
});

// ============================================================
// DomOSTool — validations runtime
// ============================================================

describe('DomOSTool — erreurs runtime', () => {
  it('lève une erreur si action ET handler sont fournis', () => {
    const ctx = makeMockCtx();
    expect(() =>
      render(
        wrap(ctx,
          createElement(DomOSTool, {
            name: 'bad',
            description: 'Bad',
            action: 'click',
            handler: vi.fn(),
          },
            createElement('button', null, 'x')
          )
        )
      )
    ).toThrow('action OR handler');
  });

  it('lève une erreur si ni action ni handler', () => {
    const ctx = makeMockCtx();
    expect(() =>
      render(
        wrap(ctx,
          createElement(DomOSTool as any, { name: 'empty', description: 'Empty' },
            createElement('button', null, 'x')
          )
        )
      )
    ).toThrow('action or handler is required');
  });
});

// ============================================================
// DomOSTool — layout transparent
// ============================================================

describe('DomOSTool — wrapper display:contents', () => {
  it('le wrapper span a style display:contents', () => {
    const ctx = makeMockCtx();
    const { container } = render(
      wrap(ctx,
        createElement(DomOSTool, { name: 'layout', description: 'Layout', action: 'click' },
          createElement('button', null, 'btn')
        )
      )
    );
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ display: 'contents' });
  });
});

// ============================================================
// DomOSToolBtn
// ============================================================

describe('DomOSToolBtn', () => {
  let ctx: DomOSContextValue;
  let registeredHandler: ((args: any) => unknown) | undefined;

  beforeEach(() => {
    registeredHandler = undefined;
    ctx = makeMockCtx();
    (ctx.registerTool as ReturnType<typeof vi.fn>).mockImplementation(
      (_id: string, _decl: any, handler: (args: any) => unknown) => { registeredHandler = handler; }
    );
  });

  it('enregistre le tool au montage', () => {
    const handler = vi.fn();
    render(
      wrap(ctx,
        createElement(DomOSToolBtn, { name: 'btn_tool', description: 'Btn', handler },
          'Cliquer'
        )
      )
    );
    expect(ctx.registerTool).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ name: 'btn_tool' }),
      expect.any(Function),
      undefined,
    );
  });

  it('appelle le handler au clic utilisateur', () => {
    const handler = vi.fn();
    render(
      wrap(ctx,
        createElement(DomOSToolBtn, { name: 'btn_h', description: 'H', 'data-testid': 'btn', handler } as any,
          'Go'
        )
      )
    );
    fireEvent.click(screen.getByText('Go'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('appelle le handler via l\'agent (registerTool callback)', async () => {
    const handler = vi.fn().mockResolvedValue('done');
    render(
      wrap(ctx,
        createElement(DomOSToolBtn, { name: 'agent_btn', description: 'Agent', handler },
          'Go'
        )
      )
    );
    await registeredHandler?.({});
    expect(handler).toHaveBeenCalledOnce();
  });

  it('disabled=true désactive le bouton DOM mais pas l\'agent', async () => {
    const handler = vi.fn();
    render(
      wrap(ctx,
        createElement(DomOSToolBtn, { name: 'dis_btn', description: 'Dis', handler, disabled: true },
          'Dis'
        )
      )
    );
    const btn = screen.getByText('Dis');
    expect(btn).toBeDisabled();

    // L'agent appelle quand même le handler
    await registeredHandler?.({});
    expect(handler).toHaveBeenCalledOnce();
  });

  it('désenregistre le tool au démontage', () => {
    const { unmount } = render(
      wrap(ctx,
        createElement(DomOSToolBtn, { name: 'unmount_btn', description: 'U', handler: vi.fn() },
          'x'
        )
      )
    );
    unmount();
    expect(ctx.unregisterTool).toHaveBeenCalledWith('unmount_btn');
  });

  it('applique className sur le bouton rendu', () => {
    render(
      wrap(ctx,
        createElement(DomOSToolBtn, {
          name: 'styled_btn',
          description: 'Styled',
          handler: vi.fn(),
          className: 'text-red-500',
        },
          'Style'
        )
      )
    );
    expect(screen.getByText('Style')).toHaveClass('text-red-500');
  });
});
