import { describe, it, expect, vi } from 'vitest';
import type { ToolDeclaration } from '@owllayer/core';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';

const HOME_TOOLS: ToolDeclaration[] = [
  { name: 'go_to_checkout', description: 'Aller au checkout', risk: 'none' },
];
const CHECKOUT_TOOLS: ToolDeclaration[] = [
  { name: 'fill_address', description: 'Remplir l adresse', risk: 'none' },
];

function setup() {
  const llm = {
    name: 'mock-llm',
    chat: vi.fn(),
    handleToolResult: vi.fn(),
  };
  const server = new OwlLayerServer({ llm } as any);
  const send = vi.fn().mockReturnValue(true);
  (server as any).transport = { send };
  (server as any).security = { check: vi.fn().mockReturnValue({ allowed: true }) };

  let tools = HOME_TOOLS;
  const route = vi.fn().mockImplementation(async (_session: unknown, name: string) => {
    // La navigation change la surface de tools de la session
    if (name === 'go_to_checkout') tools = CHECKOUT_TOOLS;
    return { success: true };
  });
  (server as any).toolRouter = {
    route,
    getServerToolDeclaration: () => undefined,
    getServerToolDeclarations: () => [],
  };

  const session = {
    id: 'sess_1',
    connId: 'conn_1',
    toolRegistry: { getDeclarations: () => tools },
    graph: { recordToolCall: vi.fn(), recordTokens: vi.fn() },
    conversation: { addAssistantMessage: vi.fn() },
  } as any;

  const agentTexts = () =>
    send.mock.calls
      .map(([, message]) => message)
      .filter((message) => message.type === 'AGENT_RESPONSE')
      .map((message) => message.payload.chunk);

  return { server, llm, route, session, agentTexts };
}

describe('OwlLayerServer — surface de tools apres un tool', () => {
  it('transmet la surface courante au LLM apres une navigation', async () => {
    const { server, llm, session } = setup();
    llm.handleToolResult.mockResolvedValue({ text: 'Vous etes sur le checkout.' });

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_1', name: 'go_to_checkout', args: {} }],
    });

    expect(llm.handleToolResult).toHaveBeenCalledWith('call_1', { success: true }, CHECKOUT_TOOLS);
  });

  it('enchaine le tool suivant sans nouveau message utilisateur', async () => {
    const { server, llm, route, session, agentTexts } = setup();
    llm.handleToolResult
      .mockResolvedValueOnce({ toolCalls: [{ callId: 'call_2', name: 'fill_address', args: { city: 'Paris' } }] })
      .mockResolvedValueOnce({ text: 'Adresse remplie.' });

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_1', name: 'go_to_checkout', args: {} }],
    });

    expect(route.mock.calls.map((call) => call[1])).toEqual(['go_to_checkout', 'fill_address']);
    expect(agentTexts()).toEqual(['Adresse remplie.']);
  });

  it('limite les appels enchaines pour eviter une boucle infinie', async () => {
    const { server, llm, route, session } = setup();
    llm.handleToolResult.mockResolvedValue({
      toolCalls: [{ callId: 'call_loop', name: 'fill_address', args: {} }],
    });

    await (server as any).processLLMResponse(session, {
      toolCalls: [{ callId: 'call_1', name: 'go_to_checkout', args: {} }],
    });

    // 1 appel initial + 5 appels enchaines maximum
    expect(route).toHaveBeenCalledTimes(6);
  });

  it('transmet la surface courante et enchaine apres une approbation HITL', async () => {
    const { server, llm, route, session, agentTexts } = setup();
    llm.handleToolResult
      .mockResolvedValueOnce({ toolCalls: [{ callId: 'call_2', name: 'fill_address', args: {} }] })
      .mockResolvedValueOnce({ text: 'Commande confirmee.' });

    await (server as any).notifyToolResult(session, 'call_1', 'confirm_checkout', { ordered: true });

    expect(llm.handleToolResult.mock.calls[0][2]).toEqual(HOME_TOOLS);
    expect(route).toHaveBeenCalledWith(session, 'fill_address', {});
    expect(agentTexts()).toEqual(['Commande confirmee.']);
  });
});
