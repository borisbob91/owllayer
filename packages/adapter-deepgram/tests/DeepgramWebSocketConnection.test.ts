import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDeepgramWebSocket, lastFakeDeepgramSocket, resetFakeDeepgramSockets } from './helpers/fakeDeepgramSocket.js';
import { DeepgramWebSocketConnection } from '../src/transport/DeepgramWebSocketConnection.js';

vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }));

describe('DeepgramWebSocketConnection', () => {
  beforeEach(() => {
    resetFakeDeepgramSockets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('authenticates with the Authorization: Token header and never puts the key in the URL', () => {
    new DeepgramWebSocketConnection({ url: 'wss://api.deepgram.com/v1/listen', apiKey: 'sk-secret-key' });

    const socket = lastFakeDeepgramSocket();
    expect(socket.url).not.toContain('sk-secret-key');
    expect(socket.options.headers).toEqual({ Authorization: 'Token sk-secret-key' });
  });

  it('queues frames sent before open and flushes them in order once open', () => {
    const connection = new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k' });
    const socket = lastFakeDeepgramSocket();

    connection.send('first');
    connection.send('second');
    expect(socket.sent).toHaveLength(0);

    socket.open();
    expect(socket.sent).toEqual(['first', 'second']);
  });

  it('sends frames immediately once the connection is open', () => {
    const connection = new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k' });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    connection.send('now');
    expect(socket.sent).toEqual(['now']);
  });

  it('rejects frames beyond the bounded pre-open queue instead of growing it without limit', () => {
    const onError = vi.fn();
    const connection = new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', maxQueuedSendFrames: 2, onError });
    const socket = lastFakeDeepgramSocket();

    connection.send('a');
    connection.send('b');
    connection.send('c'); // depasse la limite

    expect(onError).toHaveBeenCalledTimes(1);
    socket.open();
    expect(socket.sent).toEqual(['a', 'b']);
  });

  it('demultiplexes a binary frame to onBinaryMessage', () => {
    const onBinaryMessage = vi.fn();
    const onJsonMessage = vi.fn();
    new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', onBinaryMessage, onJsonMessage });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    const audio = Buffer.from([1, 2, 3, 4]);
    socket.serverSendBinary(audio);

    expect(onBinaryMessage).toHaveBeenCalledWith(audio);
    expect(onJsonMessage).not.toHaveBeenCalled();
  });

  it('demultiplexes a JSON frame to onJsonMessage', () => {
    const onBinaryMessage = vi.fn();
    const onJsonMessage = vi.fn();
    new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', onBinaryMessage, onJsonMessage });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    socket.serverSend({ type: 'Connected' });

    expect(onJsonMessage).toHaveBeenCalledWith({ type: 'Connected' });
    expect(onBinaryMessage).not.toHaveBeenCalled();
  });

  it('reports an error and does not crash on an unparsable JSON frame', () => {
    const onError = vi.fn();
    const onJsonMessage = vi.fn();
    new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', onError, onJsonMessage });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    socket.emit('message', Buffer.from('not json', 'utf8'), false);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onJsonMessage).not.toHaveBeenCalled();
  });

  it('times out and reports an error when the socket never opens', () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', openTimeoutMs: 1000, onError });

    vi.advanceTimersByTime(999);
    expect(onError).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toContain('timed out');
  });

  it('does not time out when the socket opens before openTimeoutMs', () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', openTimeoutMs: 1000, onError });
    const socket = lastFakeDeepgramSocket();

    socket.open();
    vi.advanceTimersByTime(5000);

    expect(onError).not.toHaveBeenCalled();
  });

  it('starts a keepalive frame only after open and stops it on close', () => {
    vi.useFakeTimers();
    const buildKeepAliveFrame = vi.fn(() => '{"type":"KeepAlive"}');
    const connection = new DeepgramWebSocketConnection({
      url: 'wss://x',
      apiKey: 'k',
      keepAliveIntervalMs: 1000,
      buildKeepAliveFrame,
    });
    const socket = lastFakeDeepgramSocket();

    // Aucun keepalive avant l'ouverture, meme apres plusieurs intervalles.
    vi.advanceTimersByTime(3000);
    expect(socket.sent).toHaveLength(0);

    socket.open();
    vi.advanceTimersByTime(1000);
    expect(socket.sent).toEqual(['{"type":"KeepAlive"}']);

    vi.advanceTimersByTime(1000);
    expect(socket.sent).toHaveLength(2);

    connection.close();
    vi.advanceTimersByTime(5000);
    expect(socket.sent).toHaveLength(2); // plus aucun keepalive apres close()
  });

  it('close() stops the keepalive timer itself, even if the socket never confirms with a close event', () => {
    vi.useFakeTimers();
    const buildKeepAliveFrame = () => '{"type":"KeepAlive"}';
    const connection = new DeepgramWebSocketConnection({
      url: 'wss://x',
      apiKey: 'k',
      keepAliveIntervalMs: 1000,
      buildKeepAliveFrame,
    });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    vi.advanceTimersByTime(1000);
    expect(socket.sent).toEqual(['{"type":"KeepAlive"}']);

    // La socket ne confirmera jamais la fermeture (pas d'evenement `close`) :
    // close() doit tout de meme arreter le keepalive de facon synchrone.
    socket.suppressCloseEvent = true;
    connection.close();

    vi.advanceTimersByTime(10_000);
    expect(socket.sent).toHaveLength(1); // aucun keepalive supplementaire
    expect(vi.getTimerCount()).toBe(0); // le timer keepalive a bien ete efface
  });

  it('collapses two close events from the socket into exactly one onClose call', () => {
    const onClose = vi.fn();
    new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', onClose });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    // Emission directe (contourne la garde `closed` de la fake socket) pour
    // verifier la propre deduplication de DeepgramWebSocketConnection.
    socket.emit('close', 1000, Buffer.from(''));
    socket.emit('close', 1011, Buffer.from('again'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(1000, '');
  });

  it('close() is idempotent: a second call sends no extra close and triggers no extra onClose', () => {
    const onClose = vi.fn();
    const connection = new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k', onClose });
    const socket = lastFakeDeepgramSocket();
    socket.open();

    connection.close();
    connection.close();
    connection.close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close() before open still closes the connection without throwing', () => {
    const connection = new DeepgramWebSocketConnection({ url: 'wss://x', apiKey: 'k' });

    expect(() => connection.close()).not.toThrow();
    // La fake socket ferme de facon synchrone (contrairement a `ws` en reel) :
    // l'etat passe donc directement a `closed` plutot que de rester `closing`.
    expect(['closing', 'closed']).toContain(connection.readyState);
  });

  it('leaves no active keepalive timer after 100 open/close cycles', () => {
    vi.useFakeTimers();
    const buildKeepAliveFrame = () => '{"type":"KeepAlive"}';

    for (let i = 0; i < 100; i += 1) {
      const connection = new DeepgramWebSocketConnection({
        url: 'wss://x',
        apiKey: 'k',
        keepAliveIntervalMs: 10,
        buildKeepAliveFrame,
      });
      const socket = lastFakeDeepgramSocket();
      socket.open();
      connection.close();
    }

    const sentBefore = FakeDeepgramWebSocket.instances.flatMap((s) => s.sent).length;
    vi.advanceTimersByTime(10_000);
    const sentAfter = FakeDeepgramWebSocket.instances.flatMap((s) => s.sent).length;

    expect(sentAfter).toBe(sentBefore);
    expect(vi.getTimerCount()).toBe(0);
  });
});
