import { describe, it, expect, vi } from 'vitest';
import { OpenAIAdapter } from '../src/OpenAIAdapter.js';
import { OPENAI_CHAT_MODELS, isOpenAIReasoningModel } from '../src/models.js';

const TOOLS = [{ name: 'add_to_cart', description: 'Ajouter au panier', risk: 'low' as const }];

function createAdapter(options: Partial<ConstructorParameters<typeof OpenAIAdapter>[0]> = {}) {
  const adapter = new OpenAIAdapter({ apiKey: 'test-key', ...options });
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { role: 'assistant', content: 'ok' } }],
  });
  (adapter as any).client = { chat: { completions: { create } } };
  return { adapter, create };
}

function request() {
  return {
    messages: [{ role: 'user' as const, content: 'bonjour' }],
    tools: TOOLS,
    context: { url: '/', title: 'Accueil', data: {} },
  } as any;
}

describe('OpenAIAdapter', () => {
  describe('temperature et modeles de raisonnement', () => {
    it('envoie la temperature par defaut aux modeles classiques', async () => {
      const { adapter, create } = createAdapter({ model: 'gpt-4o' });
      await adapter.chat(request());
      expect(create.mock.calls[0][0].temperature).toBe(0.7);
    });

    it("n'envoie pas de temperature aux modeles de raisonnement", async () => {
      const { adapter, create } = createAdapter({ model: 'gpt-5' });
      await adapter.chat(request());
      expect(create.mock.calls[0][0]).not.toHaveProperty('temperature');
    });

    it('respecte une temperature explicite meme pour un modele de raisonnement', async () => {
      const { adapter, create } = createAdapter({ model: 'o3', temperature: 1 });
      await adapter.chat(request());
      expect(create.mock.calls[0][0].temperature).toBe(1);
    });

    it('classe les modeles de raisonnement', () => {
      expect(isOpenAIReasoningModel('gpt-5-mini')).toBe(true);
      expect(isOpenAIReasoningModel('o4-mini')).toBe(true);
      expect(isOpenAIReasoningModel('gpt-5-chat-latest')).toBe(false);
      expect(isOpenAIReasoningModel('gpt-4.1')).toBe(false);
      expect(isOpenAIReasoningModel('deepseek-chat')).toBe(false);
    });
  });

  describe('tool calls', () => {
    it('desactive les appels paralleles sur OpenAI', async () => {
      const { adapter, create } = createAdapter();
      await adapter.chat(request());
      expect(create.mock.calls[0][0].parallel_tool_calls).toBe(false);
    });

    it("n'envoie pas parallel_tool_calls aux fournisseurs compatibles (baseURL)", async () => {
      const { adapter, create } = createAdapter({ baseURL: 'https://api.deepseek.com' });
      await adapter.chat(request());
      expect(create.mock.calls[0][0]).not.toHaveProperty('parallel_tool_calls');
    });

    it('ne traite que le premier appel quand le modele en renvoie plusieurs', async () => {
      const { adapter, create } = createAdapter();
      create.mockResolvedValue({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [
              { id: 'call_a', type: 'function', function: { name: 'add_to_cart', arguments: '{"id":"p1"}' } },
              { id: 'call_b', type: 'function', function: { name: 'add_to_cart', arguments: '{"id":"p2"}' } },
            ],
          },
        }],
      });

      const response = await adapter.chat(request());

      expect(response.toolCalls).toEqual([{ callId: 'call_a', name: 'add_to_cart', args: { id: 'p1' } }]);
      expect((adapter as any).pendingToolContext.has('call_b')).toBe(false);
    });

    it('tolere des arguments JSON invalides', async () => {
      const { adapter, create } = createAdapter();
      create.mockResolvedValue({
        choices: [{
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [{ id: 'call_x', type: 'function', function: { name: 'add_to_cart', arguments: '{"id":' } }],
          },
        }],
      });

      const response = await adapter.chat(request());

      expect(response.toolCalls).toEqual([{ callId: 'call_x', name: 'add_to_cart', args: {} }]);
    });

    it('renvoie un message assistant avec content chaine lors du resultat de tool', async () => {
      const { adapter, create } = createAdapter();
      (adapter as any).pendingToolContext.set('call_1', {
        toolName: 'add_to_cart',
        args: { id: 'p1' },
        messages: [{ role: 'user', content: 'ajoute' }],
        systemPrompt: 'system',
      });

      await adapter.handleToolResult('call_1', { ok: true });

      const assistant = create.mock.calls[0][0].messages.find((m: any) => m.role === 'assistant');
      expect(assistant.content).toBe('');
    });
  });

  it('expose le catalogue type dans getCapabilities', () => {
    const { adapter } = createAdapter({ model: 'gpt-4.1' });
    const capabilities = adapter.getCapabilities();
    expect(capabilities.currentModel).toBe('gpt-4.1');
    expect(capabilities.models.map((m) => m.id)).toEqual([...OPENAI_CHAT_MODELS]);
  });
});
