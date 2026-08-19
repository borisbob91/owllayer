import { afterEach, describe, expect, it, vi } from 'vitest';
import { OwlLayerClient } from '../src/index.js';

class MemorySessionStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

class FakePeerConnection {
  iceGatheringState = 'complete';
  localDescription: RTCSessionDescriptionInit | null = { type: 'offer', sdp: 'offer-sdp' };
  private iceHandler: (() => void) | null = null;

  set onicegatheringstatechange(handler: (() => void) | null) {
    this.iceHandler = handler;
    setTimeout(() => this.iceHandler?.(), 0);
  }

  get onicegatheringstatechange(): (() => void) | null {
    return this.iceHandler;
  }

  createDataChannel(): RTCDataChannel {
    return {
      readyState: 'connecting',
      close: vi.fn(),
      send: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    } as unknown as RTCDataChannel;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'offer-sdp' };
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    this.localDescription = description;
  }

  async setRemoteDescription(): Promise<void> {}

  async addIceCandidate(): Promise<void> {}

  close(): void {}
}

describe('OwlLayerClient virtual lines', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('nettoie le lineToken WebRTC refuse par le serveur', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 1008,
      text: vi.fn().mockResolvedValue('lineToken invalide'),
    });
    const sessionStorage = new MemorySessionStorage();

    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection as unknown as typeof RTCPeerConnection);
    vi.stubGlobal('sessionStorage', sessionStorage);

    const client = new OwlLayerClient({
      endpoint: 'ws://localhost:4321/owllayer',
      apiKey: 'pk_test',
      transport: 'webrtc',
      virtualLines: true,
      autoReconnect: false,
    });

    (client as any)._lineToken = 'token with space';
    sessionStorage.setItem(
      'owllayer_line_ws://localhost:4321/owllayer_pk_test',
      JSON.stringify({ token: 'token with space', lineNumber: 'L1', isWaiting: false, acquiredAt: Date.now() })
    );

    await (client as any).connectWebRTC();

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:4321/owllayer/rtc?lineToken=token%20with%20space',
      expect.objectContaining({ method: 'POST' })
    );
    expect((client as any)._lineToken).toBeNull();
    expect(sessionStorage.getItem('owllayer_line_ws://localhost:4321/owllayer_pk_test')).toBeNull();
    expect(client.state).toBe('error');
  });
});
