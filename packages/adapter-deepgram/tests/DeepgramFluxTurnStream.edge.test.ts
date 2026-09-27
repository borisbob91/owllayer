// Cas limites du flux Flux : format audio, langue par appel, erreurs fatales,
// timeout d'ouverture, envoi apres fermeture, cle jamais exposee.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { STTTurnEvent } from '@owllayer/core';
import { FakeDeepgramWebSocket, lastFakeDeepgramSocket, resetFakeDeepgramSockets } from './helpers/fakeDeepgramSocket.js';
import { DeepgramFluxSTT } from '../src/index.js';

vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }));

const MIME = 'audio/pcm;rate=16000';

describe('DeepgramFluxTurnStream edge cases (S3, S13, S18)', () => {
  beforeEach(() => resetFakeDeepgramSockets());
  afterEach(() => vi.useRealTimers());

  it('rejects a non-PCM mimeType before opening any socket', async () => {
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
    await expect(flux.openTurnStream({ mimeType: 'audio/webm', onEvent: vi.fn() })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(FakeDeepgramWebSocket.instances).toHaveLength(0);
  });

  it('defaults to a model that accepts French when no language is given', async () => {
    const flux = new DeepgramFluxSTT({ apiKey: 'k' });
    await flux.openTurnStream({ mimeType: MIME, onEvent: vi.fn() });
    expect(new URL(lastFakeDeepgramSocket().url).searchParams.get('model')).toBe('flux-general-multi');
  });

  it('a per-call languageCode unsupported by the model is rejected (S13)', async () => {
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en', model: 'flux-general-en' });
    await expect(flux.openTurnStream({ mimeType: MIME, languageCode: 'fr', onEvent: vi.fn() })).rejects.toMatchObject({
      code: 'UNSUPPORTED_LANGUAGE',
    });
  });

  it('fatal provider error: stream.error fatal, then exactly one stream.closed with reason error, and no CloseStream', async () => {
    const events: STTTurnEvent[] = [];
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
    await flux.openTurnStream({ mimeType: MIME, onEvent: (e) => events.push(e) });
    const socket = lastFakeDeepgramSocket();
    socket.open();
    socket.serverSend({ type: 'Connected' });
    socket.serverSend({ type: 'FatalError', code: 'X', description: 'boom' });
    expect(events.map((e) => e.type)).toEqual(['stream.error', 'stream.closed']);
    expect(events[0]).toMatchObject({ fatal: true });
    expect(events[1]).toEqual({ type: 'stream.closed', reason: 'error' });
    expect(socket.sent.filter((f) => typeof f === 'string' && f.includes('CloseStream'))).toHaveLength(0);
  });

  it('open timeout: fatal TIMEOUT error then stream.closed reason timeout', async () => {
    vi.useFakeTimers();
    const events: STTTurnEvent[] = [];
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
    await flux.openTurnStream({ mimeType: MIME, onEvent: (e) => events.push(e) });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(events.map((e) => e.type)).toEqual(['stream.error', 'stream.closed']);
    expect(events[0]).toMatchObject({ fatal: true, error: { code: 'TIMEOUT' } });
    expect(events[1]).toEqual({ type: 'stream.closed', reason: 'timeout' });
  });

  it('sendAudio after close() sends nothing and emits nothing', async () => {
    const events: STTTurnEvent[] = [];
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
    const stream = await flux.openTurnStream({ mimeType: MIME, onEvent: (e) => events.push(e) });
    const socket = lastFakeDeepgramSocket();
    socket.open();
    socket.serverSend({ type: 'Connected' });
    await stream.close();
    const sent = socket.sent.length;
    const count = events.length;
    stream.sendAudio(Buffer.alloc(320).toString('base64'));
    expect(socket.sent).toHaveLength(sent);
    expect(events).toHaveLength(count);
    expect(stream.state).toBe('closed');
  });

  it('never leaks the API key in any emitted event', async () => {
    const events: STTTurnEvent[] = [];
    const flux = new DeepgramFluxSTT({ apiKey: 'sk-very-secret', language: 'en' });
    await flux.openTurnStream({ mimeType: MIME, onEvent: (e) => events.push(e) });
    const socket = lastFakeDeepgramSocket();
    socket.open();
    socket.serverError(new Error('handshake failed for sk-very-secret'));
    socket.serverClose(1011, 'sk-very-secret');
    expect(JSON.stringify(events, (_k, v) => (v instanceof Error ? { message: v.message, ...v } : v))).not.toContain('sk-very-secret');
  });

  it('a key refused at the handshake (HTTP 401) is reported once as AUTH_FAILED, not as a remote close', async () => {
    const events: STTTurnEvent[] = [];
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
    await flux.openTurnStream({ mimeType: MIME, onEvent: (e) => events.push(e) });
    const socket = lastFakeDeepgramSocket();

    socket.serverError(new Error('Unexpected server response: 401'));
    socket.serverClose(1006, '');

    expect(events.map((e) => e.type)).toEqual(['stream.error', 'stream.closed']);
    expect(events[0]).toMatchObject({ fatal: true, error: { code: 'AUTH_FAILED', statusCode: 401 } });
    expect(events[1]).toEqual({ type: 'stream.closed', reason: 'error' });
  });
});
