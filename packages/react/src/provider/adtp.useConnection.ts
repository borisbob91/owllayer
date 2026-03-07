import { useRef, useCallback, useEffect } from 'react';
import {
  encode,
  tryDecode,
  Messages,
  MessageType,
  SDK_VERSION,
  createLogger,
  type ADTPMessage,
} from '@domos/core';
import type { AgentState } from './DomOSContext.js';

const log = createLogger('DomOS:Connection');

export interface UseConnectionOptions {
  endpoint: string;
  apiKey: string;
  debug?: boolean;
  onMessage: (message: ADTPMessage) => void;
  onStateChange: (state: AgentState) => void;
  onSessionId: (sessionId: string) => void;
}

/**
 * Hook interne : gere la connexion WebSocket ADTP.
 * Reconnexion automatique, heartbeat, encode/decode.
 */
export function useConnection(options: UseConnectionOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    options.onStateChange('connecting');

    const url = `${options.endpoint}?apiKey=${encodeURIComponent(options.apiKey)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      log.info('WebSocket connecte');
      reconnectAttempts.current = 0;

      // Envoyer le HANDSHAKE_INIT
      const handshake = Messages.handshakeInit(
        options.apiKey,
        navigator.userAgent,
        `${window.innerWidth}x${window.innerHeight}`,
        SDK_VERSION
      );
      ws.send(encode(handshake));
    };

    ws.onmessage = (event) => {
      const message = tryDecode(event.data);
      if (!message) {
        log.warn('Message invalide recu:', event.data.toString().slice(0, 100));
        return;
      }

      if (options.debug) {
        log.debug('Message recu:', message.type, message.payload);
      }

      // Gerer le HANDSHAKE_ACK
      if (message.type === MessageType.HANDSHAKE_ACK) {
        const payload = message.payload as any;
        options.onSessionId(payload.sessionId);
        options.onStateChange('connected');
        log.info(`Session etablie: ${payload.sessionId}`);
        return;
      }

      // Gerer les SYSTEM_EVENT
      if (message.type === MessageType.SYSTEM_EVENT) {
        const payload = message.payload as any;
        if (payload.kind === 'error') {
          log.error('System event error:', payload.message);
        }
        if (payload.kind === 'disconnect') {
          ws.close();
          return;
        }
      }

      options.onMessage(message);
    };

    ws.onclose = (event) => {
      log.info(`WebSocket ferme (code: ${event.code})`);
      wsRef.current = null;
      options.onStateChange('disconnected');

      // Reconnexion automatique (sauf fermeture volontaire)
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = reconnectDelay * reconnectAttempts.current;
        log.info(`Reconnexion dans ${delay}ms (tentative ${reconnectAttempts.current})`);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (event) => {
      log.error('WebSocket erreur');
      options.onStateChange('error');
    };
  }, [options.endpoint, options.apiKey]);

  const disconnect = useCallback(() => {
    reconnectAttempts.current = maxReconnectAttempts; // Empecher la reconnexion
    wsRef.current?.close(1000, 'Client disconnect');
    wsRef.current = null;
    options.onStateChange('disconnected');
  }, []);

  const send = useCallback((message: ADTPMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log.warn('Impossible d\'envoyer: WebSocket ferme');
      return false;
    }

    if (options.debug) {
      log.debug('Message envoye:', message.type);
    }

    ws.send(encode(message));
    return true;
  }, [options.debug]);

  // Cleanup a l'unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close(1000, 'Component unmount');
    };
  }, []);

  return { connect, disconnect, send };
}
