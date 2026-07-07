import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DomOSContext, type DomOSContextValue } from '../src/provider/DomOSContext.js';
import {
  useDomOSLiveKitRoom,
  type DomOSLiveKitRoomLike,
} from '../src/livekit/useDomOSLiveKitRoom.js';

function createContext(overrides: Partial<DomOSContextValue> = {}): DomOSContextValue {
  return {
    agentState: 'connected',
    sessionId: 'sess_123',
    shadowContext: {} as any,
    registerTool: vi.fn(),
    unregisterTool: vi.fn(),
    unregisterToolsByComponent: vi.fn(),
    getRegisteredTools: vi.fn(() => []),
    toolSurface: {
      effectiveTools: [],
      serverTools: [],
      clientTools: [],
      ignoredClientTools: [],
    },
    getEffectiveTools: vi.fn(() => []),
    getIgnoredClientTools: vi.fn(() => []),
    callTool: vi.fn(),
    getInstalledPlugins: vi.fn(() => []),
    subscribeEvent: vi.fn(() => vi.fn()),
    subscribeAnyEvent: vi.fn(() => vi.fn()),
    updateContext: vi.fn(),
    sendText: vi.fn(),
    sendAudio: vi.fn(),
    sendAudioStream: vi.fn(),
    sendAudioEnd: vi.fn(),
    sendInterrupt: vi.fn(),
    pendingApproval: null,
    lastResponse: null,
    voiceEnabled: false,
    setVoiceEnabled: vi.fn(),
    debug: false,
    lineNumber: null,
    isWaiting: false,
    lineState: 'idle',
    agentError: null,
    clearAgentError: vi.fn(),
    ...overrides,
  };
}

function createWrapper(ctx: DomOSContextValue) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(DomOSContext.Provider, { value: ctx }, children);
  };
}

function createRoomMock() {
  const listeners = new Map<string | symbol, (...args: unknown[]) => void>();
  const room: DomOSLiveKitRoomLike = {
    state: 'connected',
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(),
    on: vi.fn((event, listener) => {
      listeners.set(event, listener);
    }),
    off: vi.fn((event) => {
      listeners.delete(event);
    }),
    localParticipant: {
      setMicrophoneEnabled: vi.fn(async () => undefined),
    },
  };

  return { room, listeners };
}

describe('useDomOSLiveKitRoom', () => {
  it('requests a room token with the DomOS session id then connects the LiveKit room', async () => {
    const ctx = createContext();
    const { room } = createRoomMock();
    const fetchToken = vi.fn(async () => ({
      token: 'signed-token',
      livekitUrl: 'wss://livekit.example.com',
      roomName: 'domos-sess_123',
      participantIdentity: 'domos-user-sess_123',
      expiresAt: 1_700_000_300_000,
    }));

    const { result } = renderHook(
      () => useDomOSLiveKitRoom({
        tokenEndpoint: '/domos/livekit/token',
        fetchToken,
        roomFactory: () => ({ room }),
      }),
      { wrapper: createWrapper(ctx) }
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(fetchToken).toHaveBeenCalledWith({
      sessionId: 'sess_123',
      roomName: undefined,
      participantIdentity: undefined,
      participantName: undefined,
      ttlSeconds: undefined,
    });
    expect(room.connect).toHaveBeenCalledWith('wss://livekit.example.com', 'signed-token');
    expect(result.current.status).toBe('connected');
    expect(ctx.registerTool).not.toHaveBeenCalled();
    expect(ctx.updateContext).not.toHaveBeenCalled();
  });

  it('disconnects only the LiveKit room and leaves DomOS ADTP actions untouched', async () => {
    const ctx = createContext();
    const { room } = createRoomMock();
    const { result } = renderHook(
      () => useDomOSLiveKitRoom({
        tokenEndpoint: '/domos/livekit/token',
        fetchToken: async () => ({
          token: 'signed-token',
          livekitUrl: 'wss://livekit.example.com',
          roomName: 'domos-sess_123',
          participantIdentity: 'domos-user-sess_123',
          expiresAt: 1_700_000_300_000,
        }),
        roomFactory: () => ({ room }),
      }),
      { wrapper: createWrapper(ctx) }
    );

    await act(async () => {
      await result.current.connect();
    });
    act(() => {
      result.current.disconnect();
    });

    expect(room.disconnect).toHaveBeenCalledTimes(1);
    expect(ctx.sendText).not.toHaveBeenCalled();
    expect(ctx.sendAudioEnd).not.toHaveBeenCalled();
    expect(result.current.status).toBe('disconnected');
  });

  it('exposes microphone mute state through the room local participant', async () => {
    const { room } = createRoomMock();
    const { result } = renderHook(
      () => useDomOSLiveKitRoom({
        tokenEndpoint: '/domos/livekit/token',
        fetchToken: async () => ({
          token: 'signed-token',
          livekitUrl: 'wss://livekit.example.com',
          roomName: 'domos-sess_123',
          participantIdentity: 'domos-user-sess_123',
          expiresAt: 1_700_000_300_000,
        }),
        roomFactory: () => ({ room }),
      }),
      { wrapper: createWrapper(createContext()) }
    );

    await act(async () => {
      await result.current.connect();
      await result.current.setMicrophoneEnabled(true);
    });

    expect(room.localParticipant?.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(result.current.isMicrophoneEnabled).toBe(true);
  });

  it('can disconnect the LiveKit room when the DomOS session disconnects', async () => {
    let ctx = createContext({ agentState: 'connected' });
    const { room } = createRoomMock();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(DomOSContext.Provider, { value: ctx }, children);
    const { result, rerender } = renderHook(
      () => useDomOSLiveKitRoom({
        tokenEndpoint: '/domos/livekit/token',
        disconnectOnDomOSDisconnect: true,
        fetchToken: async () => ({
          token: 'signed-token',
          livekitUrl: 'wss://livekit.example.com',
          roomName: 'domos-sess_123',
          participantIdentity: 'domos-user-sess_123',
          expiresAt: 1_700_000_300_000,
        }),
        roomFactory: () => ({ room }),
      }),
      { wrapper }
    );

    await act(async () => {
      await result.current.connect();
    });

    ctx = createContext({ agentState: 'disconnected' });
    rerender();

    expect(room.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('disconnected');
  });

  it('refuses to join a LiveKit room before DomOS has a session id', async () => {
    const { result } = renderHook(
      () => useDomOSLiveKitRoom({
        tokenEndpoint: '/domos/livekit/token',
        fetchToken: vi.fn(),
        roomFactory: () => ({ room: createRoomMock().room }),
      }),
      { wrapper: createWrapper(createContext({ sessionId: null })) }
    );

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.connect();
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('sessionId is required');
    expect(result.current.status).toBe('error');
  });
});
