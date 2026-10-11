import { describe, it, expect, vi } from 'vitest';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';

function createSession(apiKey = 'pk_shop') {
  return {
    id: 'sess_voice',
    connId: 'conn_voice',
    apiKey,
    context: { url: '/', data: {} },
    toolRegistry: { getDeclarations: () => [] },
    graph: { recordToolCall: vi.fn(), recordTokens: vi.fn(), recordContextChange: vi.fn() },
    conversation: { addUserMessage: vi.fn(), addAssistantMessage: vi.fn(), getMessages: () => [] },
  } as any;
}

function createServer() {
  const createLiveSession = vi.fn().mockResolvedValue({ isActive: true, sendAudio: vi.fn(), close: vi.fn() });
  const llm = {
    name: 'mock-llm',
    systemPrompt: 'Text prompt.',
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
  };
  const live = { name: 'mock-live', systemPrompt: 'Live prompt.', createSession: createLiveSession };
  const server = new OwlLayerServer({ llm, live } as any);
  (server as any).transport = { send: vi.fn().mockReturnValue(true) };
  return { server, createLiveSession };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('OwlLayerServer — prompt systeme des sessions vocales (#196)', () => {
  describe('voix en streaming (AUDIO_STREAM, getOrCreateLiveSession)', () => {
    it('utilise le prompt de la cle API de la session', async () => {
      const { server, createLiveSession } = createServer();
      server.setPromptOverride('pk_shop', 'Shop prompt.');

      await (server as any).getOrCreateLiveSession(createSession());

      expect(createLiveSession.mock.calls[0][0].systemPrompt).toBe('Shop prompt.');
    });

    it('garde le prompt de l adapter live quand la cle n en a pas', async () => {
      const { server, createLiveSession } = createServer();

      await (server as any).getOrCreateLiveSession(createSession('pk_other'));

      expect(createLiveSession.mock.calls[0][0].systemPrompt).toBe('Live prompt.');
    });

    it('ne cree qu une session quand des chunks audio arrivent en rafale', async () => {
      const { server, createLiveSession } = createServer();
      server.setPromptOverride('pk_shop', 'Shop prompt.');
      const session = createSession();

      const [a, b] = await Promise.all([
        (server as any).getOrCreateLiveSession(session),
        (server as any).getOrCreateLiveSession(session),
      ]);

      expect(createLiveSession).toHaveBeenCalledTimes(1);
      expect(a).toBe(b);
    });
  });

  describe('audio en message utilisateur (USER_INPUT audio, handleLiveAudio)', () => {
    it('utilise le prompt de la cle API de la session', async () => {
      const { server, createLiveSession } = createServer();
      server.setPromptOverride('pk_shop', 'Shop prompt.');

      await (server as any).handleLiveAudio(createSession(), 'AAAA', 'audio/pcm');
      await flush();

      expect(createLiveSession.mock.calls[0][0].systemPrompt).toBe('Shop prompt.');
    });

    it('prend le prompt de l adapter live, pas celui du LLM texte, quand la cle n en a pas', async () => {
      const { server, createLiveSession } = createServer();

      await (server as any).handleLiveAudio(createSession('pk_other'), 'AAAA', 'audio/pcm');
      await flush();

      expect(createLiveSession.mock.calls[0][0].systemPrompt).toBe('Live prompt.');
    });
  });
});
