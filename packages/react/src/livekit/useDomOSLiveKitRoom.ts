'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgent } from '../hooks/useAgent.js';

export type DomOSLiveKitRoomStatus =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

export interface DomOSLiveKitRoomTokenRequest {
  sessionId: string;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
  ttlSeconds?: number;
}

export interface DomOSLiveKitRoomTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  participantIdentity: string;
  expiresAt: number;
}

export interface DomOSLiveKitRoomLike {
  connect(url: string, token: string): Promise<void>;
  disconnect(): void;
  on?: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
  off?: (event: string | symbol, listener: (...args: unknown[]) => void) => unknown;
  localParticipant?: {
    setMicrophoneEnabled(enabled: boolean): Promise<void>;
    identity?: string;
  };
  state?: string;
  activeSpeakers?: Array<{ identity: string }>;
}

export interface DomOSLiveKitRoomRuntime {
  room: DomOSLiveKitRoomLike;
  events?: {
    disconnected?: string | symbol;
    connectionStateChanged?: string | symbol;
    activeSpeakersChanged?: string | symbol;
  };
}

export type DomOSLiveKitRoomFactory =
  () => Promise<DomOSLiveKitRoomRuntime> | DomOSLiveKitRoomRuntime;

export type DomOSLiveKitTokenFetcher = (
  request: DomOSLiveKitRoomTokenRequest
) => Promise<DomOSLiveKitRoomTokenResponse>;

export interface UseDomOSLiveKitRoomOptions {
  tokenEndpoint: string;
  apiKey?: string;
  requestHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  fetchImpl?: typeof fetch;
  fetchToken?: DomOSLiveKitTokenFetcher;
  roomFactory?: DomOSLiveKitRoomFactory;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
  ttlSeconds?: number;
  autoConnect?: boolean;
  enabled?: boolean;
  disconnectOnUnmount?: boolean;
  disconnectOnDomOSDisconnect?: boolean;
  microphoneEnabledOnConnect?: boolean;
}

export interface UseDomOSLiveKitRoomResult {
  status: DomOSLiveKitRoomStatus;
  connectionState: string | null;
  room: DomOSLiveKitRoomLike | null;
  token: DomOSLiveKitRoomTokenResponse | null;
  error: Error | null;
  isConnected: boolean;
  isMicrophoneEnabled: boolean;
  agentSpeaking: boolean;
  participantIdentity: string | null;
  connect: () => Promise<DomOSLiveKitRoomTokenResponse>;
  disconnect: () => void;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  toggleMicrophone: () => Promise<void>;
}

export function useDomOSLiveKitRoom(
  options: UseDomOSLiveKitRoomOptions
): UseDomOSLiveKitRoomResult {
  const {
    tokenEndpoint,
    apiKey,
    requestHeaders,
    fetchImpl,
    fetchToken,
    roomFactory,
    roomName,
    participantIdentity: optParticipantIdentity,
    participantName,
    ttlSeconds,
    autoConnect,
    enabled,
    disconnectOnUnmount,
    disconnectOnDomOSDisconnect,
    microphoneEnabledOnConnect,
  } = options;
  const { agentState, sessionId } = useAgent();
  const [status, setStatus] = useState<DomOSLiveKitRoomStatus>('idle');
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [token, setToken] = useState<DomOSLiveKitRoomTokenResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isMicrophoneEnabled, setIsMicrophoneEnabledState] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [participantIdentity, setParticipantIdentity] = useState<string | null>(null);
  const roomRef = useRef<DomOSLiveKitRoomLike | null>(null);
  const cleanupRoomListenersRef = useRef<(() => void) | null>(null);

  const disconnectRoom = useCallback((updateState: boolean) => {
    const room = roomRef.current;
    cleanupRoomListenersRef.current?.();
    cleanupRoomListenersRef.current = null;

    if (room) {
      if (updateState) {
        setStatus('disconnecting');
      }
      room.disconnect();
    }

    roomRef.current = null;
    if (updateState) {
      setConnectionState(null);
      setIsMicrophoneEnabledState(false);
      setAgentSpeaking(false);
      setParticipantIdentity(null);
      setStatus('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectRoom(true);
  }, [disconnectRoom]);

  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    const room = roomRef.current;
    if (!room?.localParticipant?.setMicrophoneEnabled) {
      throw new Error('LiveKit room is not connected or microphone control is unavailable.');
    }

    await room.localParticipant.setMicrophoneEnabled(enabled);
    setIsMicrophoneEnabledState(enabled);
  }, []);

  const connect = useCallback(async () => {
    if (!sessionId) {
      const missingSessionError = new Error('DomOS sessionId is required before joining a LiveKit room.');
      setError(missingSessionError);
      setStatus('error');
      throw missingSessionError;
    }

    setError(null);
    setStatus('requesting-token');

    try {
      const nextToken = await resolveToken(
        { tokenEndpoint, apiKey, requestHeaders, fetchImpl, fetchToken },
        {
          sessionId,
          roomName,
          participantIdentity: optParticipantIdentity,
          participantName,
          ttlSeconds,
        }
      );
      setToken(nextToken);

      cleanupRoomListenersRef.current?.();
      const runtime = await (roomFactory ?? createDefaultLiveKitRoom)();
      roomRef.current = runtime.room;
      cleanupRoomListenersRef.current = attachRoomListeners(runtime, {
        onDisconnected: () => {
          roomRef.current = null;
          setConnectionState(null);
          setIsMicrophoneEnabledState(false);
          setAgentSpeaking(false);
          setParticipantIdentity(null);
          setStatus('disconnected');
        },
        onConnectionStateChanged: (state) => {
          setConnectionState(String(state));
        },
        onActiveSpeakersChanged: (speakers) => {
          const agentIdentity = participantIdentity || nextToken.participantIdentity;
          setAgentSpeaking(
            Array.isArray(speakers) && speakers.length > 0 &&
            (speakers as Array<{ identity: string }>).some(
              (s) => s.identity !== agentIdentity
            )
          );
        },
      });

      setStatus('connecting');
      await runtime.room.connect(nextToken.livekitUrl, nextToken.token);
      setConnectionState(runtime.room.state ?? 'connected');
      setStatus('connected');
      setParticipantIdentity(nextToken.participantIdentity);

      if (microphoneEnabledOnConnect) {
        await runtime.room.localParticipant?.setMicrophoneEnabled(true);
        setIsMicrophoneEnabledState(true);
      }

      return nextToken;
    } catch (cause) {
      cleanupRoomListenersRef.current?.();
      cleanupRoomListenersRef.current = null;
      roomRef.current?.disconnect();
      roomRef.current = null;
      setAgentSpeaking(false);
      setParticipantIdentity(null);

      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      setStatus('error');
      throw nextError;
    }
  }, [
    sessionId,
    tokenEndpoint,
    apiKey,
    requestHeaders,
    fetchImpl,
    fetchToken,
    roomFactory,
    roomName,
    optParticipantIdentity,
    participantName,
    ttlSeconds,
    microphoneEnabledOnConnect,
  ]);

  const toggleMicrophone = useCallback(async () => {
    await setMicrophoneEnabled(!isMicrophoneEnabled);
  }, [isMicrophoneEnabled, setMicrophoneEnabled]);

  useEffect(() => {
    if (enabled === false || !autoConnect || !sessionId) {
      return;
    }

    void connect();
  }, [autoConnect, connect, enabled, sessionId]);

  useEffect(() => {
    return () => {
      if (disconnectOnUnmount !== false) {
        disconnectRoom(false);
      }
    };
  }, [disconnectOnUnmount, disconnectRoom]);

  useEffect(() => {
    if (!disconnectOnDomOSDisconnect || !roomRef.current) {
      return;
    }

    if (agentState === 'disconnected' || agentState === 'error') {
      disconnect();
    }
  }, [agentState, disconnect, disconnectOnDomOSDisconnect]);

  return {
    status,
    connectionState,
    room: roomRef.current,
    token,
    error,
    isConnected: status === 'connected',
    isMicrophoneEnabled,
    agentSpeaking,
    participantIdentity,
    connect,
    disconnect,
    setMicrophoneEnabled,
    toggleMicrophone,
  };
}

