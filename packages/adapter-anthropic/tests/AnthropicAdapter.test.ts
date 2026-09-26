import { describe, it, expect, vi } from 'vitest';
import type { LLMRequest, ToolDeclaration } from '@owllayer/core';
import { AnthropicAdapter } from '../src/AnthropicAdapter.js';

const TOOLS: ToolDeclaration[] = [
  {
    name: 'fill_address',
    description: 'Remplir l adresse',
    risk: 'none',
    parameters: {
      type: 'OBJECT',
      properties: {
        city: { type: 'STRING', description: 'Ville' },
        tags: { type: 'ARRAY', items: { type: 'STRING' } },
        shipping: {
          type: 'OBJECT',
          properties: { express: { type: 'BOOLEAN' } },
          required: ['express'],
        },
      },
      required: ['city'],
    },
  },
];
const NEXT_TOOLS: ToolDeclaration[] = [
  { name: 'confirm_order', description: 'Confirmer la commande', risk: 'critical' },
];

function request(tools = TOOLS): LLMRequest {
  return {
    messages: [{ role: 'user', content: 'Livre a Paris', timestamp: 0 } as any],
    tools,
    context: { url: '/checkout', title: 'Checkout', data: {} } as any,
  };
}

function message(content: unknown[], stopReason = 'tool_use') {
  return {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-5',
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  };
}

function setup() {
  const adapter = new AnthropicAdapter({ apiKey: 'sk-test' });
  const create = vi.fn();
  (adapter as any).client = { messages: { create } };
  return { adapter, create };
}

describe('AnthropicAdapter', () => {
  it('convertit les schemas AITP en JSON Schema', async () => {
    const { adapter, create } = setup();
    create.mockResolvedValue(message([{ type: 'text', text: 'Ok' }], 'end_turn'));

    await adapter.chat(request());

    expect(create.mock.calls[0][0].tools[0].input_schema).toEqual({
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Ville' },
        tags: { type: 'array', items: { type: 'string' } },
        shipping: {
          type: 'object',
          properties: { express: { type: 'boolean' } },
          required: ['express'],
        },
      },
      required: ['city'],
    });
    expect(create.mock.calls[0][0].tool_choice).toEqual({ type: 'auto', disable_parallel_tool_use: true });
  });

  it('renvoie le tool_result a Claude et rappelle le modele avec les tools courants', async () => {
    const { adapter, create } = setup();
    create
      .mockResolvedValueOnce(
        message([
          { type: 'text', text: 'Je remplis.' },
          { type: 'tool_use', id: 'toolu_1', name: 'fill_address', input: { city: 'Paris' } },
        ])
      )
      .mockResolvedValueOnce(message([{ type: 'text', text: 'Adresse remplie.' }], 'end_turn'));

    const first = await adapter.chat(request());
    expect(first.toolCalls).toEqual([{ callId: 'toolu_1', name: 'fill_address', args: { city: 'Paris' } }]);

    const second = await adapter.handleToolResult('toolu_1', { ok: true }, NEXT_TOOLS);

    expect(second.text).toBe('Adresse remplie.');
    const params = create.mock.calls[1][0];
    expect(params.messages).toEqual([
      { role: 'user', content: 'Livre a Paris' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Je remplis.' },
          { type: 'tool_use', id: 'toolu_1', name: 'fill_address', input: { city: 'Paris' } },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{"ok":true}' }],
      },
    ]);
    expect(params.tools.map((tool: { name: string }) => tool.name)).toEqual(['confirm_order']);
    expect(params.system).toBe(create.mock.calls[0][0].system);
  });

  it('enchaine plusieurs tool results sur le meme historique', async () => {
    const { adapter, create } = setup();
    create
      .mockResolvedValueOnce(
        message([{ type: 'tool_use', id: 'toolu_1', name: 'fill_address', input: { city: 'Paris' } }])
      )
      .mockResolvedValueOnce(
        message([{ type: 'tool_use', id: 'toolu_2', name: 'confirm_order', input: {} }])
      )
      .mockResolvedValueOnce(message([{ type: 'text', text: 'Commande confirmee.' }], 'end_turn'));

    await adapter.chat(request());
    await adapter.handleToolResult('toolu_1', { ok: true }, NEXT_TOOLS);
    const last = await adapter.handleToolResult('toolu_2', { ordered: true }, NEXT_TOOLS);

    expect(last.text).toBe('Commande confirmee.');
    const roles = create.mock.calls[2][0].messages.map((m: { role: string }) => m.role);
    expect(roles).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
  });

  it('ne garde qu un tool_use par tour pour que chaque appel ait son tool_result', async () => {
    const { adapter, create } = setup();
    create
      .mockResolvedValueOnce(
        message([
          { type: 'tool_use', id: 'toolu_1', name: 'fill_address', input: { city: 'Paris' } },
          { type: 'tool_use', id: 'toolu_2', name: 'fill_address', input: { city: 'Lyon' } },
        ])
      )
      .mockResolvedValueOnce(message([{ type: 'text', text: 'Ok' }], 'end_turn'));

    const first = await adapter.chat(request());
    expect(first.toolCalls?.map((call) => call.callId)).toEqual(['toolu_1']);

    await adapter.handleToolResult('toolu_1', { ok: true });
    const assistant = create.mock.calls[1][0].messages[1];
    expect(assistant.content.filter((block: { type: string }) => block.type === 'tool_use')).toHaveLength(1);
  });

  it('signale une erreur de tool avec is_error', async () => {
    const { adapter, create } = setup();
    create
      .mockResolvedValueOnce(
        message([{ type: 'tool_use', id: 'toolu_1', name: 'fill_address', input: {} }])
      )
      .mockResolvedValueOnce(message([{ type: 'text', text: 'Action refusee.' }], 'end_turn'));

    await adapter.chat(request());
    await adapter.handleToolResult('toolu_1', { status: 'error', error: 'Action denied by user' });

    const toolResult = create.mock.calls[1][0].messages[2].content[0];
    expect(toolResult.is_error).toBe(true);
  });

  it('signale aussi une erreur serveur ({ error }) avec is_error', async () => {
    const { adapter, create } = setup();
    create
      .mockResolvedValueOnce(
        message([{ type: 'tool_use', id: 'toolu_1', name: 'fill_address', input: {} }])
      )
      .mockResolvedValueOnce(message([{ type: 'text', text: 'Delai depasse.' }], 'end_turn'));

    await adapter.chat(request());
    await adapter.handleToolResult('toolu_1', { error: 'Tool timed out' });

    expect(create.mock.calls[1][0].messages[2].content[0].is_error).toBe(true);
  });

  it('n envoie ni tools ni tool_choice sans tools declares', async () => {
    const { adapter, create } = setup();
    create.mockResolvedValue(message([{ type: 'text', text: 'Bonjour' }], 'end_turn'));

    const response = await adapter.chat(request([]));

    expect(response.text).toBe('Bonjour');
    expect(create.mock.calls[0][0]).not.toHaveProperty('tools');
    expect(create.mock.calls[0][0]).not.toHaveProperty('tool_choice');
    expect(create.mock.calls[0][0].model).toBe('claude-sonnet-5');
  });
});
