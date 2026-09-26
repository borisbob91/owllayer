import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp, h } from 'vue';
import { MessageType, type OwlLayerClient } from '@owllayer/core';
import { OwlLayerPlugin, OWLLAYER_CLIENT_KEY } from '../src/plugin/OwlLayerPlugin.js';

function installPlugin() {
  const app = createApp({ render: () => h('div') });
  app.use(OwlLayerPlugin, {
    endpoint: 'ws://localhost:3000/owllayer',
    apiKey: 'pk_test',
    autoConnect: false,
    hitl: { ui: 'none' },
  });
  const client = app._context.provides[OWLLAYER_CLIENT_KEY as symbol] as OwlLayerClient;
  const sendSpy = vi.fn();
  (client as any).send = sendSpy;
  (client as any)._sessionId = 'sess_1';
  const host = document.createElement('div');
  app.mount(host);
  return { app, sendSpy };
}

function contextUrls(sendSpy: ReturnType<typeof vi.fn>): string[] {
  return sendSpy.mock.calls
    .map(([message]) => message)
    .filter((message) => message.type === MessageType.CONTEXT_UPDATE)
    .map((message) => message.payload.url);
}

describe('OwlLayerPlugin — synchro de route', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('envoie la nouvelle page au serveur lors d une navigation du routeur', () => {
    const { app, sendSpy } = installPlugin();

    window.history.pushState(null, '', '/checkout');

    expect(contextUrls(sendSpy)).toEqual(['/checkout']);
    app.unmount();
  });

  it('restaure history.pushState a l unmount', () => {
    const originalPush = window.history.pushState;
    const { app } = installPlugin();
    expect(window.history.pushState).not.toBe(originalPush);

    app.unmount();

    expect(window.history.pushState).toBe(originalPush);
  });
});
