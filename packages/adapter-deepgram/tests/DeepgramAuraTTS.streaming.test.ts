// ============================================================
// DeepgramAuraSpeechStream / DeepgramAuraTTS.openSpeechStream (S4, T058)
// Speak order, Flush/Clear acquittes, porte de sortie, alignement pair,
// Warning redige, TEXT_QUEUE_FULL, timeouts d'accuse de reception,
// fermeture idempotente, cle jamais exposee.
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TTSSpeechStream } from '@owllayer/core';
import { FakeDeepgramWebSocket, lastFakeDeepgramSocket, resetFakeDeepgramSockets } from './helpers/fakeDeepgramSocket.js';
import { DeepgramAuraTTS } from '../src/DeepgramAuraTTS.js';
import { getDeepgramErrorDetails } from '../src/errors.js';
import type { DeepgramAuraSpeechStream } from '../src/DeepgramAuraSpeechStream.js';

vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }));

function jsonFrames(socket: FakeDeepgramWebSocket): unknown[] {
  return socket.sent.filter((frame): frame is string => typeof frame === 'string').map((frame) => JSON.parse(frame));
}

async function openReadyStream(
  tts: DeepgramAuraTTS,
  onAudio = vi.fn(),
  onError = vi.fn(),
): Promise<{ stream: TTSSpeechStream; socket: FakeDeepgramWebSocket; onAudio: typeof onAudio; onError: typeof onError }> {
  const stream = await tts.openSpeechStream({ onAudio, onError });
  const socket = lastFakeDeepgramSocket();
  socket.open();
  return { stream, socket, onAudio, onError };
}

