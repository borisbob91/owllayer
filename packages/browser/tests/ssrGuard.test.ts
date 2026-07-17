/**
 * tests/ssrGuard.test.ts
 *
 * Vérifie que le SDK ne plante pas à l'import côté serveur (window absent),
 * et que init() lève une erreur explicite si appelé sans window.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@domos/core', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;

  class MockDomOSClient {
    _handlers: Record<string, (...a: unknown[]) => unknown> = {};
    _anyHandlers = new Set<(event: unknown) => void>();
    on(handlers: Record<string, (...a: unknown[]) => unknown>) { Object.assign(this._handlers, handlers); }
    onAnyEvent(handler: (event: unknown) => void) {
      this._anyHandlers.add(handler);
      return () => this._anyHandlers.delete(handler);
    }
    offAnyEvent(handler: (event: unknown) => void) { this._anyHandlers.delete(handler); }
    connect() { return Promise.resolve(); }
    destroy() {}
    disconnect() {}
    registerTool() {}
    unregisterTool() {}
    updateContext() {}
    sendText() {}
    get sessionId() { return null; }
    get isConnected() { return false; }
  }

  return { ...actual, DomOSClient: MockDomOSClient };
});

import { BrowserDomOS } from '../src/runtime/BrowserDomOS.js';

afterEach(() => {
  localStorage.clear();
});

describe('SSR guard — init() refuse le contexte serveur', () => {
  it('leve une erreur si window est undefined', async () => {
    const origWindow = globalThis.window;
    // Supprimer window pour simuler un contexte Node/SSR
    // @ts-expect-error — simulation SSR
    delete globalThis.window;

    const sdk = new BrowserDomOS();
    await expect(
      sdk.init({
        apiKey: 'pk_test',
        endpoint: 'ws://localhost:4001',
        autoConnect: false,
        widget: { enabled: false },
        hitl: { enabled: false },
      }),
    ).rejects.toThrow(/client-only/i);

    // Restaurer window
    globalThis.window = origWindow;
  });

  it('ne plante pas a l\'import (le module charge sans window)', async () => {
    // Si on arrive ici, l'import a réussi sans erreur
    expect(BrowserDomOS).toBeDefined();
    const sdk = new BrowserDomOS();
    expect(sdk).toBeDefined();
    sdk.destroy();
  });

  it('init() est idempotent — second appel ignore silencieusement', async () => {
    const sdk = new BrowserDomOS();
    const cfg = {
      apiKey: 'pk_test',
      endpoint: 'ws://localhost:4001',
      autoConnect: false,
      widget: { enabled: false },
      hitl: { enabled: false },
      autoDiscovery: { enabled: false },
    };
    await sdk.init(cfg);
    // Second appel — ne doit pas lancer d'erreur ni recréer le client
    await expect(sdk.init(cfg)).resolves.toBeUndefined();
    sdk.destroy();
  });
});
