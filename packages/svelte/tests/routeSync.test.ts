import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { MessageType, OwlLayerClient } from '@owllayer/core';
import { initOwlLayer, owlLayerClient } from '../src/stores/owllayer.store.js';

function contextUrls(sendSpy: ReturnType<typeof vi.fn>): string[] {
  return sendSpy.mock.calls
    .map(([message]) => message)
    .filter((message: any) => message.type === MessageType.CONTEXT_UPDATE)
    .map((message: any) => message.payload.url);
}

function init() {
  const cleanup = initOwlLayer({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test' });
  (get(owlLayerClient) as any)._sessionId = 'sess_1';
  return cleanup;
}

describe('initOwlLayer — synchro de route', () => {
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(OwlLayerClient.prototype, 'connect').mockImplementation(async () => {});
    sendSpy = vi.fn();
    vi.spyOn(OwlLayerClient.prototype as any, 'send').mockImplementation(sendSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  it('envoie la nouvelle page au serveur lors d une navigation du routeur', () => {
    const cleanup = init();

    window.history.pushState(null, '', '/checkout');

    expect(contextUrls(sendSpy)).toEqual(['/checkout']);
    cleanup();
  });

  it('restaure history.pushState au nettoyage', () => {
    const originalPush = window.history.pushState;
    const cleanup = init();
    expect(window.history.pushState).not.toBe(originalPush);

    cleanup();

    expect(window.history.pushState).toBe(originalPush);
  });
});
