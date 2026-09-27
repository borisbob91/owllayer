// ============================================================
// Lifecycle (S18, FR-019, SC-008) : 100 cycles ouverture/fermeture par
// classe de flux/session websocket Deepgram, sans timer ni frame residuels.
// DG-4 a ajoute la partie `DeepgramFluxTurnStream` ; DG-5 ajoute
// `DeepgramAuraSpeechStream` ci-dessous. Voice Agent (DG-7) rejoindra ce
// fichier dans son propre lot (T085).
// ============================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDeepgramWebSocket, lastFakeDeepgramSocket, resetFakeDeepgramSockets } from './helpers/fakeDeepgramSocket.js';
import { DeepgramFluxSTT } from '../src/DeepgramFluxSTT.js';
import type { DeepgramFluxTurnStream } from '../src/DeepgramFluxTurnStream.js';
import { DeepgramAuraTTS } from '../src/DeepgramAuraTTS.js';
import type { DeepgramAuraSpeechStream } from '../src/DeepgramAuraSpeechStream.js';

vi.mock('ws', () => ({ default: FakeDeepgramWebSocket }));

describe('DeepgramFluxTurnStream lifecycle: 100 open/close cycles (S18)', () => {
  beforeEach(() => {
    resetFakeDeepgramSockets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves no timer, no open socket, and sends no further frame after 100 cycles', async () => {
    vi.useFakeTimers();
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });

    for (let i = 0; i < 100; i += 1) {
      const stream = await flux.openTurnStream({ mimeType: 'audio/pcm;rate=16000', onEvent: () => {} });
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      stream.sendAudio(Buffer.from([1, 2]).toString('base64'));
      await stream.close();
    }

    // Aucun timer ne subsiste : Flux n'a pas de keepalive (verifie DG-4 :
    // le socket /v2/listen ne le supporte pas), et tout timeout `Configure`
    // en attente aurait ete nettoye par `close()`.
    expect(vi.getTimerCount()).toBe(0);

    // Chaque socket cree par les 100 cycles est bien ferme.
    for (const socket of FakeDeepgramWebSocket.instances) {
      expect(socket.closed).toBe(true);
    }

    const sentBefore = FakeDeepgramWebSocket.instances.flatMap((socket) => socket.sent).length;
    await vi.advanceTimersByTimeAsync(60_000);
    const sentAfter = FakeDeepgramWebSocket.instances.flatMap((socket) => socket.sent).length;
    expect(sentAfter).toBe(sentBefore); // aucun envoi tardif (pas de keepalive, pas de flush residuel)
  });

  it('leaves no dangling updateTurnDetection timeout across 100 cycles even when some are never acknowledged', async () => {
    vi.useFakeTimers();
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });

    for (let i = 0; i < 100; i += 1) {
      const stream = await flux.openTurnStream({ mimeType: 'audio/pcm;rate=16000', onEvent: () => {} });
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });

      // Une mise a jour est envoyee mais jamais confirmee avant la fermeture :
      // le timeout d'accuse de reception doit etre annule par `close()`, pas
      // seulement par sa propre expiration.
      const pending = stream.updateTurnDetection({ endOfTurnThreshold: 0.8 });
      pending.catch(() => {
        // Rejet attendu (fermeture avant accuse de reception) ; seule la fuite de timer nous interesse ici.
      });
      await stream.close();
    }

    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases every observability listener registered with on()/onAny() once each stream is closed', async () => {
    type EmitterInternals = { listeners: Record<string, Set<unknown> | undefined>; anyListeners: Set<unknown> };
    const flux = new DeepgramFluxSTT({ apiKey: 'k', language: 'en' });

    for (let i = 0; i < 100; i += 1) {
      const stream = (await flux.openTurnStream({ mimeType: 'audio/pcm;rate=16000', onEvent: () => {} })) as DeepgramFluxTurnStream;
      stream.on('flux.turn.started', () => {});
      stream.onAny(() => {});
      const socket = lastFakeDeepgramSocket();
      socket.open();
      socket.serverSend({ type: 'Connected' });
      await stream.close();

      const emitter = (stream as unknown as { emitter: EmitterInternals }).emitter;
      const remaining = Object.values(emitter.listeners).reduce((total, set) => total + (set?.size ?? 0), 0);
      expect(remaining + emitter.anyListeners.size).toBe(0);
    }
  });
});

describe('DeepgramAuraSpeechStream lifecycle: 100 open/close cycles (S18)', () => {
  beforeEach(() => {
    resetFakeDeepgramSockets();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('leaves no timer, no open socket, and sends no further frame after 100 cycles', async () => {
    vi.useFakeTimers();
    const aura = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' });

    for (let i = 0; i < 100; i += 1) {
      const stream = await aura.openSpeechStream({ onAudio: () => {}, onError: () => {} });
      const socket = lastFakeDeepgramSocket();
      socket.open();
      stream.appendText('hello');
      socket.serverSendBinary(Buffer.from([1, 2]));
      await stream.close();
    }

    // Aucun timer ne subsiste : pas de keepalive documente sur ce websocket
    // (verifie DG-5), et tout timeout Flush/Clear en attente aurait ete
    // nettoye par `close()`.
    expect(vi.getTimerCount()).toBe(0);

    for (const socket of FakeDeepgramWebSocket.instances) {
      expect(socket.closed).toBe(true);
    }

    const sentBefore = FakeDeepgramWebSocket.instances.flatMap((socket) => socket.sent).length;
    await vi.advanceTimersByTimeAsync(60_000);
    const sentAfter = FakeDeepgramWebSocket.instances.flatMap((socket) => socket.sent).length;
    expect(sentAfter).toBe(sentBefore); // aucun envoi tardif
  });

  it('leaves no dangling flush()/interrupt() timeout across 100 cycles even when some are never acknowledged', async () => {
    vi.useFakeTimers();
    const aura = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' });

    for (let i = 0; i < 100; i += 1) {
      const stream = await aura.openSpeechStream({ onAudio: () => {}, onError: () => {} });
      const socket = lastFakeDeepgramSocket();
      socket.open();

      // Un flush et une interruption sont envoyes mais jamais confirmes
      // avant la fermeture : leurs timeouts d'accuse de reception doivent
      // etre annules par `close()`, pas seulement par leur propre expiration.
      const pendingFlush = stream.flush();
      pendingFlush.catch(() => {});
      const pendingInterrupt = stream.interrupt();
      pendingInterrupt.catch(() => {});

      void socket;
      await stream.close();
    }

    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases every observability listener registered with on()/onAny() once each stream is closed', async () => {
    type EmitterInternals = { listeners: Record<string, Set<unknown> | undefined>; anyListeners: Set<unknown> };
    const aura = new DeepgramAuraTTS({ apiKey: 'k', language: 'en' });

    for (let i = 0; i < 100; i += 1) {
      const stream = (await aura.openSpeechStream({ onAudio: () => {}, onError: () => {} })) as DeepgramAuraSpeechStream;
      stream.on('aura.warning', () => {});
      stream.onAny(() => {});
      const socket = lastFakeDeepgramSocket();
      socket.open();
      await stream.close();

      const emitter = (stream as unknown as { emitter: EmitterInternals }).emitter;
      const remaining = Object.values(emitter.listeners).reduce((total, set) => total + (set?.size ?? 0), 0);
      expect(remaining + emitter.anyListeners.size).toBe(0);
    }
  });
});
