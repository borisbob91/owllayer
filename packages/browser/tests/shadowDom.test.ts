import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomosChatWidget } from '../src/ui/DomosChatWidget.js';
import { HitlOverlay } from '../src/ui/HitlOverlay.js';

afterEach(() => {
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// DomosChatWidget
// ---------------------------------------------------------------------------

describe('Shadow DOM â€” DomosChatWidget', () => {
  it('appelle attachShadow({ mode: closed }) au mount', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'attachShadow');

    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();

    expect(spy).toHaveBeenCalledWith({ mode: 'closed' });

    host.unmount();
    spy.mockRestore();
  });

  it('insere le host div dans document.body apres mount', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();

    expect(document.querySelector('[data-domos-widget-host="browser"]')).not.toBeNull();

    host.unmount();
  });

  it('retire le host div apres unmount', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    host.unmount();

    expect(document.querySelector('[data-domos-widget-host="browser"]')).toBeNull();
  });

  it('ne crash pas si unmount appele deux fois', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    host.unmount();
    expect(() => host.unmount()).not.toThrow();
  });

  it('element.shadowRoot retourne null (mode closed)', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();

    const el = document.querySelector('[data-domos-widget-host="browser"]');
    expect(el).not.toBeNull();
    // mode: 'closed' => le shadowRoot externe est inaccessible
    expect((el as Element).shadowRoot).toBeNull();

    host.unmount();
  });

  it('mount est idempotent â€” pas de double host dans le DOM', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    host.mount(); // appel double

    expect(document.querySelectorAll('[data-domos-widget-host="browser"]').length).toBe(1);

    host.unmount();
  });

  it('addUserMessage ne crash pas apres mount', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    expect(() => host.addUserMessage('hello')).not.toThrow();
    host.unmount();
  });

  it('upsertAgentMessage ne crash pas apres mount', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    expect(() => host.upsertAgentMessage('Bonjour')).not.toThrow();
    host.unmount();
  });

  it('setAgentState ne crash pas apres mount', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    expect(() => host.setAgentState('thinking')).not.toThrow();
    host.unmount();
  });

  it('restoreMessages ne crash pas apres mount', () => {
    const host = new DomosChatWidget({ onSendText: () => {} });
    host.mount();
    expect(() => host.restoreMessages([{ id: 'u_1', role: 'user', content: 'test' }])).not.toThrow();
    host.unmount();
  });
});

// ---------------------------------------------------------------------------
// HitlOverlay
// ---------------------------------------------------------------------------

describe('Shadow DOM â€” HitlOverlay', () => {
  it('appelle attachShadow({ mode: closed }) au mount', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'attachShadow');

    const overlay = new HitlOverlay();
    overlay.mount();

    expect(spy).toHaveBeenCalledWith({ mode: 'closed' });

    overlay.unmount();
    spy.mockRestore();
  });

  it('insere le host div dans document.body apres mount', () => {
    const overlay = new HitlOverlay();
    overlay.mount();

    expect(document.querySelector('[data-domos-hitl-overlay="browser"]')).not.toBeNull();

    overlay.unmount();
  });

  it('retire le host div apres unmount', () => {
    const overlay = new HitlOverlay();
    overlay.mount();
    overlay.unmount();

    expect(document.querySelector('[data-domos-hitl-overlay="browser"]')).toBeNull();
  });

  it('ne crash pas si unmount appele deux fois', () => {
    const overlay = new HitlOverlay();
    overlay.mount();
    overlay.unmount();
    expect(() => overlay.unmount()).not.toThrow();
  });

  it('element.shadowRoot retourne null (mode closed)', () => {
    const overlay = new HitlOverlay();
    overlay.mount();

    const el = document.querySelector('[data-domos-hitl-overlay="browser"]');
    expect(el).not.toBeNull();
    expect((el as Element).shadowRoot).toBeNull();

    overlay.unmount();
  });

  it('show puis unmount ne crash pas', () => {
    const overlay = new HitlOverlay();
    overlay.mount();
    overlay.show(
      {
        id: 'call_1',
        callId: 'call_1',
        toolName: 'delete_all',
        args: {},
        risk: 'critical' as any,
        message: 'Confirmer ?',
        requestedAt: Date.now(),
      },
      () => {},
    );
    expect(() => overlay.unmount()).not.toThrow();
  });
});