describe('DeepgramAuraTTS.openSpeechStream / DeepgramAuraSpeechStream (S4)', () => {
  beforeEach(() => resetFakeDeepgramSockets());
  afterEach(() => vi.useRealTimers());

  it('connects to wss://api.deepgram.com/v1/speak with model/encoding/sample_rate/speed and never puts the key in the URL', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'sk-very-secret', voice: 'aura-2-hector-fr', language: 'fr', sampleRate: 16000, speed: 1.2 });
    await tts.openSpeechStream({ onAudio: vi.fn(), onError: vi.fn() });

    const socket = lastFakeDeepgramSocket();
    const url = new URL(socket.url);
    expect(url.origin + url.pathname).toBe('wss://api.deepgram.com/v1/speak');
    expect(url.searchParams.get('model')).toBe('aura-2-hector-fr');
    expect(url.searchParams.get('encoding')).toBe('linear16');
    expect(url.searchParams.get('sample_rate')).toBe('16000');
    expect(url.searchParams.get('speed')).toBe('1.2');
    expect(socket.url).not.toContain('sk-very-secret');
    expect(socket.options.headers).toEqual({ Authorization: 'Token sk-very-secret' });
  });

  it('becomes ready directly on socket open, with no wait for a "Connected" message', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError: vi.fn() });
    expect(stream.state).toBe('connecting');

    lastFakeDeepgramSocket().open();
    expect(stream.state).toBe('ready');
  });

  it('sends appendText as a Speak message immediately once ready', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { stream, socket } = await openReadyStream(tts);

    stream.appendText('bonjour');

    expect(jsonFrames(socket)).toEqual([{ type: 'Speak', text: 'bonjour' }]);
  });

  it('queues appendText calls before ready and flushes them as Speak, in order, once open', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError: vi.fn() });
    const socket = lastFakeDeepgramSocket();

    stream.appendText('un');
    stream.appendText('deux');
    stream.appendText('trois');
    expect(socket.sent).toHaveLength(0);

    socket.open();

    expect(jsonFrames(socket)).toEqual([
      { type: 'Speak', text: 'un' },
      { type: 'Speak', text: 'deux' },
      { type: 'Speak', text: 'trois' },
    ]);
  });

  it('several segments: multiple Speak then Flush resolves flush() only once Flushed arrives', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { stream, socket } = await openReadyStream(tts);

    stream.appendText('premier segment');
    stream.appendText('second segment');
    const flushPromise = stream.flush();

    expect(jsonFrames(socket)).toEqual([
      { type: 'Speak', text: 'premier segment' },
      { type: 'Speak', text: 'second segment' },
      { type: 'Flush' },
    ]);

    let resolved = false;
    void flushPromise.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);

    socket.serverSend({ type: 'Flushed', sequence_id: 1 });
    await flushPromise;
    expect(resolved).toBe(true);
  });

  it('emits binary audio through onAudio, even-byte aligned, with the streaming linear16 MIME type', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k', sampleRate: 16000 });
    const { stream, socket, onAudio } = await openReadyStream(tts);
    void stream;

    socket.serverSendBinary(Buffer.from([1, 2, 3, 4]));

    expect(onAudio).toHaveBeenCalledTimes(1);
    expect(onAudio).toHaveBeenCalledWith(Buffer.from([1, 2, 3, 4]).toString('base64'), 'audio/pcm;rate=16000');
  });

  it('never emits an odd-length chunk: the trailing byte is carried over to the next chunk', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { socket, onAudio } = await openReadyStream(tts);

    socket.serverSendBinary(Buffer.from([1, 2, 3])); // 3 octets : 2 emis, 1 reporte
    expect(onAudio).toHaveBeenCalledTimes(1);
    expect(Buffer.from(onAudio.mock.calls[0][0], 'base64')).toEqual(Buffer.from([1, 2]));

    socket.serverSendBinary(Buffer.from([4, 5])); // octet reporte (3) + ce chunk -> [3,4,5], 4 emis, 1 reporte
    expect(onAudio).toHaveBeenCalledTimes(2);
    expect(Buffer.from(onAudio.mock.calls[1][0], 'base64')).toEqual(Buffer.from([3, 4]));

    // A aucun moment un chunk de longueur impaire n'a ete emis.
    for (const call of onAudio.mock.calls) {
      expect(Buffer.from(call[0], 'base64').length % 2).toBe(0);
    }
  });

  describe('interrupt() — output gate', () => {
    it('sends Clear immediately and drops in-flight binary audio until Cleared arrives', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket, onAudio } = await openReadyStream(tts);

      const interruptPromise = stream.interrupt();
      expect(jsonFrames(socket)).toEqual([{ type: 'Clear' }]);

      // Audio deja "en vol" au moment de l'interruption : ignore tant que `Cleared` n'est pas arrive.
      socket.serverSendBinary(Buffer.from([9, 9, 9, 9]));
      expect(onAudio).not.toHaveBeenCalled();

      socket.serverSend({ type: 'Cleared', sequence_id: 1 });
      await interruptPromise;

      // La porte est rouverte : l'audio qui suit est de nouveau transmis.
      socket.serverSendBinary(Buffer.from([1, 2]));
      expect(onAudio).toHaveBeenCalledTimes(1);
      expect(Buffer.from(onAudio.mock.calls[0][0], 'base64')).toEqual(Buffer.from([1, 2]));
    });

    it('clears pending queued text on interrupt (barge-in drops what was not sent yet)', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError: vi.fn() });
      const socket = lastFakeDeepgramSocket();

      stream.appendText('jamais envoye'); // toujours en file, la connexion n'est pas encore ouverte
      const interruptPromise = stream.interrupt();
      interruptPromise.catch(() => {});

      socket.open(); // ouverture APRES l'interruption : la file doit rester vide
      expect(jsonFrames(socket).some((frame) => (frame as { type: string }).type === 'Speak')).toBe(false);
    });

    it('does not corrupt alignment: a byte carried before interrupt is discarded, never glued to post-Cleared audio', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket, onAudio } = await openReadyStream(tts);

      socket.serverSendBinary(Buffer.from([1, 2, 3])); // reporte l'octet 3
      expect(Buffer.from(onAudio.mock.calls[0][0], 'base64')).toEqual(Buffer.from([1, 2]));

      const interruptPromise = stream.interrupt();
      socket.serverSend({ type: 'Cleared' });
      await interruptPromise;

      socket.serverSendBinary(Buffer.from([7, 8]));
      const lastCall = onAudio.mock.calls[onAudio.mock.calls.length - 1];
      // Si l'octet 3 avait survecu, le dernier chunk serait [3,7,8] (impair, tronque a [3,7]).
      expect(Buffer.from(lastCall[0], 'base64')).toEqual(Buffer.from([7, 8]));
    });
  });

  it('emits a redacted aura.warning event on a provider Warning (never the raw description)', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { stream, socket } = await openReadyStream(tts);
    const warnings: { message: string }[] = [];
    (stream as DeepgramAuraSpeechStream).on('aura.warning', (payload) => warnings.push(payload));

    socket.serverSend({ type: 'Warning', code: 'BUFFER_FULL', description: 'some sensitive internal detail sk-leak' });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).not.toContain('sensitive internal detail');
    expect(warnings[0].message).not.toContain('sk-leak');
    expect(warnings[0].message).toContain('BUFFER_FULL');
  });

  it('reports TEXT_QUEUE_FULL via onError when appendText is queued beyond the configured limit, without closing the stream', async () => {
    const errors: { code: string }[] = [];
    const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { maxQueuedTextSegments: 2 } });
    const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError: (err) => errors.push(err) });

    stream.appendText('a');
    stream.appendText('b');
    stream.appendText('c'); // depasse la limite de 2

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: 'TEXT_QUEUE_FULL' });
    expect(stream.state).toBe('connecting');
  });

  describe('flush() acknowledgement', () => {
    it('leaves no active acknowledgement timer once Flushed resolves the flush', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      const promise = stream.flush();
      socket.serverSend({ type: 'Flushed' });
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects with TIMEOUT if Flushed never arrives within acknowledgementTimeoutMs', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { acknowledgementTimeoutMs: 2000 } });
      const { stream } = await openReadyStream(tts);

      let failure: unknown;
      stream.flush().catch((error: unknown) => {
        failure = error;
      });
      await vi.advanceTimersByTimeAsync(2000);
      expect(failure).toMatchObject({ provider: 'deepgram', code: 'TIMEOUT' });
    });

    it('rejects a second concurrent flush() with INVALID_REQUEST without disturbing the first pending flush', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { acknowledgementTimeoutMs: 5000 } });
      const { stream, socket } = await openReadyStream(tts);

      const first = stream.flush();
      await expect(stream.flush()).rejects.toMatchObject({ code: 'INVALID_REQUEST' });

      // Le timer du premier flush n'a pas ete touche par le rejet du second :
      // Flushed resout toujours le premier normalement.
      socket.serverSend({ type: 'Flushed' });
      await expect(first).resolves.toBeUndefined();
    });
  });

  describe('interrupt() acknowledgement', () => {
    it('leaves no active acknowledgement timer once Cleared resolves the interrupt', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      const promise = stream.interrupt();
      socket.serverSend({ type: 'Cleared' });
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('rejects with TIMEOUT if Cleared never arrives within acknowledgementTimeoutMs', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { acknowledgementTimeoutMs: 2000 } });
      const { stream } = await openReadyStream(tts);

      let failure: unknown;
      stream.interrupt().catch((error: unknown) => {
        failure = error;
      });
      await vi.advanceTimersByTimeAsync(2000);
      expect(failure).toMatchObject({ provider: 'deepgram', code: 'TIMEOUT' });
    });

    it('rejects a second concurrent interrupt() with INVALID_REQUEST without disturbing the first pending interrupt', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { acknowledgementTimeoutMs: 5000 } });
      const { stream, socket } = await openReadyStream(tts);

      const first = stream.interrupt();
      await expect(stream.interrupt()).rejects.toMatchObject({ code: 'INVALID_REQUEST' });

      socket.serverSend({ type: 'Cleared' });
      await expect(first).resolves.toBeUndefined();
    });
  });

  describe('operations after close()', () => {
    it('appendText after close() sends nothing', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      await stream.close();
      const sentBefore = socket.sent.length;
      stream.appendText('too late');
      expect(socket.sent).toHaveLength(sentBefore);
    });

    it('flush() after close() rejects immediately with REMOTE_CLOSED, without waiting for the acknowledgement timeout', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream } = await openReadyStream(tts);

      await stream.close();
      await expect(stream.flush()).rejects.toMatchObject({ code: 'REMOTE_CLOSED' });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('interrupt() after close() rejects immediately with REMOTE_CLOSED, without waiting for the acknowledgement timeout', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream } = await openReadyStream(tts);

      await stream.close();
      await expect(stream.interrupt()).rejects.toMatchObject({ code: 'REMOTE_CLOSED' });
      expect(vi.getTimerCount()).toBe(0);
    });

    it('close() is idempotent: a second call sends no extra Close frame', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      await stream.close();
      const sentAfterFirstClose = socket.sent.length;
      await stream.close();

      expect(socket.sent).toHaveLength(sentAfterFirstClose);
      expect(socket.sent.filter((f) => typeof f === 'string' && f.includes('"Close"'))).toHaveLength(1);
      expect(stream.state).toBe('closed');
    });
  });

  it('a pending flush and interrupt are both rejected with REMOTE_CLOSED when the connection closes unexpectedly', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { stream, socket } = await openReadyStream(tts);

    const flushPromise = stream.flush();
    const assertion1 = expect(flushPromise).rejects.toMatchObject({ code: 'REMOTE_CLOSED' });

    socket.serverClose(1011, 'boom');

    await assertion1;
    expect(stream.state).toBe('closed');
  });

  it('reports REMOTE_CLOSED via onError on an unexpected remote close', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { socket, onError } = await openReadyStream(tts);

    socket.serverClose(1011, 'boom');

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });

  it('does not report an error for a client-initiated close()', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { stream, onError } = await openReadyStream(tts);

    await stream.close();

    expect(onError).not.toHaveBeenCalled();
  });

  it('reports a single TIMEOUT error via onError if the socket never opens, and closes exactly once', async () => {
    vi.useFakeTimers();
    const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { openTimeoutMs: 1000 } });
    const onError = vi.fn();
    const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError });

    await vi.advanceTimersByTimeAsync(1000);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ code: 'TIMEOUT' });
    expect(stream.state).toBe('closed');
  });

  it('keeps the request_id from a Metadata message and attaches it to a later wsClose error', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k' });
    const { socket, onError } = await openReadyStream(tts);

    socket.serverSend({ type: 'Metadata', request_id: 'req-123', model_name: 'aura-2' });
    socket.serverClose(1011, 'boom');

    expect(onError).toHaveBeenCalledTimes(1);
    const error = onError.mock.calls[0][0];
    expect(error.code).toBe('PROVIDER_UNAVAILABLE');
    expect(getDeepgramErrorDetails(error).requestId).toBe('req-123');
  });

  it('never leaks the API key in the connection URL or in any onError SpeechServiceError', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'sk-very-secret' });
    const { socket, onError } = await openReadyStream(tts);

    expect(socket.url).not.toContain('sk-very-secret');

    socket.serverError(new Error('handshake failed for sk-very-secret'));
    socket.serverClose(1011, 'sk-very-secret');

    const serialize = (value: unknown) =>
      JSON.stringify(value, (_k, v) => (v instanceof Error ? { message: v.message, ...v } : v));
    expect(serialize(onError.mock.calls)).not.toContain('sk-very-secret');
  });

  it('rejects a per-call voice/languageCode mismatch before opening any socket', async () => {
    const tts = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' });

    await expect(
      tts.openSpeechStream({ voice: 'aura-2-agathe-fr', languageCode: 'en', onAudio: vi.fn(), onError: vi.fn() }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_LANGUAGE' });
    expect(FakeDeepgramWebSocket.instances).toHaveLength(0);
  });

  describe('ordering, long text and interruption edge cases', () => {
    it('a flush() called before the connection opens is sent after the queued Speak messages, never before', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError: vi.fn() });
      const socket = lastFakeDeepgramSocket();

      stream.appendText('Bonjour');
      const flushed = stream.flush();
      expect(socket.sent).toHaveLength(0);

      socket.open();
      expect(jsonFrames(socket)).toEqual([{ type: 'Speak', text: 'Bonjour' }, { type: 'Flush' }]);
      socket.serverSend({ type: 'Flushed', sequence_id: 0 });
      await expect(flushed).resolves.toBeUndefined();
    });

    it('splits text longer than 2000 characters into several Speak messages, on a space when possible', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);
      const text = `${'a'.repeat(1500)} ${'b'.repeat(1500)} ${'c'.repeat(10)}`;

      stream.appendText(text);

      const speaks = jsonFrames(socket) as Array<{ type: string; text: string }>;
      expect(speaks.map((frame) => frame.type)).toEqual(['Speak', 'Speak']);
      expect(speaks.every((frame) => frame.text.length <= 2000)).toBe(true);
      expect(speaks[0]!.text).toBe('a'.repeat(1500));
      expect(speaks.map((frame) => frame.text).join('')).toBe(text);
    });

    it('splits a text without spaces at exactly 2000 characters', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      stream.appendText('x'.repeat(4001));

      const lengths = (jsonFrames(socket) as Array<{ text: string }>).map((frame) => frame.text.length);
      expect(lengths).toEqual([2000, 2000, 1]);
    });

    it('reopens the output gate when Cleared never arrives, so later audio is not lost', async () => {
      vi.useFakeTimers();
      const tts = new DeepgramAuraTTS({ apiKey: 'k', limits: { acknowledgementTimeoutMs: 1000 } });
      const { stream, socket, onAudio } = await openReadyStream(tts);

      let failure: unknown;
      stream.interrupt().catch((error: unknown) => {
        failure = error;
      });
      await vi.advanceTimersByTimeAsync(1000);
      expect(failure).toMatchObject({ code: 'TIMEOUT' });

      socket.serverSendBinary(Buffer.from([4, 2]));
      expect(onAudio).toHaveBeenCalledTimes(1);
      expect(Buffer.from(onAudio.mock.calls[0][0], 'base64')).toEqual(Buffer.from([4, 2]));
    });

    it('interrupt() ends a pending flush, and a Flushed received before Cleared never resolves a later flush', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      stream.appendText('premier segment');
      let firstFlushed = false;
      void stream.flush().then(() => {
        firstFlushed = true;
      });
      const interrupted = stream.interrupt();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(firstFlushed).toBe(true);

      socket.serverSend({ type: 'Flushed', sequence_id: 0 }); // segment abandonne
      socket.serverSend({ type: 'Cleared', sequence_id: 0 });
      await interrupted;

      stream.appendText('second segment');
      let secondDone = false;
      const secondFlush = stream.flush().then(() => {
        secondDone = true;
      });
      await Promise.resolve();
      expect(secondDone).toBe(false);

      socket.serverSend({ type: 'Flushed', sequence_id: 1 });
      await secondFlush;
      expect(secondDone).toBe(true);
    });

    it('interrupt() before the connection opens sends no Clear and resolves at once', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const stream = await tts.openSpeechStream({ onAudio: vi.fn(), onError: vi.fn() });
      const socket = lastFakeDeepgramSocket();

      stream.appendText('jamais envoye');
      await expect(stream.interrupt()).resolves.toBeUndefined();
      socket.open();

      expect(jsonFrames(socket)).toEqual([]);
    });

    it('a Flushed received before Cleared never resolves a flush() issued after the interrupt', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket } = await openReadyStream(tts);

      const interrupted = stream.interrupt();
      stream.appendText('nouvelle reponse');
      let flushed = false;
      const newFlush = stream.flush().then(() => {
        flushed = true;
      });

      socket.serverSend({ type: 'Flushed', sequence_id: 0 }); // segment d'avant Clear
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(flushed).toBe(false);

      socket.serverSend({ type: 'Cleared', sequence_id: 0 });
      await interrupted;
      socket.serverSend({ type: 'Flushed', sequence_id: 1 });
      await newFlush;
      expect(flushed).toBe(true);
    });

    it('drops audio arriving after close() even before the socket confirms the close', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k' });
      const { stream, socket, onAudio } = await openReadyStream(tts);
      socket.suppressCloseEvent = true;

      await stream.close();
      socket.serverSendBinary(Buffer.from([1, 2]));

      expect(stream.state).toBe('closing');
      expect(onAudio).not.toHaveBeenCalled();
    });

    it('validates the per-call languageCode against the voice before opening any socket', async () => {
      const tts = new DeepgramAuraTTS({ apiKey: 'k', language: 'fr' });

      await expect(tts.openSpeechStream({ languageCode: 'en', onAudio: vi.fn(), onError: vi.fn() })).rejects.toMatchObject({
        code: 'UNSUPPORTED_LANGUAGE',
      });
      expect(FakeDeepgramWebSocket.instances).toHaveLength(0);
    });
  });
});
