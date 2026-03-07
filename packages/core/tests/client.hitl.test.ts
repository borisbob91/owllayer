import { describe, it, expect, vi } from 'vitest';
import { DomOSClient, MessageType } from '../src/index.js';

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
});

