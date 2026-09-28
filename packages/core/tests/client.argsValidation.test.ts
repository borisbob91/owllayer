import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { OwlLayerClient, MessageType } from '../src/index.js';

// Validation des arguments dans le core, avant la politique de risque (#160).

const location = { pathname: '/' };

function createClient() {
  (globalThis as any).window = { location };
  location.pathname = '/';
  const client = new OwlLayerClient({ endpoint: 'ws://localhost:3000/owllayer', apiKey: 'pk_test', autoReconnect: false });
  const sendSpy = vi.fn();
  (client as any).send = sendSpy;
  (client as any)._sessionId = 'sess_1';
  return { client, sendSpy };
}

const sent = (spy: ReturnType<typeof vi.fn>, type: MessageType) =>
  spy.mock.calls.map(([m]) => m).filter((m) => m.type === type);

const paymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
});

describe('OwlLayerClient — validation des arguments avant approbation', () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it('des arguments invalides pour un tool critical renvoient une erreur sans demande d approbation', async () => {
    const { client, sendSpy } = createClient();
    const handler = vi.fn(async () => ({ paid: true }));
    const approvals = vi.fn();
    client.onEvent('approval.requested', approvals);
    client.registerTool({
      declaration: { name: 'pay', description: 'Pay', risk: 'critical' },
      handler,
      componentId: 'checkout',
      schema: paymentSchema,
    });

    await (client as any).handleToolCall({ callId: 'c1', name: 'pay', args: { amount: -5 } });

    expect(sent(sendSpy, MessageType.APPROVAL_REQUEST)).toHaveLength(0);
    expect(approvals).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
    const result = sent(sendSpy, MessageType.TOOL_RESULT).at(-1);
    expect(result.payload.callId).toBe('c1');
    expect(result.payload.status).toBe('error');
    expect(result.payload.error).toMatch(/^Validation args "pay": /);
  });

  it('des arguments valides passent l approbation puis arrivent parses au handler', async () => {
    const { client, sendSpy } = createClient();
    const handler = vi.fn(async () => ({ paid: true }));
    client.registerTool({
      declaration: { name: 'pay', description: 'Pay', risk: 'critical' },
      handler,
      componentId: 'checkout',
      schema: paymentSchema,
    });

    await (client as any).handleToolCall({ callId: 'c2', name: 'pay', args: { amount: 12 } });
    const request = sent(sendSpy, MessageType.APPROVAL_REQUEST).at(-1);
    expect(request.payload.callId).toBe('c2');
    expect(handler).not.toHaveBeenCalled();

    await client.resolveApproval('c2', true);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ amount: 12, currency: 'EUR' });
  });

  it('un tool sans risque recoit aussi les arguments parses', async () => {
    const { client, sendSpy } = createClient();
    const handler = vi.fn(async (args) => args);
    client.registerTool({
      declaration: { name: 'quote', description: 'Quote', risk: 'none' },
      handler,
      componentId: 'k',
      schema: paymentSchema,
    });

    await (client as any).handleToolCall({ callId: 'c3', name: 'quote', args: { amount: 3 } });

    expect(handler).toHaveBeenCalledWith({ amount: 3, currency: 'EUR' });
    expect(sent(sendSpy, MessageType.TOOL_RESULT).at(-1).payload).toMatchObject({ callId: 'c3', status: 'success', result: { amount: 3, currency: 'EUR' } });
  });

  it('un tool sans schema recoit les arguments tels quels', async () => {
    const { client } = createClient();
    const handler = vi.fn(async () => 'ok');
    client.registerTool({ declaration: { name: 'raw', description: 'Raw', risk: 'none' }, handler, componentId: 'k' });

    await (client as any).handleToolCall({ callId: 'c4', name: 'raw', args: { anything: true } });

    expect(handler).toHaveBeenCalledWith({ anything: true });
  });

  it('callTool valide aussi les arguments', async () => {
    const { client } = createClient();
    const handler = vi.fn(async (args) => args);
    client.registerTool({
      declaration: { name: 'quote', description: 'Quote', risk: 'none' },
      handler,
      componentId: 'k',
      schema: paymentSchema,
    });

    await expect(client.callTool('quote', { amount: 0 })).rejects.toThrow(/^Validation args "quote": /);
    expect(handler).not.toHaveBeenCalled();
    await expect(client.callTool('quote', { amount: 1 })).resolves.toEqual({ amount: 1, currency: 'EUR' });
  });

  it('le schema n est jamais envoye au serveur', async () => {
    const { client, sendSpy } = createClient();
    client.registerTool({
      declaration: { name: 'quote', description: 'Quote', risk: 'none' },
      handler: async () => 1,
      componentId: 'k',
      schema: paymentSchema,
    });
    await Promise.resolve();

    const tool = sent(sendSpy, MessageType.CONTEXT_UPDATE).at(-1).payload.activeTools[0];
    expect(Object.keys(JSON.parse(JSON.stringify(tool))).sort()).toEqual(['description', 'name', 'risk']);
  });
});
