import { useRef, useCallback, useEffect } from 'react';
import {
  encode,
  tryDecode,
  Messages,
  MessageType,
  AITP_VERSION,
  SDK_VERSION,
  createLogger,
  type AITPMessage,
} from '@owllayer/core';
import type { AgentState } from './OwlLayerContext.js';

const log = createLogger('OwlLayer:Connection');

export interface UseConnectionOptions {
  endpoint: string;
  apiKey: string;
  debug?: boolean;
  onMessage: (message: AITPMessage) => void;
  onStateChange: (state: AgentState) => void;
  onSessionId: (sessionId: string) => void;
}

/**
 * Hook interne : gere la connexion WebSocket AITP.
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
        SDK_VERSION,
        AITP_VERSION
      );
      ws.send(encode(handshake));
    };

    ws.onmessage = (event) => {
      const message = tryDecode(event.data);
      if (!message) {
        log.warn('Message invalide recu');
        return;
      }

      if (message.type === MessageType.HANDSHAKE_ACK) {
        const payload = message.payload as any;
        log.info(`Handshake ACK recu, session: ${payload.sessionId}`);
        options.onSessionId(payload.sessionId);
        options.onStateChange('connected');
      }

      options.onMessage(message);
    };

    ws.onclose = (event) => {
      log.info(`WebSocket deconnecte (code: ${event.code})`);
      options.onStateChange('disconnected');

      // Reconnexion automatique si pas fermeture normale
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
        log.info(`Reconnexion dans ${delay}ms (tentative ${reconnectAttempts.current}/${maxReconnectAttempts})`);
        setTimeout(connect, delay);
      }
    };

    ws.onerror = (error) => {
      log.error('Erreur WebSocket:', error);
      options.onStateChange('error');
    };
  }, [options.endpoint, options.apiKey]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: AITPMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(encode(message));
      return true;
    }
    log.warn('Impossible d\'envoyer: WebSocket non connecte');
    return false;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    send,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
