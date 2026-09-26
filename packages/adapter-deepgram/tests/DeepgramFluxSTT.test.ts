import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { STTTurnEvent, STTTurnStream } from '@owllayer/core';
// L'import du fake socket doit precéder tout import qui charge transitivement
// 'ws' (ex: '../src/DeepgramFluxSTT.js' -> DeepgramFluxTurnStream -> transport
// -> 'ws') : sinon la factory `vi.mock('ws', ...)` s'execute avant que ce
// module soit evalue et referencer `FakeDeepgramWebSocket` leve
// "Cannot access '...' before initialization" (TDZ ESM), comme observe ici.
import { FakeDeepgramWebSocket, lastFakeDeepgramSocket, resetFakeDeepgramSockets } from './helpers/fakeDeepgramSocket.js';
import { DeepgramFluxSTT } from '../src/DeepgramFluxSTT.js';
import type { DeepgramFluxTurnStream } from '../src/DeepgramFluxTurnStream.js';

vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }));

const PCM_MIME = 'audio/pcm;rate=16000';
const PCM_CHUNK_1S = Buffer.alloc(16000 * 2).toString('base64'); // 1s d'audio 16kHz/16-bit mono

async function openStream(
  flux: DeepgramFluxSTT,
  onEvent: (event: STTTurnEvent) => void,
  overrides: Partial<Parameters<DeepgramFluxSTT['openTurnStream']>[0]> = {},
): Promise<STTTurnStream> {
  return flux.openTurnStream({ mimeType: PCM_MIME, onEvent, ...overrides });
}

