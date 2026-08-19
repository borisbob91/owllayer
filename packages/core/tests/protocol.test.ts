import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  SDK_VERSION,
  Messages,
  encode,
  decode,
  tryDecode,
  validateMessage,
  MessageType,
  zodToToolParameters,
} from '../src/index.js';

const packageVersion = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

describe('AITP Protocol', () => {
  it('expose la version du package dans le handshake', () => {
    expect(SDK_VERSION).toBe(packageVersion);
  });

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

    it('cree un TOOL_RESULT error serialisable sans resultat metier', () => {
      const msg = Messages.toolResult('call_1', undefined, 'error', 'Tool failed');
      const decoded = decode(encode(msg));

      expect(decoded.type).toBe(MessageType.TOOL_RESULT);
      if (decoded.type === MessageType.TOOL_RESULT) {
        expect(decoded.payload.status).toBe('error');
        expect(decoded.payload.result).toBeNull();
        expect(decoded.payload.error).toBe('Tool failed');
      }
    });

    it('cree un TOOL_RESULT pending_approval serialisable sans resultat metier', () => {
      const msg = Messages.toolResult('call_2', undefined, 'pending_approval');
      const decoded = decode(encode(msg));

      expect(decoded.type).toBe(MessageType.TOOL_RESULT);
      if (decoded.type === MessageType.TOOL_RESULT) {
        expect(decoded.payload.status).toBe('pending_approval');
        expect(decoded.payload.result).toBeNull();
      }
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

    it('cree un SYSTEM_EVENT tools_effective', () => {
      const msg = Messages.systemEvent('tools_effective', 'Surface mise a jour', {
        effectiveTools: [{ name: 'server_search', description: 'Search' }],
        serverTools: [{ name: 'server_search', description: 'Search' }],
        clientTools: [{ name: 'client_filter', description: 'Filter' }],
        ignoredClientTools: [],
      });

      expect(msg.payload.kind).toBe('tools_effective');
      expect(validateMessage(msg).success).toBe(true);
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

    it('tryDecode retourne null pour un message AITP invalide', () => {
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

    it('valide un CONTEXT_UPDATE avec un parametre ARRAY et items', () => {
      const msg = Messages.contextUpdate('/search', [
        {
          name: 'search_products',
          description: 'Search products by tags',
          parameters: {
            type: 'OBJECT',
            properties: {
              tags: {
                type: 'ARRAY',
                description: 'Tags',
                items: { type: 'STRING' },
              },
            },
            required: ['tags'],
          },
          risk: 'none',
        },
      ]);

      const result = validateMessage(msg);

      expect(result.success).toBe(true);
      if (result.success) {
        const tool = (result.data as any).payload.activeTools[0];
        expect(tool.parameters.properties.tags.items).toEqual({ type: 'STRING' });
      }
    });

    it('convertit les schemas Zod array en ToolParameters avec items', () => {
      const params = zodToToolParameters(z.object({
        tags: z.array(z.string()).describe('Tags'),
        quantities: z.array(z.number()).optional(),
      }));

      expect(params.properties.tags).toMatchObject({
        type: 'ARRAY',
        items: { type: 'STRING' },
      });
      expect(params.properties.quantities).toMatchObject({
        type: 'ARRAY',
        items: { type: 'NUMBER' },
      });
      expect(params.required).toEqual(['tags']);
    });

    it('rejette le legacy SYSTEM_EVENT rate_limit', () => {
      const result = validateMessage({
        id: 'test',
        type: MessageType.SYSTEM_EVENT,
        timestamp: Date.now(),
        payload: { kind: 'rate_limit', message: 'legacy' },
      });

      expect(result.success).toBe(false);
    });
  });
});
