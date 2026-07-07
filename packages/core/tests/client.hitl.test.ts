import { describe, it, expect, vi } from 'vitest';
import { DomOSClient, MessageType, Messages } from '../src/index.js';

function createClient() {
  const client = new DomOSClient({
    endpoint: 'ws://localhost:3000/domos',
    apiKey: 'pk_test',
    autoReconnect: false,
  });

  const sendSpy = vi.fn();
  (client as any).send = sendSpy;

  return { client, sendSpy };
}

describe('DomOSClient HITL', () => {
  it('envoie approval_request et attend la confirmation (risk: high)', async () => {
    const { client, sendSpy } = createClient();

    const handler = vi.fn().mockResolvedValue({ ok: true });
    client.registerTool({
      declaration: {
        name: 'refund_payment',
        description: 'Effectuer un remboursement',
        risk: 'high',
      },
      handler,
      componentId: 'c1',
    });

    let resolver: ((approved: boolean) => void) | null = null;
    client.on({
      onApprovalRequest: (_req, resolve) => {
        resolver = resolve;
      },
    });

    await (client as any).handleToolCall({
      callId: 'call_1',
      name: 'refund_payment',
      args: { orderId: 'o_1' },
    });

    expect(handler).not.toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0].type).toBe(MessageType.APPROVAL_REQUEST);

    resolver?.(true);
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[1][0].type).toBe(MessageType.APPROVAL_RESPONSE);
    expect(sendSpy.mock.calls[1][0].payload.approved).toBe(true);
  });

  it('refus utilisateur -> approval_response error et pas d execution', async () => {
    const { client, sendSpy } = createClient();

    const handler = vi.fn().mockResolvedValue({ ok: true });
    client.registerTool({
      declaration: {
        name: 'delete_account',
        description: 'Supprimer le compte',
        risk: 'critical',
      },
      handler,
      componentId: 'c2',
    });

    let resolver: ((approved: boolean) => void) | null = null;
    client.on({
      onApprovalRequest: (_req, resolve) => {
        resolver = resolve;
      },
    });

    await (client as any).handleToolCall({
      callId: 'call_2',
      name: 'delete_account',
      args: { userId: 'u_1' },
    });

    resolver?.(false);
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).not.toHaveBeenCalled();
    expect(sendSpy.mock.calls[1][0].type).toBe(MessageType.APPROVAL_RESPONSE);
    expect(sendSpy.mock.calls[1][0].payload.approved).toBe(false);
    expect(sendSpy.mock.calls[1][0].payload.error).toBe("Action refusée par l'utilisateur");
  });

  it('risk none execute directement', async () => {
    const { client, sendSpy } = createClient();

    const handler = vi.fn().mockResolvedValue({ ok: true });
    client.registerTool({
      declaration: {
        name: 'open_help',
        description: 'Ouvrir la page aide',
        risk: 'none',
      },
      handler,
      componentId: 'c3',
    });

    await (client as any).handleToolCall({
      callId: 'call_3',
      name: 'open_help',
      args: {},
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0].payload.status).toBe('success');
  });

  it('remonte une approval_request serveur vers les handlers et le widget event', async () => {
    const { client, sendSpy } = createClient();
    const onApprovalRequest = vi.fn();
    let resolveFromEvent: ((approved: boolean) => void) | null = null;

    client.on({ onApprovalRequest });
    client.onEvent('approval.requested', ({ request, resolve }) => {
      expect(request.toolName).toBe('server_refund');
      expect(request.risk).toBe('high');
      resolveFromEvent = resolve;
    });

    (client as any).handleMessage(
      Messages.approvalRequest('call_server_1', 'server_refund', 'high', { orderId: 'o_1' }, 'Confirmer le remboursement')
    );

    expect(onApprovalRequest).toHaveBeenCalledTimes(1);
    expect(onApprovalRequest.mock.calls[0][0]).toMatchObject({
      callId: 'call_server_1',
      toolName: 'server_refund',
      risk: 'high',
    });

    resolveFromEvent?.(false);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0].type).toBe(MessageType.APPROVAL_RESPONSE);
    expect(sendSpy.mock.calls[0][0].payload).toMatchObject({
      callId: 'call_server_1',
      approved: false,
    });
  });

  it('renvoie TOOL_RESULT error quand un handler async echoue', async () => {
    const { client, sendSpy } = createClient();

    client.registerTool({
      declaration: {
        name: 'unstable_async',
        description: 'Tool async instable',
        risk: 'none',
      },
      handler: vi.fn().mockRejectedValue(new Error('async boom')),
      componentId: 'c4',
    });

    (client as any).handleMessage(Messages.toolCall('call_async_error', 'unstable_async', { value: 1 }));
    await new Promise((r) => setTimeout(r, 0));

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0][0].type).toBe(MessageType.TOOL_RESULT);
    expect(sendSpy.mock.calls[0][0].payload).toMatchObject({
      callId: 'call_async_error',
      status: 'error',
      error: 'async boom',
    });
  });

  it('met a jour la surface effective et expose les collisions serveur/client', () => {
    const { client } = createClient();
    const onEffectiveTools = vi.fn();
    const eventListener = vi.fn();

    client.on({ onEffectiveTools });
    client.onEvent('tool.registry.effective', eventListener);

    (client as any).handleMessage(
      Messages.systemEvent('tools_effective', 'Surface mise a jour', {
        effectiveTools: [{ name: 'server_search', description: 'Search server' }],
        serverTools: [{ name: 'server_search', description: 'Search server' }],
        clientTools: [{ name: 'server_search', description: 'Search client' }],
        ignoredClientTools: [{ name: 'server_search', description: 'Search client' }],
      })
    );

    expect(client.effectiveTools).toEqual([{ name: 'server_search', description: 'Search server' }]);
    expect(client.ignoredClientTools).toEqual([{ name: 'server_search', description: 'Search client' }]);
    expect(onEffectiveTools).toHaveBeenCalledTimes(1);
    expect(eventListener).toHaveBeenCalledTimes(1);
  });
});