async function createDefaultLiveKitRoom(): Promise<DomOSLiveKitRoomRuntime> {
  const { Room, RoomEvent } = await import('livekit-client');
  return {
    room: new Room() as unknown as DomOSLiveKitRoomLike,
    events: {
      disconnected: RoomEvent.Disconnected,
      connectionStateChanged: RoomEvent.ConnectionStateChanged,
      activeSpeakersChanged: RoomEvent.ActiveSpeakersChanged,
    },
  };
}

async function resolveToken(
  options: UseDomOSLiveKitRoomOptions,
  request: DomOSLiveKitRoomTokenRequest
): Promise<DomOSLiveKitRoomTokenResponse> {
  if (options.fetchToken) {
    return options.fetchToken(request);
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error('fetch is required to request a LiveKit room token.');
  }

  const headers = await resolveHeaders(options);
  const response = await fetchImpl(options.tokenEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`LiveKit token request failed with status ${response.status}.`);
  }

  return response.json() as Promise<DomOSLiveKitRoomTokenResponse>;
}

async function resolveHeaders(options: UseDomOSLiveKitRoomOptions): Promise<HeadersInit> {
  const customHeaders = typeof options.requestHeaders === 'function'
    ? await options.requestHeaders()
    : options.requestHeaders;
  const headers = new Headers(customHeaders);
  headers.set('Content-Type', 'application/json');

  if (options.apiKey && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${options.apiKey}`);
  }

  return headers;
}

function attachRoomListeners(
  runtime: DomOSLiveKitRoomRuntime,
  listeners: {
    onDisconnected: () => void;
    onConnectionStateChanged: (state: unknown) => void;
    onActiveSpeakersChanged?: (speakers: unknown[]) => void;
  }
): () => void {
  const removers: Array<() => void> = [];
  const { room, events } = runtime;

  if (events?.disconnected) {
    removers.push(addRoomListener(room, events.disconnected, listeners.onDisconnected));
  }

  if (events?.connectionStateChanged) {
    removers.push(addRoomListener(room, events.connectionStateChanged, listeners.onConnectionStateChanged));
  }

  if (events?.activeSpeakersChanged && listeners.onActiveSpeakersChanged) {
    const fn = listeners.onActiveSpeakersChanged;
    removers.push(addRoomListener(room, events.activeSpeakersChanged, (...args) => {
      const speakers = Array.isArray(args[0]) ? args[0] : args;
      fn(speakers as unknown[]);
    }));
  }

  return () => {
    for (const remove of removers) {
      remove();
    }
  };
}

function addRoomListener(
  room: DomOSLiveKitRoomLike,
  event: string | symbol,
  listener: (...args: unknown[]) => void
): () => void {
  room.on?.(event, listener);
  return () => {
    room.off?.(event, listener);
  };
}
