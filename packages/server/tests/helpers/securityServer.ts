import { vi } from 'vitest';
import { OwlLayerServer } from '../../src/core/OwlLayerServer.js';
import type { LLMAdapter } from '../../src/llm/types.js';

/** Serveur avec LLM factice et transport simule, pour les tests de securite. */
export function makeServer(options: Record<string, unknown> = {}) {
  const llm: LLMAdapter = {
    name: 'mock-llm',
    chat: vi.fn().mockResolvedValue({ text: 'ok' }),
    handleToolResult: vi.fn().mockResolvedValue({ text: 'ok' }),
  };
  const server = new OwlLayerServer({ llm, ...options } as any);
  const send = vi.fn().mockReturnValue(true);
  const close = vi.fn();
  (server as any).transport = { send, close };
  return { server, llm, send, close };
}

export function wsRequest(apiKey: string, origin?: string) {
  return { url: `/owllayer?apiKey=${apiKey}`, headers: { host: 'localhost', ...(origin ? { origin } : {}) } };
}

export async function connect(server: OwlLayerServer, connId: string, apiKey: string, origin?: string) {
  await (server as any).handleConnection(connId, wsRequest(apiKey, origin));
  return (server as any).sessions.getByConnection(connId);
}

export const userInput = (content: string) => ({
  id: 'm1', type: 'USER_INPUT', timestamp: Date.now(), payload: { modality: 'text', content },
});

export const systemErrors = (send: ReturnType<typeof vi.fn>) =>
  send.mock.calls.map(([, m]) => m).filter((m) => m.type === 'SYSTEM_EVENT' && m.payload.kind === 'error');
