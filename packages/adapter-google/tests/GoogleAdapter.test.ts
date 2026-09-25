import { describe, it, expect, vi } from 'vitest';
import { GoogleAdapter } from '../src/GoogleAdapter.js';

function createAdapter() {
  const adapter = new GoogleAdapter({ apiKey: 'test-key' });
  const generateContent = vi.fn().mockResolvedValue({
    candidates: [{ content: { parts: [{ text: 'ok' }] } }],
  });
  (adapter as any).client = { models: { generateContent } };
  (adapter as any).pendingToolContext.set('call_1', {
    toolName: 'go_to_checkout',
    args: {},
    functionCallPart: { functionCall: { name: 'go_to_checkout', args: {} } },
    modelParts: [],
    contents: [{ role: 'user', parts: [{ text: 'mon adresse est...' }] }],
    systemPrompt: 'system',
    tools: [{ functionDeclarations: [{ name: 'go_to_checkout', description: 'Aller au checkout' }] }],
  });
  return { adapter, generateContent };
}

describe('GoogleAdapter.handleToolResult', () => {
  it('utilise la surface de tools courante fournie par le serveur', async () => {
    const { adapter, generateContent } = createAdapter();

    await adapter.handleToolResult('call_1', { success: true }, [
      { name: 'fill_address', description: 'Remplir l adresse', risk: 'none' },
    ]);

    const tools = generateContent.mock.calls[0][0].config.tools;
    expect(tools[0].functionDeclarations.map((f: { name: string }) => f.name)).toEqual(['fill_address']);
  });

  it('garde les tools du tour precedent sans surface fournie', async () => {
    const { adapter, generateContent } = createAdapter();

    await adapter.handleToolResult('call_1', { success: true });

    const tools = generateContent.mock.calls[0][0].config.tools;
    expect(tools[0].functionDeclarations.map((f: { name: string }) => f.name)).toEqual(['go_to_checkout']);
  });
});
