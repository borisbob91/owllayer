import { describe, it, expect, vi } from 'vitest';
import { makeServer, connect, wsRequest } from './helpers/securityServer.js';

describe('Tools serveur reserves a certaines cles', () => {
  it('masque et n execute pas un tool reserve a une autre cle', async () => {
    const { server } = makeServer();
    const handler = vi.fn().mockResolvedValue({ ok: true });
    server.tool('admin_refund', { description: 'Refund', risk: 'high', apiKeys: ['pk_admin'] }, handler);
    server.addApiKey('pk_shop');
    server.addApiKey('pk_admin');
    const shop = await connect(server, 'conn_shop', 'pk_shop');
    const admin = await connect(server, 'conn_admin', 'pk_admin');

    const names = (session: any) =>
      (server as any).buildEffectiveToolsPayload(session).effectiveTools.map((t: any) => t.name);
    expect(names(shop)).not.toContain('admin_refund');
    expect(names(admin)).toContain('admin_refund');

    await (server as any).processLLMResponse(shop, {
      toolCalls: [{ callId: 'call_x', name: 'admin_refund', args: {} }],
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('Origines autorisees par cle', () => {
  it('refuse une connexion depuis une origine non autorisee pour la cle', async () => {
    const { server, close } = makeServer();
    server.addApiKey('pk_shop', { allowedOrigins: ['https://shop.example.com'] });
    await new Promise((r) => setTimeout(r, 0));

    await (server as any).handleConnection('conn_evil', wsRequest('pk_shop', 'https://evil.example'));
    await (server as any).handleConnection('conn_none', wsRequest('pk_shop'));
    const ok = await connect(server, 'conn_ok', 'pk_shop', 'https://shop.example.com');

    expect(close).toHaveBeenCalledWith('conn_evil', 1008, 'Origin not allowed');
    expect(close).toHaveBeenCalledWith('conn_none', 1008, 'Origin not allowed');
    expect(ok).toBeDefined();
  });
});

describe('Identifiants de session', () => {
  it('utilise un UUID complet', async () => {
    const { server } = makeServer();
    server.addApiKey('pk_a');
    const session = await connect(server, 'conn_1', 'pk_a');

    expect(session.id).toMatch(/^sess_[0-9a-f-]{36}$/);
  });
});