describe('DeepgramFluxSTT / DeepgramFluxTurnStream', () => {
  beforeEach(() => {
    resetFakeDeepgramSockets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has the fixed provider name deepgram-flux', () => {
    const flux = new DeepgramFluxSTT({ apiKey: 'k' });
    expect(flux.name).toBe('deepgram-flux');
  });

  describe('connection URL and query parameters', () => {
    it('opens wss://api.deepgram.com/v2/listen with the Authorization: Token header and never the key in the URL', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'sk-secret-key', language: 'en' });
      await openStream(flux, vi.fn());

      const socket = lastFakeDeepgramSocket();
      expect(String(socket.url).split('?')[0]).toBe('wss://api.deepgram.com/v2/listen');
      expect(String(socket.url)).not.toContain('sk-secret-key');
      expect(socket.options.headers).toEqual({ Authorization: 'Token sk-secret-key' });
    });

    it('sends model, encoding=linear16, and sample_rate derived from the MIME type', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en', model: 'flux-general-en' });
      await openStream(flux, vi.fn(), { mimeType: 'audio/pcm;rate=48000' });

      const query = new URL(lastFakeDeepgramSocket().url).searchParams;
      expect(query.get('model')).toBe('flux-general-en');
      expect(query.get('encoding')).toBe('linear16');
      expect(query.get('sample_rate')).toBe('48000');
    });

    it('sends eot_threshold and eot_timeout_ms from turnDetection', async () => {
      const flux = new DeepgramFluxSTT({
        apiKey: 'k',
        language: 'en',
        turnDetection: { endOfTurnThreshold: 0.85, endOfTurnTimeoutMs: 7000 },
      });
      await openStream(flux, vi.fn());

      const query = new URL(lastFakeDeepgramSocket().url).searchParams;
      expect(query.get('eot_threshold')).toBe('0.85');
      expect(query.get('eot_timeout_ms')).toBe('7000');
    });

    it('sends eager_eot_threshold only when tentativeEndOfTurnThreshold is set', async () => {
      const withTentative = new DeepgramFluxSTT({
        apiKey: 'k',
        language: 'en',
        turnDetection: { endOfTurnThreshold: 0.9, tentativeEndOfTurnThreshold: 0.4 },
      });
      await openStream(withTentative, vi.fn());
      expect(new URL(lastFakeDeepgramSocket().url).searchParams.get('eager_eot_threshold')).toBe('0.4');

      resetFakeDeepgramSockets();
      const withoutTentative = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      await openStream(withoutTentative, vi.fn());
      expect(new URL(lastFakeDeepgramSocket().url).searchParams.has('eager_eot_threshold')).toBe(false);
    });

    it('repeats keyterm once per configured keyterm', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en', keyterms: ['OwlLayer', 'AITP'] });
      await openStream(flux, vi.fn());

      const query = new URL(lastFakeDeepgramSocket().url).searchParams;
      expect(query.getAll('keyterm')).toEqual(['OwlLayer', 'AITP']);
    });

    it('sends language_hint only for flux-general-multi, never for flux-general-en', async () => {
      const multi = new DeepgramFluxSTT({ apiKey: 'k', model: 'flux-general-multi', language: 'fr' });
      await openStream(multi, vi.fn());
      const multiQuery = new URL(lastFakeDeepgramSocket().url).searchParams;
      expect(multiQuery.getAll('language_hint')).toEqual(['fr']);

      resetFakeDeepgramSockets();
      const en = new DeepgramFluxSTT({ apiKey: 'k', model: 'flux-general-en', language: 'en' });
      await openStream(en, vi.fn());
      const enQuery = new URL(lastFakeDeepgramSocket().url).searchParams;
      expect(enQuery.has('language_hint')).toBe(false);
    });

    it('sends mip_opt_out=true only when configured', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en', mipOptOut: true });
      await openStream(flux, vi.fn());
      expect(new URL(lastFakeDeepgramSocket().url).searchParams.get('mip_opt_out')).toBe('true');

      resetFakeDeepgramSockets();
      const withoutOptOut = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      await openStream(withoutOptOut, vi.fn());
      expect(new URL(lastFakeDeepgramSocket().url).searchParams.has('mip_opt_out')).toBe(false);
    });

    it('repeats tag once per configured tag', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en', tags: ['prod', 'checkout'] });
      await openStream(flux, vi.fn());

      expect(new URL(lastFakeDeepgramSocket().url).searchParams.getAll('tag')).toEqual(['prod', 'checkout']);
    });
  });

  describe('audio queueing before Connected', () => {
    it('sends no binary frame before Connected', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, vi.fn());
      const socket = lastFakeDeepgramSocket();

      stream.sendAudio(PCM_CHUNK_1S);

      expect(socket.sent).toHaveLength(0);
    });

    it('flushes queued audio in order once Connected arrives', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, vi.fn());
      const socket = lastFakeDeepgramSocket();
      socket.open();

      const first = Buffer.from([1, 2]).toString('base64');
      const second = Buffer.from([3, 4]).toString('base64');
      stream.sendAudio(first);
      stream.sendAudio(second);
      expect(socket.sent).toHaveLength(0); // toujours en file : pas encore 'Connected'

      socket.serverSend({ type: 'Connected' });

      expect(socket.sent).toEqual([Buffer.from([1, 2]), Buffer.from([3, 4])]);
      expect(stream.state).toBe('ready');
    });

    it('sends audio immediately once ready (post-Connected)', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, vi.fn());
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });

      const chunk = Buffer.from([9, 9]).toString('base64');
      stream.sendAudio(chunk);

      expect(socket.sent).toEqual([Buffer.from([9, 9])]);
    });

    it('emits a non-fatal AUDIO_QUEUE_FULL stream.error and drops the chunk when the pre-ready queue bound (from limits.maxQueuedAudioMs) is exceeded', async () => {
      const onEvent = vi.fn();
      // maxQueuedAudioMs par defaut = 2000ms ; 16kHz*2 octets/echantillon => 64000 octets max.
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, onEvent);
      const socket = lastFakeDeepgramSocket();

      const oneSecond = Buffer.alloc(16000 * 2).toString('base64'); // 32000 octets
      stream.sendAudio(oneSecond);
      stream.sendAudio(oneSecond); // 64000 octets : exactement a la limite, accepte
      onEvent.mockClear();
      stream.sendAudio(oneSecond); // depasse la limite : rejete

      expect(onEvent).toHaveBeenCalledTimes(1);
      const event = onEvent.mock.calls[0][0] as STTTurnEvent;
      expect(event.type).toBe('stream.error');
      if (event.type === 'stream.error') {
        expect(event.error.code).toBe('AUDIO_QUEUE_FULL');
        expect(event.fatal).toBe(false);
      }

      // Le flux reste utilisable : Connected ne rejoue pas le chunk rejete, seulement les deux premiers.
      socket.open();
      socket.serverSend({ type: 'Connected' });
      expect(socket.sent).toHaveLength(2);
    });
  });

  describe('TurnInfo -> STTTurnEvent mapping', () => {
    async function openReady(onEvent: (event: STTTurnEvent) => void) {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, onEvent);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      onEvent.mockClear();
      return { stream, socket };
    }

    it('maps TurnInfo{event:StartOfTurn} to turn.started with turnIndex from turn_index', async () => {
      const onEvent = vi.fn();
      const { socket } = await openReady(onEvent);

      socket.serverSend({ type: 'TurnInfo', event: 'StartOfTurn', turn_index: 3 });

      expect(onEvent).toHaveBeenCalledWith({ type: 'turn.started', turnIndex: 3 });
    });

    it('maps TurnInfo{event:Update} to transcript.partial with the transcript text', async () => {
      const onEvent = vi.fn();
      const { socket } = await openReady(onEvent);

      socket.serverSend({ type: 'TurnInfo', event: 'Update', turn_index: 1, transcript: 'bonj' });

      expect(onEvent).toHaveBeenCalledWith({ type: 'transcript.partial', turnIndex: 1, text: 'bonj' });
    });

    it('maps TurnInfo{event:EagerEndOfTurn} to turn.tentative_end with text and confidence', async () => {
      const onEvent = vi.fn();
      const { socket } = await openReady(onEvent);

      socket.serverSend({
        type: 'TurnInfo',
        event: 'EagerEndOfTurn',
        turn_index: 2,
        transcript: 'bonjour',
        end_of_turn_confidence: 0.6,
      });

      expect(onEvent).toHaveBeenCalledWith({ type: 'turn.tentative_end', turnIndex: 2, text: 'bonjour', confidence: 0.6 });
    });

    it('maps TurnInfo{event:TurnResumed} to turn.resumed', async () => {
      const onEvent = vi.fn();
      const { socket } = await openReady(onEvent);

      socket.serverSend({ type: 'TurnInfo', event: 'TurnResumed', turn_index: 2 });

      expect(onEvent).toHaveBeenCalledWith({ type: 'turn.resumed', turnIndex: 2 });
    });

    it('maps TurnInfo{event:EndOfTurn} to turn.ended with text, confidence, and languages', async () => {
      const onEvent = vi.fn();
      const { socket } = await openReady(onEvent);

      socket.serverSend({
        type: 'TurnInfo',
        event: 'EndOfTurn',
        turn_index: 4,
        transcript: 'bonjour le monde',
        end_of_turn_confidence: 0.95,
        languages: ['fr'],
      });

      expect(onEvent).toHaveBeenCalledWith({
        type: 'turn.ended',
        turnIndex: 4,
        text: 'bonjour le monde',
        confidence: 0.95,
        languages: ['fr'],
      });
    });

    it('ignores an unrecognized TurnInfo event value without throwing', async () => {
      const onEvent = vi.fn();
      const { socket } = await openReady(onEvent);

      expect(() => socket.serverSend({ type: 'TurnInfo', event: 'SomeFutureEvent', turn_index: 0 })).not.toThrow();
      expect(onEvent).not.toHaveBeenCalled();
    });
  });

  describe('endAudioTurn()', () => {
    it('sends exactly {"type":"ForceEndTurn"}', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, vi.fn());
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });

      await stream.endAudioTurn();

      expect(socket.sent.at(-1)).toBe(JSON.stringify({ type: 'ForceEndTurn' }));
    });
  });

  describe('updateTurnDetection()', () => {
    async function openReadyFluxStream() {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = (await openStream(flux, vi.fn())) as DeepgramFluxTurnStream;
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      return { stream, socket };
    }

    it('rejects locally with INVALID_SETTINGS for an out-of-range endOfTurnThreshold, before sending anything', async () => {
      const { stream, socket } = await openReadyFluxStream();

      await expect(stream.updateTurnDetection({ endOfTurnThreshold: 1.5 })).rejects.toMatchObject({
        provider: 'deepgram',
        code: 'INVALID_SETTINGS',
      });
      expect(socket.sent).toHaveLength(0);
    });

    it('rejects locally when tentativeEndOfTurnThreshold would exceed the effective endOfTurnThreshold', async () => {
      const { stream, socket } = await openReadyFluxStream();

      await expect(stream.updateTurnDetection({ tentativeEndOfTurnThreshold: 0.9 })).rejects.toMatchObject({
        code: 'INVALID_SETTINGS',
      }); // eot par defaut = 0.7 < 0.9
      expect(socket.sent).toHaveLength(0);
    });

    it('sends Configure with Deepgram field names (nested thresholds) for a valid update', async () => {
      const { stream, socket } = await openReadyFluxStream();

      const promise = stream.updateTurnDetection({ endOfTurnThreshold: 0.8, tentativeEndOfTurnThreshold: 0.4, endOfTurnTimeoutMs: 6000 });
      const sent = JSON.parse(socket.sent.at(-1) as string);
      expect(sent).toEqual({
        type: 'Configure',
        thresholds: { eot_threshold: 0.8, eager_eot_threshold: 0.4, eot_timeout_ms: 6000 },
      });

      socket.serverSend({ type: 'ConfigureSuccess', thresholds: { eot_threshold: 0.8, eager_eot_threshold: 0.4, eot_timeout_ms: 6000 } });
      await expect(promise).resolves.toBeUndefined();
    });

    it('sends keyterms entirely replacing the previous list (no merge)', async () => {
      const { stream, socket } = await openReadyFluxStream();

      const promise = stream.updateTurnDetection({ keyterms: ['OwlLayer'] });
      const sent = JSON.parse(socket.sent.at(-1) as string);
      expect(sent).toEqual({ type: 'Configure', keyterms: ['OwlLayer'] });

      socket.serverSend({ type: 'ConfigureSuccess', keyterms: ['OwlLayer'] });
      await promise;
    });

    it('rejects with INVALID_REQUEST on ConfigureFailure', async () => {
      const { stream, socket } = await openReadyFluxStream();

      const promise = stream.updateTurnDetection({ endOfTurnThreshold: 0.9 });
      socket.serverSend({ type: 'ConfigureFailure', code: 'INVALID_THRESHOLD', description: 'nope' });

      await expect(promise).rejects.toMatchObject({ provider: 'deepgram', code: 'INVALID_REQUEST' });
    });

    it('times out with TIMEOUT when no ConfigureSuccess/ConfigureFailure arrives before acknowledgementTimeoutMs', async () => {
      vi.useFakeTimers();
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = (await openStream(flux, vi.fn())) as DeepgramFluxTurnStream;
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });

      const promise = stream.updateTurnDetection({ endOfTurnThreshold: 0.9 });
      const assertion = expect(promise).rejects.toMatchObject({ provider: 'deepgram', code: 'TIMEOUT' });
      await vi.advanceTimersByTimeAsync(5000); // acknowledgementTimeoutMs par defaut
      await assertion;
    });

    it('rejects a second update while the first is unacknowledged, and the first still resolves on its ConfigureSuccess', async () => {
      const { stream, socket } = await openReadyFluxStream();

      const first = stream.updateTurnDetection({ endOfTurnThreshold: 0.8 });
      await expect(stream.updateTurnDetection({ endOfTurnThreshold: 0.9 })).rejects.toMatchObject({
        provider: 'deepgram',
        code: 'INVALID_REQUEST',
      });
      expect(socket.sent.filter((frame) => typeof frame === 'string' && frame.includes('Configure'))).toHaveLength(1);

      socket.serverSend({ type: 'ConfigureSuccess', thresholds: { eot_threshold: 0.8 } });
      await expect(first).resolves.toBeUndefined();

      const next = stream.updateTurnDetection({ endOfTurnThreshold: 0.9 });
      socket.serverSend({ type: 'ConfigureSuccess', thresholds: { eot_threshold: 0.9 } });
      await expect(next).resolves.toBeUndefined();
    });

    it('rejects immediately with REMOTE_CLOSED after close(), without sending Configure', async () => {
      const { stream, socket } = await openReadyFluxStream();
      await stream.close();
      const sentBefore = socket.sent.length;

      await expect(stream.updateTurnDetection({ endOfTurnThreshold: 0.8 })).rejects.toMatchObject({
        provider: 'deepgram',
        code: 'REMOTE_CLOSED',
      });
      expect(socket.sent).toHaveLength(sentBefore);
    });
  });

  describe('fatal error handling', () => {
    it('maps a fatal FatalError message to stream.error (fatal) then closes the stream', async () => {
      const onEvent = vi.fn();
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      await openStream(flux, onEvent);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      onEvent.mockClear();

      socket.serverSend({ type: 'FatalError', code: 'INTERNAL', description: 'boom' });

      expect(onEvent.mock.calls[0][0]).toMatchObject({ type: 'stream.error', fatal: true });
      expect(onEvent.mock.calls[1][0]).toEqual({ type: 'stream.closed', reason: 'error' });
    });

    it('also maps a fatal "Error" message (alternate documented name) the same way', async () => {
      const onEvent = vi.fn();
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      await openStream(flux, onEvent);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      onEvent.mockClear();

      socket.serverSend({ type: 'Error', code: 'INTERNAL', description: 'boom' });

      expect(onEvent.mock.calls[0][0]).toMatchObject({ type: 'stream.error', fatal: true });
      expect(onEvent.mock.calls[1][0]).toEqual({ type: 'stream.closed', reason: 'error' });
    });
  });

  describe('close behavior', () => {
    it('unexpected remote close (no prior CloseStream) emits stream.error REMOTE_CLOSED then stream.closed reason remote', async () => {
      const onEvent = vi.fn();
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      await openStream(flux, onEvent);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      onEvent.mockClear();

      socket.serverClose(1006, 'connection lost'); // code inattendu (ni 1011 ni 1008) -> REMOTE_CLOSED

      expect(onEvent.mock.calls[0][0]).toMatchObject({ type: 'stream.error', fatal: true });
      expect((onEvent.mock.calls[0][0] as { error: { code: string } }).error.code).toBe('REMOTE_CLOSED');
      expect(onEvent.mock.calls[1][0]).toEqual({ type: 'stream.closed', reason: 'remote' });
    });

    it('close() sends CloseStream, and the following 1005 close is NOT reported as an error', async () => {
      const onEvent = vi.fn();
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, onEvent);
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      onEvent.mockClear();

      await stream.close();

      expect(socket.sent.some((frame) => frame === JSON.stringify({ type: 'CloseStream' }))).toBe(true);
      // La fake socket ferme de facon synchrone (contrairement a `ws` reel) en emettant
      // 'close' immediatement ; on simule ici le code 1005 documente par Deepgram.
      expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'stream.error' }));
      expect(onEvent).toHaveBeenCalledWith({ type: 'stream.closed', reason: 'client' });
    });

    it('double close() is a no-op (sends CloseStream once, closes once)', async () => {
      const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
      const stream = await openStream(flux, vi.fn());
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });

      await stream.close();
      const sentAfterFirstClose = socket.sent.length;
      await stream.close();

      expect(socket.sent).toHaveLength(sentAfterFirstClose);
      expect(stream.state).toBe('closed');
    });
  });

  it('rejects French with flux-general-en at DeepgramFluxSTT construction (UNSUPPORTED_LANGUAGE, S13)', () => {
    expect(() => new DeepgramFluxSTT({ apiKey: 'k', model: 'flux-general-en', language: 'fr' })).toThrowError(
      expect.objectContaining({ provider: 'deepgram', code: 'UNSUPPORTED_LANGUAGE' }),
    );
  });

  it('accepts English with flux-general-en at construction without throwing', () => {
    expect(() => new DeepgramFluxSTT({ apiKey: 'k', model: 'flux-general-en', language: 'en' })).not.toThrow();
  });

  it('getCapabilities() is derived from the Flux catalog and reports the current model/language', () => {
    const flux = new DeepgramFluxSTT({ apiKey: 'k', model: 'flux-general-multi', language: 'fr' });
    const capabilities = flux.getCapabilities();

    expect(capabilities.provider).toBe('deepgram-flux');
    expect(capabilities.currentModel).toBe('flux-general-multi');
    expect(capabilities.currentLanguage).toBe('fr');
  });
});

