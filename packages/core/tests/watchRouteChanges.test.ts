import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { watchRouteChanges } from '../src/index.js';

// window minimal : history met a jour location, popstate est declenche a la main
function installFakeWindow() {
  const location = { pathname: '/' };
  const listeners = new Set<() => void>();
  const setUrl = (url?: string | URL | null) => {
    if (url == null) return;
    location.pathname = new URL(String(url), 'http://localhost' + location.pathname).pathname;
  };
  const history = {
    pushState(_state: unknown, _unused: string, url?: string | URL | null) {
      setUrl(url);
    },
    replaceState(_state: unknown, _unused: string, url?: string | URL | null) {
      setUrl(url);
    },
  } as unknown as History;
  (globalThis as any).window = {
    location,
    history,
    addEventListener: (type: string, fn: () => void) => type === 'popstate' && listeners.add(fn),
    removeEventListener: (type: string, fn: () => void) => type === 'popstate' && listeners.delete(fn),
  };
  const popTo = (path: string) => {
    location.pathname = path;
    listeners.forEach((fn) => fn());
  };
  return { history, popTo, listeners };
}

function createClient(sessionId: string | null = 'sess_1') {
  return { sessionId, syncToolsWithServer: vi.fn() };
}

describe('watchRouteChanges', () => {
  let fake: ReturnType<typeof installFakeWindow>;

  beforeEach(() => {
    fake = installFakeWindow();
  });

  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('synchronise sur pushState et replaceState quand le chemin change', () => {
    const client = createClient();
    const stop = watchRouteChanges(client);

    window.history.pushState(null, '', '/checkout');
    window.history.replaceState(null, '', '/checkout/review');

    expect(client.syncToolsWithServer).toHaveBeenCalledTimes(2);
    stop();
  });

  it('ignore les changements de query ou de hash', () => {
    const client = createClient();
    const stop = watchRouteChanges(client);

    window.history.pushState(null, '', '/?tab=2');
    window.history.pushState(null, '', '/#details');

    expect(client.syncToolsWithServer).not.toHaveBeenCalled();
    stop();
  });

  it('synchronise sur popstate (retour navigateur)', () => {
    const client = createClient();
    const stop = watchRouteChanges(client);

    fake.popTo('/cart');

    expect(client.syncToolsWithServer).toHaveBeenCalledTimes(1);
    stop();
  });

  it('ne synchronise pas sans session, et reprend des qu une session existe', () => {
    const client = createClient(null);
    const stop = watchRouteChanges(client);

    window.history.pushState(null, '', '/no-session');
    expect(client.syncToolsWithServer).not.toHaveBeenCalled();

    client.sessionId = 'sess_1';
    window.history.pushState(null, '', '/with-session');
    expect(client.syncToolsWithServer).toHaveBeenCalledTimes(1);
    stop();
  });

  it('le nettoyage restaure history et retire l ecoute popstate', () => {
    const originalPush = fake.history.pushState;
    const originalReplace = fake.history.replaceState;
    const client = createClient();
    const stop = watchRouteChanges(client);
    expect(window.history.pushState).not.toBe(originalPush);

    stop();

    expect(window.history.pushState).toBe(originalPush);
    expect(window.history.replaceState).toBe(originalReplace);
    expect(fake.listeners.size).toBe(0);
    window.history.pushState(null, '', '/after-stop');
    expect(client.syncToolsWithServer).not.toHaveBeenCalled();
  });

  it('n ecrase pas un wrapper pose apres le sien', () => {
    const client = createClient();
    const stop = watchRouteChanges(client);
    const laterWrapper = vi.fn();
    window.history.pushState = laterWrapper as any;

    stop();

    expect(window.history.pushState).toBe(laterWrapper);
  });

  it('ne fait rien sans window (SSR)', () => {
    delete (globalThis as any).window;
    const client = createClient();

    const stop = watchRouteChanges(client);

    expect(() => stop()).not.toThrow();
    expect(client.syncToolsWithServer).not.toHaveBeenCalled();
  });
});
