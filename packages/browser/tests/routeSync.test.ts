import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageType } from '@owllayer/core';
import { BrowserOwlLayer } from '../src/runtime/BrowserOwlLayer.js';
import { BrowserOwlLayerCore } from '../src/runtime/BrowserOwlLayerCore.js';

const CONFIG = {
  endpoint: 'ws://localhost:3000/owllayer',
  apiKey: 'pk_test',
  autoConnect: false,
  widget: { enabled: false },
  hitl: { enabled: false },
  autoDiscovery: { enabled: false },
};

async function init(Runtime: typeof BrowserOwlLayer | typeof BrowserOwlLayerCore) {
  const runtime = new Runtime();
  await runtime.init(CONFIG);
  const client = (runtime as any).client;
  const sendSpy = vi.fn();
  client.send = sendSpy;
  client._sessionId = 'sess_1';
  return { runtime, sendSpy };
}

function contextUrls(sendSpy: ReturnType<typeof vi.fn>): string[] {
  return sendSpy.mock.calls
    .map(([message]) => message)
    .filter((message) => message.type === MessageType.CONTEXT_UPDATE)
    .map((message) => message.payload.url);
}

describe.each([
  ['BrowserOwlLayer', BrowserOwlLayer],
  ['BrowserOwlLayerCore', BrowserOwlLayerCore],
])('%s — synchro de route', (_name, Runtime) => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('envoie la nouvelle page au serveur lors d une navigation cote client', async () => {
    const { runtime, sendSpy } = await init(Runtime);

    window.history.pushState(null, '', '/checkout');

    expect(contextUrls(sendSpy)).toEqual(['/checkout']);
    runtime.destroy();
  });

  it('restaure history.pushState a destroy()', async () => {
    const originalPush = window.history.pushState;
    const { runtime } = await init(Runtime);
    expect(window.history.pushState).not.toBe(originalPush);

    runtime.destroy();

    expect(window.history.pushState).toBe(originalPush);
  });
});
