import { Injector, createEnvironmentInjector, runInInjectionContext } from '@angular/core';
import { MessageType } from '@owllayer/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectOwlLayer, provideOwlLayer } from './public-api.js';

// Environnement node : window minimal, history met a jour location
function installFakeWindow() {
  const location = { pathname: '/' };
  const history = {
    pushState(_state: unknown, _unused: string, url?: string | URL | null) {
      if (url != null) location.pathname = String(url);
    },
    replaceState(_state: unknown, _unused: string, url?: string | URL | null) {
      if (url != null) location.pathname = String(url);
    },
  };
  (globalThis as any).window = {
    location,
    history,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return history;
}

function createInjector() {
  const injector = createEnvironmentInjector(
    [provideOwlLayer({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test' })],
    Injector.NULL as never
  );
  const service = runInInjectionContext(injector, () => injectOwlLayer());
  const client = service.client as any;
  const sendSpy = vi.fn();
  client.send = sendSpy;
  client._sessionId = 'sess_1';
  return { injector, sendSpy };
}

describe('provideOwlLayer — synchro de route', () => {
  let history: ReturnType<typeof installFakeWindow>;

  beforeEach(() => {
    history = installFakeWindow();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('envoie la nouvelle page au serveur lors d une navigation du routeur', () => {
    const { injector, sendSpy } = createInjector();

    window.history.pushState(null, '', '/checkout');

    const urls = sendSpy.mock.calls
      .map(([message]) => message)
      .filter((message) => message.type === MessageType.CONTEXT_UPDATE)
      .map((message) => message.payload.url);
    expect(urls).toEqual(['/checkout']);
    injector.destroy();
  });

  it('restaure history.pushState a la destruction de l injecteur', () => {
    const originalPush = history.pushState;
    const { injector } = createInjector();
    expect(window.history.pushState).not.toBe(originalPush);

    injector.destroy();

    expect(window.history.pushState).toBe(originalPush);
  });
});
