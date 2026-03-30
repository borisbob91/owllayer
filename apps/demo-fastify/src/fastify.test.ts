// Test unitaire du FastifyAdapter
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { domosPlugin } from '@domos/server/adapters/fastify';
import { DomOSServer } from '@domos/server';

// Mock LLM Adapter minimal pour les tests
const mockLLMAdapter = {
  name: 'mock-llm',
  chat: async () => ({
    role: 'assistant' as const,
    content: 'Test response',
  }),
};

describe('FastifyAdapter', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  it('should register DomOS plugin successfully', async () => {
    await app.register(domosPlugin, {
      llm: mockLLMAdapter as any,
      port: 9001,
    });

    expect(app.domos).toBeDefined();
    expect(app.domos).toBeInstanceOf(DomOSServer);
  });

  it('should decorate Fastify instance with domos property', async () => {
    await app.register(domosPlugin, {
      llm: mockLLMAdapter as any,
      port: 9002,
    });

    expect(app.hasDecorator('domos')).toBe(true);
  });

  it('should start DomOS server when Fastify is ready', async () => {
    await app.register(domosPlugin, {
      llm: mockLLMAdapter as any,
      port: 9003,
    });

    await app.ready();

    // Vérifier que le serveur DomOS est initialisé
    expect(app.domos).toBeDefined();
  });

  it('should stop DomOS server when Fastify closes', async () => {
    await app.register(domosPlugin, {
      llm: mockLLMAdapter as any,
      port: 9004,
    });

    await app.ready();

    // Créer un spy pour vérifier que stop() est appelé
    const stopSpy = vi.spyOn(app.domos, 'stop');

    await app.close();

    expect(stopSpy).toHaveBeenCalled();
  });

  it('should allow custom routes alongside DomOS', async () => {
    await app.register(domosPlugin, {
      llm: mockLLMAdapter as any,
      port: 9005,
    });

    app.get('/custom', async () => ({ message: 'custom route' }));

    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/custom',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'custom route' });
  });

  it('should pass DomOS options correctly', async () => {
    await app.register(domosPlugin, {
      llm: mockLLMAdapter as any,
      port: 9006,
      path: '/custom-path',
      admin: {
        username: 'testuser',
        password: 'testpass',
      },
    });

    await app.ready();

    expect(app.domos).toBeDefined();
  });
});
