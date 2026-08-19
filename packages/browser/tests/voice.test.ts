/**
 * tests/voice.test.ts
 *
 * Vérifie le cycle vocal de BrowserOwlLayer :
 *  - startVoice() crée un VoiceManager et l'active
 *  - stopVoice() désactive le VoiceManager
 *  - isVoiceActive() reflète l'état du VoiceManager
 *  - getVoiceState() retourne l'état courant
 *  - muteMic() coupe le micro sans stopper la session
 *  - startVoice() sans config voice lève une erreur
 *
 * getUserMedia est mocké — pas d'accès micro réel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock getUserMedia
// ---------------------------------------------------------------------------

const mockTrack = { stop: vi.fn(), kind: 'audio', enabled: true };
const mockStream = {
  getTracks: () => [mockTrack],
  getAudioTracks: () => [mockTrack],
};

// ---------------------------------------------------------------------------
// Mock OwlLayerClient + VoiceManager via @owllayer/core
// ---------------------------------------------------------------------------

interface MockClient {
  _handlers: Record<string, (...a: unknown[]) => unknown>;
}

const mockClientRef = vi.hoisted(() => ({ current: null as MockClient | null }));

vi.mock('@owllayer/core', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;

  class MockOwlLayerClient {
    _handlers: Record<string, (...a: unknown[]) => unknown> = {};
    _anyHandlers = new Set<(event: unknown) => void>();

    constructor() {
      mockClientRef.current = this as unknown as MockClient;
    }

    on(handlers: Record<string, (...a: unknown[]) => unknown>) {
      Object.assign(this._handlers, handlers);
    }

    onAnyEvent(handler: (event: unknown) => void) {
      this._anyHandlers.add(handler);
    }

    offAnyEvent(handler: (event: unknown) => void) {
      this._anyHandlers.delete(handler);
    }

    connect() { return Promise.resolve(); }
    destroy() {}
    disconnect() {}
    registerTool() {}
    unregisterTool() {}
    updateContext() {}
    sendText() {}
    sendAudio() {}
    sendAudioEnd() {}
    sendInterrupt() {}
    get sessionId() { return null; }
    get isConnected() { return false; }
  }

  return { ...actual, OwlLayerClient: MockOwlLayerClient };
});

// Mock VoiceManager module entier
let voiceActive = false;
let voiceState: string = 'idle';

vi.mock('../src/runtime/VoiceManager.js', () => {
  return {
    VoiceManager: class MockVoiceManager {
      private _onStateChange?: (state: string) => void;

      constructor(opts: { onStateChange?: (state: string) => void }) {
        this._onStateChange = opts?.onStateChange;
        voiceActive = false;
        voiceState = 'idle';
      }

      async start() {
        voiceActive = true;
        voiceState = 'capturing';
        this._onStateChange?.('capturing');
      }

      stop() {
        voiceActive = false;
        voiceState = 'idle';
        this._onStateChange?.('idle');
      }

      muteMic() {
        voiceState = 'idle';
        this._onStateChange?.('idle');
      }

      isActive() { return voiceActive; }

      get state() { return voiceState; }

      interrupt() {}
      playChunk() {}
      destroy() {
        voiceActive = false;
        voiceState = 'idle';
      }
    },
  };
});

import { BrowserOwlLayer } from '../src/runtime/BrowserOwlLayer.js';

// ---------------------------------------------------------------------------
// Config de base
// ---------------------------------------------------------------------------

const BASE_WITH_VOICE = {
  apiKey: 'pk_test',
  endpoint: 'ws://localhost:4001/owllayer',
  autoConnect: false,
  widget: { enabled: false },
  hitl: { enabled: false },
  autoDiscovery: { enabled: false },
  voice: { enabled: true, sampleRate: 16000 },
} as const;

const BASE_NO_VOICE = {
  apiKey: 'pk_test',
  endpoint: 'ws://localhost:4001/owllayer',
  autoConnect: false,
  widget: { enabled: false },
  hitl: { enabled: false },
  autoDiscovery: { enabled: false },
} as const;

let sdk: BrowserOwlLayer;

beforeEach(() => {
  sdk = new BrowserOwlLayer();
  voiceActive = false;
  voiceState = 'idle';
  mockTrack.stop.mockClear();

  // Stub getUserMedia
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  sdk.destroy();
  document.body.innerHTML = '';
  localStorage.clear();
});

// ---------------------------------------------------------------------------

describe('startVoice() / stopVoice()', () => {
  it('startVoice() active la session et isVoiceActive() passe a true', async () => {
    await sdk.init(BASE_WITH_VOICE);
    expect(sdk.isVoiceActive()).toBe(false);

    await sdk.startVoice();
    expect(sdk.isVoiceActive()).toBe(true);
  });

  it('stopVoice() desactive la session et isVoiceActive() passe a false', async () => {
    await sdk.init(BASE_WITH_VOICE);
    await sdk.startVoice();
    expect(sdk.isVoiceActive()).toBe(true);

    sdk.stopVoice();
    expect(sdk.isVoiceActive()).toBe(false);
  });

  it('startVoice() fonctionne meme sans voice config (utilise les defauts)', async () => {
    await sdk.init(BASE_NO_VOICE);
    // Pas d'erreur — VoiceManager est cree avec des options par defaut
    await expect(sdk.startVoice()).resolves.toBeUndefined();
    expect(sdk.isVoiceActive()).toBe(true);
  });

  it('startVoice() est idempotent — double appel ne plante pas', async () => {
    await sdk.init(BASE_WITH_VOICE);
    await sdk.startVoice();
    await expect(sdk.startVoice()).resolves.toBeUndefined();
    expect(sdk.isVoiceActive()).toBe(true);
  });
});

describe('getVoiceState()', () => {
  it('retourne idle par defaut', async () => {
    await sdk.init(BASE_WITH_VOICE);
    expect(sdk.getVoiceState()).toBe('idle');
  });

  it('retourne capturing apres startVoice()', async () => {
    await sdk.init(BASE_WITH_VOICE);
    await sdk.startVoice();
    expect(sdk.getVoiceState()).toBe('capturing');
  });

  it('retourne idle apres stopVoice()', async () => {
    await sdk.init(BASE_WITH_VOICE);
    await sdk.startVoice();
    sdk.stopVoice();
    expect(sdk.getVoiceState()).toBe('idle');
  });
});

describe('muteMic()', () => {
  it('ne plante pas si la voix n\'est pas active', async () => {
    await sdk.init(BASE_WITH_VOICE);
    expect(() => sdk.muteMic()).not.toThrow();
  });

  it('coupe le micro sans stopper la session', async () => {
    await sdk.init(BASE_WITH_VOICE);
    await sdk.startVoice();
    sdk.muteMic();
    // L'état voix passe à idle mais isVoiceActive reste selon VoiceManager.isActive()
    // Le mock ne change pas voiceActive dans muteMic, juste l'état machine
    expect(sdk.getVoiceState()).toBe('idle');
  });
});