describe('DeepgramFluxSTT audit additions (construction, validation bounds, effective thresholds)', () => {
  beforeEach(() => {
    resetFakeDeepgramSockets();
  });

  it('rejects an empty API key with AUTH_FAILED at construction, before any socket', () => {
    expect(() => new DeepgramFluxSTT({ apiKey: '', language: 'en' })).toThrow(
      expect.objectContaining({ provider: 'deepgram', code: 'AUTH_FAILED' }),
    );
    expect(FakeDeepgramWebSocket.instances).toHaveLength(0);
  });

  it('never sends language_hint for flux-general-en, even when language hints are configured', async () => {
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en', model: 'flux-general-en', languageHints: ['en'] });
    await openStream(flux, vi.fn());
    expect(new URL(lastFakeDeepgramSocket().url).searchParams.getAll('language_hint')).toEqual([]);
  });

  async function openReady() {
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });
    const stream = (await openStream(flux, vi.fn())) as DeepgramFluxTurnStream;
    const socket = lastFakeDeepgramSocket();
    socket.open();
    socket.serverSend({ type: 'Connected' });
    return { stream, socket };
  }

  it('accepts exactly 100 keyterms and rejects 101 locally', async () => {
    const { stream, socket } = await openReady();
    const hundred = Array.from({ length: 100 }, (_, i) => `term${i}`);

    await expect(stream.updateTurnDetection({ keyterms: [...hundred, 'extra'] })).rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
    expect(socket.sent).toHaveLength(0);

    const accepted = stream.updateTurnDetection({ keyterms: hundred });
    expect(JSON.parse(socket.sent.at(-1) as string)).toEqual({ type: 'Configure', keyterms: hundred });
    socket.serverSend({ type: 'ConfigureSuccess', keyterms: hundred });
    await expect(accepted).resolves.toBeUndefined();
  });

  it('rejects endOfTurnTimeoutMs outside [500, 60000] locally', async () => {
    const { stream, socket } = await openReady();
    await expect(stream.updateTurnDetection({ endOfTurnTimeoutMs: 499 })).rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
    await expect(stream.updateTurnDetection({ endOfTurnTimeoutMs: 60001 })).rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
    expect(socket.sent).toHaveLength(0);
  });

  it('validates later updates against the thresholds confirmed by ConfigureSuccess', async () => {
    const { stream, socket } = await openReady();

    const raise = stream.updateTurnDetection({ endOfTurnThreshold: 0.9 });
    socket.serverSend({ type: 'ConfigureSuccess', thresholds: { eot_threshold: 0.9 } });
    await raise;

    // 0.85 depasse l'ancien seuil par defaut (0.7) mais pas le seuil confirme (0.9).
    const tentative = stream.updateTurnDetection({ tentativeEndOfTurnThreshold: 0.85 });
    expect(JSON.parse(socket.sent.at(-1) as string)).toEqual({ type: 'Configure', thresholds: { eager_eot_threshold: 0.85 } });
    socket.serverSend({ type: 'ConfigureSuccess', thresholds: { eager_eot_threshold: 0.85 } });
    await expect(tentative).resolves.toBeUndefined();
  });
});
