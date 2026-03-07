import { describe, it, expect } from 'vitest';
import {
  Messages,
  encode,
  decode,
  tryDecode,
  validateMessage,
  MessageType,
} from '../src/index.js';

describe('ADTP Protocol', () => {
  describe('Messages factory', () => {
    it('cree un HANDSHAKE_INIT valide', () => {
      const msg = Messages.handshakeInit('pk_test_123', 'Chrome', '1920x1080', '0.1.0', '1.0.0');

      expect(msg.type).toBe(MessageType.HANDSHAKE_INIT);
      expect(msg.payload.apiKey).toBe('pk_test_123');
      expect(msg.payload.sdkVersion).toBe('0.1.0');
      expect(msg.payload.protocolVersion).toBe('1.0.0');
      expect(msg.id).toBeDefined();
      expect(msg.timestamp).toBeGreaterThan(0);
    });

    it('cree un USER_INPUT texte', () => {
      const msg = Messages.userInputText('Bonjour');

      expect(msg.type).toBe(MessageType.USER_INPUT);
      expect(msg.payload.modality).toBe('text');
      expect(msg.payload.content).toBe('Bonjour');
    });

    it('cree un USER_INPUT audio', () => {
      const msg = Messages.userInputAudio('base64data', 'audio/pcm;rate=16000');

      expect(msg.type).toBe(MessageType.USER_INPUT);
      expect(msg.payload.modality).toBe('audio');
      expect(msg.payload.mimeType).toBe('audio/pcm;rate=16000');
    });

    it('cree un TOOL_CALL', () => {
      const msg = Messages.toolCall('call_1', 'add_to_cart', { product_id: '123' });

      expect(msg.type).toBe(MessageType.TOOL_CALL);
      expect(msg.payload.name).toBe('add_to_cart');
      expect(msg.payload.args.product_id).toBe('123');
    });

    it('cree un TOOL_RESULT success', () => {
      const msg = Messages.toolResult('call_1', { added: true }, 'success');

      expect(msg.type).toBe(MessageType.TOOL_RESULT);
      expect(msg.payload.status).toBe('success');
    });

    it('cree un AGENT_RESPONSE streaming', () => {
      const msg = Messages.agentResponse('Bonjour, je', false);

      expect(msg.payload.chunk).toBe('Bonjour, je');
      expect(msg.payload.done).toBe(false);
    });

    it('cree un SYSTEM_EVENT', () => {
      const msg = Messages.systemEvent('error', 'Connexion perdue');

      expect(msg.payload.kind).toBe('error');
      expect(msg.payload.message).toBe('Connexion perdue');
    });
  });

  describe('Serialization', () => {
    it('encode et decode un message', () => {
      const original = Messages.userInputText('Test');
      const encoded = encode(original);
      const decoded = decode(encoded);

      expect(decoded.type).toBe(original.type);
      expect(decoded.id).toBe(original.id);
      expect(decoded.payload).toEqual(original.payload);
    });

    it('tryDecode retourne null pour du JSON invalide', () => {
      expect(tryDecode('not json')).toBeNull();
    });

    it('tryDecode retourne null pour un message ADTP invalide', () => {
      expect(tryDecode('{"foo":"bar"}')).toBeNull();
    });

    it('decode throw pour du JSON invalide', () => {
      expect(() => decode('not json')).toThrow('invalid JSON');
    });
  });

  describe('Validation', () => {
    it('valide un message correct', () => {
      const msg = Messages.toolCall('call_1', 'search', { query: 'test' });
      const result = validateMessage(msg);

      expect(result.success).toBe(true);
    });

    it('rejette un message sans id', () => {
      const result = validateMessage({
        type: 'USER_INPUT',
        timestamp: Date.now(),
        payload: { modality: 'text', content: 'test' },
      });

      expect(result.success).toBe(false);
    });

    it('rejette un message avec type inconnu', () => {
      const result = validateMessage({
        id: 'test',
        type: 'UNKNOWN_TYPE',
        timestamp: Date.now(),
        payload: {},
      });

      expect(result.success).toBe(false);
    });

    it('rejette un payload invalide', () => {
      const result = validateMessage({
        id: 'test',
        type: MessageType.USER_INPUT,
        timestamp: Date.now(),
        payload: { modality: 'invalid', content: 123 },
      });

      expect(result.success).toBe(false);
    });
  });
});
