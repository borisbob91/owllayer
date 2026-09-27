// Conversion des tools AITP vers les fonctions du Voice Agent (S6) : jamais
// d'endpoint, jamais de niveau de risque envoye, `defer_until_eot` pour high/critical.
import { describe, expect, it } from 'vitest';
import type { ToolDeclaration } from '@owllayer/core';
import { toDeepgramAgentFunctions } from '../src/toolConverter.js';

describe('toDeepgramAgentFunctions (S6)', () => {
  it('converts AITP parameter types to a JSON Schema, recursively', () => {
    const tool: ToolDeclaration = {
      name: 'add_to_cart',
      description: 'Add a product to the cart.',
      parameters: {
        type: 'OBJECT',
        properties: {
          productId: { type: 'STRING', description: 'Product id' },
          quantity: { type: 'NUMBER' },
          giftWrap: { type: 'BOOLEAN' },
          size: { type: 'STRING', enum: ['S', 'M'] },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
          address: {
            type: 'OBJECT',
            properties: { city: { type: 'STRING' } },
            required: ['city'],
          },
        },
        required: ['productId'],
      },
    };

    expect(toDeepgramAgentFunctions([tool])).toEqual([
      {
        name: 'add_to_cart',
        description: 'Add a product to the cart.',
        parameters: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: 'Product id' },
            quantity: { type: 'number' },
            giftWrap: { type: 'boolean' },
            size: { type: 'string', enum: ['S', 'M'] },
            tags: { type: 'array', items: { type: 'string' } },
            address: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
          },
          required: ['productId'],
        },
      },
    ]);
  });

  it('uses an empty object schema when the tool has no parameters', () => {
    expect(toDeepgramAgentFunctions([{ name: 'ping', description: 'Ping.' }])).toEqual([
      { name: 'ping', description: 'Ping.', parameters: { type: 'object', properties: {} } },
    ]);
  });

  it('defers only high and critical tools until the end of turn', () => {
    const risks = ['none', 'low', 'high', 'critical', undefined] as const;
    const functions = toDeepgramAgentFunctions(risks.map((risk, i) => ({ name: `t${i}`, description: 'd', risk })));

    expect(functions.map((fn) => fn.defer_until_eot)).toEqual([undefined, undefined, true, true, undefined]);
  });

  it('never sends an endpoint, a client_side flag or the risk level', () => {
    const [fn] = toDeepgramAgentFunctions([{ name: 'refund', description: 'Refund.', risk: 'critical' }]);

    expect(Object.keys(fn!).sort()).toEqual(['defer_until_eot', 'description', 'name', 'parameters']);
  });
});
