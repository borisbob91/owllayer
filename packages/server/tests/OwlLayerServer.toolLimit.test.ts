import { describe, it, expect, vi } from 'vitest';
import { MessageType } from '@owllayer/core';
import { OwlLayerServer } from '../src/core/OwlLayerServer.js';
import type { LLMAdapter } from '../src/llm/types.js';

function createLLM(): LLMAdapter {
  return {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: 'ok' }),
  };
}

describe('OwlLayerServer — limite de tools configurable (#156)', () => {
  it.each([0, -1, 2.5])('rejette maxActiveTools invalide au constructeur (%s)', (maxActiveTools) => {
    expect(() => new OwlLayerServer({ llm: createLLM(), maxActiveTools })).toThrow(RangeError);
  });

  it('accepte une valeur positive entiere', () => {
    expect(() => new OwlLayerServer({ llm: createLLM(), maxActiveTools: 5 })).not.toThrow();
  });

  it('HANDSHAKE_ACK annonce 30 par defaut', async () => {
    const server = new OwlLayerServer({ llm: createLLM(), client: { requireApiKey: false } });
    const send = vi.fn();
    (server as any).transport = { send, close: vi.fn() };

    await (server as any).handleConnection('conn_1', { url: '/owllayer', headers: {} });

    const ack = send.mock.calls.map(([, message]) => message).find((m) => m.type === MessageType.HANDSHAKE_ACK);
    expect(ack.payload.maxActiveTools).toBe(30);
  });

  it('HANDSHAKE_ACK annonce la valeur configuree', async () => {
    const server = new OwlLayerServer({ llm: createLLM(), client: { requireApiKey: false }, maxActiveTools: 5 });
    const send = vi.fn();
    (server as any).transport = { send, close: vi.fn() };

    await (server as any).handleConnection('conn_1', { url: '/owllayer', headers: {} });

    const ack = send.mock.calls.map(([, message]) => message).find((m) => m.type === MessageType.HANDSHAKE_ACK);
    expect(ack.payload.maxActiveTools).toBe(5);
  });

  it('un CONTEXT_UPDATE qui depasse la limite envoie un SYSTEM_EVENT error nommant le compte et la limite, et garde la liste precedente', () => {
    const server = new OwlLayerServer({ llm: createLLM(), maxActiveTools: 2 });
    const send = vi.fn();
    (server as any).transport = { send, close: vi.fn() };

    const session = (server as any).sessions.create('conn_1', 'pk_test');

    (server as any).handleContextUpdate(session, {
      url: '/home',
      title: 'Accueil',
      activeTools: [{ name: 'a', description: 'a' }],
    });

    (server as any).handleContextUpdate(session, {
      url: '/checkout',
      title: 'Checkout',
      activeTools: [
        { name: 'b', description: 'b' },
        { name: 'c', description: 'c' },
        { name: 'd', description: 'd' },
      ],
    });

    const errorEvent = send.mock.calls
      .map(([, message]) => message)
      .find((m) => m.type === MessageType.SYSTEM_EVENT && m.payload.kind === 'error');

    expect(errorEvent).toBeDefined();
    expect(errorEvent.payload.message).toContain('3');
    expect(errorEvent.payload.message).toContain('2');
    expect(session.toolRegistry.getDeclarations().map((t: { name: string }) => t.name)).toEqual(['a']);
  });
});
