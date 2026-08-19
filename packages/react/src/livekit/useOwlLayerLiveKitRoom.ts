'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAgent } from '../hooks/useAgent.js';

export type OwlLayerLiveKitRoomStatus =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

export interface OwlLayerLiveKitRoomTokenRequest {
  sessionId: string;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
  ttlSeconds?: number;
}

export interface OwlLayerLiveKitRoomTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  participantIdentity: string;
  expiresAt: number;
}

export interface OwlLayerLiveKitRoomLike {
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

export interface OwlLayerLiveKitRoomRuntime {
  room: OwlLayerLiveKitRoomLike;
  events?: {
    disconnected?: string | symbol;
    connectionStateChanged?: string | symbol;
    activeSpeakersChanged?: string | symbol;
  };
}

export type OwlLayerLiveKitRoomFactory =
  () => Promise<OwlLayerLiveKitRoomRuntime> | OwlLayerLiveKitRoomRuntime;

export type OwlLayerLiveKitTokenFetcher = (
  request: OwlLayerLiveKitRoomTokenRequest
) => Promise<OwlLayerLiveKitRoomTokenResponse>;

export interface UseOwlLayerLiveKitRoomOptions {
  tokenEndpoint: string;
  apiKey?: string;
  requestHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  fetchImpl?: typeof fetch;
  fetchToken?: OwlLayerLiveKitTokenFetcher;
  roomFactory?: OwlLayerLiveKitRoomFactory;
  roomName?: string;
  participantIdentity?: string;
  participantName?: string;
  ttlSeconds?: number;
  autoConnect?: boolean;
  enabled?: boolean;
  disconnectOnUnmount?: boolean;
  disconnectOnOwlLayerDisconnect?: boolean;
  microphoneEnabledOnConnect?: boolean;
}

export interface UseOwlLayerLiveKitRoomResult {
  status: OwlLayerLiveKitRoomStatus;
  connectionState: string | null;
  room: OwlLayerLiveKitRoomLike | null;
  token: OwlLayerLiveKitRoomTokenResponse | null;
  error: Error | null;
  isConnected: boolean;
  isMicrophoneEnabled: boolean;
  agentSpeaking: boolean;
  participantIdentity: string | null;
  connect: () => Promise<OwlLayerLiveKitRoomTokenResponse>;
  disconnect: () => void;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
  toggleMicrophone: () => Promise<void>;
}

export function useOwlLayerLiveKitRoom(
  options: UseOwlLayerLiveKitRoomOptions
): UseOwlLayerLiveKitRoomResult {
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
    disconnectOnOwlLayerDisconnect,
    microphoneEnabledOnConnect,
  } = options;
  const { agentState, sessionId } = useAgent();
  const [status, setStatus] = useState<OwlLayerLiveKitRoomStatus>('idle');
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const [token, setToken] = useState<OwlLayerLiveKitRoomTokenResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isMicrophoneEnabled, setIsMicrophoneEnabledState] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [participantIdentity, setParticipantIdentity] = useState<string | null>(null);
  const roomRef = useRef<OwlLayerLiveKitRoomLike | null>(null);
  const cleanupRoomListenersRef = useRef<(() => void) | null>(null);
  const connectPromiseRef = useRef<Promise<OwlLayerLiveKitRoomTokenResponse> | null>(null);

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

  const connect = useCallback(() => {
    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    const connectPromise = (async () => {
      if (!sessionId) {
        const missingSessionError = new Error('OwlLayer sessionId is required before joining a LiveKit room.');
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
    })();

    connectPromiseRef.current = connectPromise;
    const clearConnectPromise = () => {
      if (connectPromiseRef.current === connectPromise) {
        connectPromiseRef.current = null;
      }
    };
    connectPromise.then(clearConnectPromise, clearConnectPromise);

    return connectPromise;
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
    if (!disconnectOnOwlLayerDisconnect || !roomRef.current) {
      return;
    }

    if (agentState === 'disconnected' || agentState === 'error') {
      disconnect();
    }
  }, [agentState, disconnect, disconnectOnOwlLayerDisconnect]);

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

async function createDefaultLiveKitRoom(): Promise<OwlLayerLiveKitRoomRuntime> {
  const { Room, RoomEvent } = await import('livekit-client');
  return {
    room: new Room() as unknown as OwlLayerLiveKitRoomLike,
    events: {
      disconnected: RoomEvent.Disconnected,
      connectionStateChanged: RoomEvent.ConnectionStateChanged,
      activeSpeakersChanged: RoomEvent.ActiveSpeakersChanged,
    },
  };
}

async function resolveToken(
  options: UseOwlLayerLiveKitRoomOptions,
  request: OwlLayerLiveKitRoomTokenRequest
): Promise<OwlLayerLiveKitRoomTokenResponse> {
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

  return response.json() as Promise<OwlLayerLiveKitRoomTokenResponse>;
}

async function resolveHeaders(options: UseOwlLayerLiveKitRoomOptions): Promise<HeadersInit> {
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
  runtime: OwlLayerLiveKitRoomRuntime,
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
  room: OwlLayerLiveKitRoomLike,
  event: string | symbol,
  listener: (...args: unknown[]) => void
): () => void {
  room.on?.(event, listener);
  return () => {
    room.off?.(event, listener);
  };
}
