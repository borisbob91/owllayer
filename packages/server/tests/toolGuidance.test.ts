import { describe, it, expect, vi } from 'vitest';
import type { ToolDeclaration } from '@owllayer/core';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import { annotateToolDeclarations, appendToolGuidance } from '../src/core/toolGuidance.js';

const TOOLS: ToolDeclaration[] = [
  { name: 'search_products', description: 'Rechercher un produit.', risk: 'none' },
  { name: 'add_to_cart', description: 'Ajouter au panier.', risk: 'low' },
  { name: 'add_to_wishlist', description: 'Ajouter aux favoris.', risk: 'high' },
  { name: 'confirm_checkout', description: 'Valider la commande.', risk: 'critical' },
  { name: 'scroll', description: 'Faire defiler la page.' },
];

function createServer(options: Record<string, unknown> = {}) {
  const llm = {
    name: 'mock-llm',
    systemPrompt: 'You are a shopping assistant.',
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: '' }),
  };
  const server = new OwlLayerServer({ llm, ...options } as any);
  (server as any).transport = { send: vi.fn().mockReturnValue(true) };
  return { server, llm };
}

function createSession() {
  return {
    id: 'sess_1',
    connId: 'conn_1',
    apiKey: 'pk_test',
    context: { url: '/', data: {} },
    toolRegistry: { getDeclarations: () => TOOLS },
    graph: { recordToolCall: vi.fn(), recordTokens: vi.fn(), recordContextChange: vi.fn() },
    conversation: {
      addUserMessage: vi.fn(),
      addAssistantMessage: vi.fn(),
      getMessages: () => [{ role: 'user', content: 'bonjour' }],
    },
  } as any;
}

describe('toolGuidance', () => {
  it('ajoute le tag correspondant au risque de chaque tool', () => {
    const descriptions = annotateToolDeclarations(TOOLS).map((t) => t.description);
    expect(descriptions).toEqual([
      'Rechercher un produit. [PROACTIVE]',
      'Ajouter au panier. [PREAMBLE]',
      'Ajouter aux favoris. [SCREEN CONFIRMATION]',
      'Valider la commande. [SCREEN CONFIRMATION]',
      'Faire defiler la page. [PROACTIVE]',
    ]);
  });

  it('ne modifie pas les declarations d origine', () => {
    annotateToolDeclarations(TOOLS);
    expect(TOOLS[0].description).toBe('Rechercher un produit.');
  });

  it('ajoute la section au prompt en anglais et en francais', () => {
    expect(appendToolGuidance('Base prompt.', 'en')).toMatch(/^Base prompt\.\n\n# Tool Behavior/);
    expect(appendToolGuidance('', 'fr')).toMatch(/^# Comportement des outils/);
    expect(appendToolGuidance('', 'fr')).toContain('[SCREEN CONFIRMATION]');
  });

  describe('OwlLayerServer', () => {
    it('ne change rien quand toolGuidance est desactive (defaut)', async () => {
      const { server, llm } = createServer();
      const session = createSession();

      expect((server as any).getAvailableToolDeclarations(session)).toEqual(TOOLS);

      await (server as any).handleTextInput(session, 'bonjour');
      const request = llm.chat.mock.calls[0][0];
      expect(request.systemPrompt).toBe('You are a shopping assistant.');
      expect(request.tools).toEqual(TOOLS);
    });

    it('envoie les tools tagues et la section au LLM texte', async () => {
      const { server, llm } = createServer({ toolGuidance: true, language: 'fr' });
      const session = createSession();

      await (server as any).handleTextInput(session, 'bonjour');
      const request = llm.chat.mock.calls[0][0];

      expect(request.systemPrompt).toMatch(/^You are a shopping assistant\.\n\n# Comportement des outils/);
      expect(request.tools.find((t: ToolDeclaration) => t.name === 'confirm_checkout').description)
        .toBe('Valider la commande. [SCREEN CONFIRMATION]');
    });

    it('ne modifie pas la surface tools_effective envoyee au client', () => {
      const { server } = createServer({ toolGuidance: true });
      const surface = (server as any).buildEffectiveToolsPayload(createSession());
      expect(surface.effectiveTools).toEqual(TOOLS);
    });

    it('envoie le prompt et les tools tagues a la session live', async () => {
      const createSessionSpy = vi.fn().mockResolvedValue({ isActive: true, updateTools: vi.fn() });
      const live = { name: 'mock-live', systemPrompt: 'Voice agent.', createSession: createSessionSpy };
      const { server } = createServer({ toolGuidance: true, live });

      await (server as any).getOrCreateLiveSession(createSession());
      const config = createSessionSpy.mock.calls[0][0];

      expect(config.systemPrompt).toMatch(/^Voice agent\.\n\n# Tool Behavior/);
      expect(config.tools.find((t: ToolDeclaration) => t.name === 'add_to_cart').description)
        .toBe('Ajouter au panier. [PREAMBLE]');
    });

    it('met a jour la session live avec les tools tagues apres un CONTEXT_UPDATE', () => {
      const { server } = createServer({ toolGuidance: true });
      const session = createSession();
      (server as any).sessions = { updateContext: vi.fn() };
      const liveSession = { isActive: true, updateTools: vi.fn() };
      (server as any).liveSessions.set(session.id, liveSession);

      (server as any).handleContextUpdate(session, { url: '/checkout', activeTools: TOOLS });

      const tools = liveSession.updateTools.mock.calls[0][0];
      expect(tools.find((t: ToolDeclaration) => t.name === 'search_products').description)
        .toBe('Rechercher un produit. [PROACTIVE]');
    });
  });
});
