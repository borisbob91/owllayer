import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { parseBody, json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { ShopifyConnector } from '../stores/ShopifyConnector.js';
import type { WooCommerceConnector } from '../stores/WooCommerceConnector.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleStores(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & {
    shopify: ShopifyConnector | null;
    woo: WooCommerceConnector | null;
    audit: AuditService;
  },
): Promise<boolean> {
  const { prisma, jwt, shopify, woo, audit } = deps;
  const payload = authenticate(req, jwt);

  // GET /api/projects/:projectId/stores
  const listParams = matchRoute(segments, ['projects', ':projectId', 'stores']);
  if (listParams && req.method === 'GET') {
    const stores = await prisma.connectedStore.findMany({
      where: { projectId: listParams.projectId },
      select: { id: true, platform: true, shopDomain: true, createdAt: true, config: true },
    });
    json(res, 200, { stores });
    return true;
  }

  // POST /api/projects/:projectId/stores/shopify/auth
  const shopifyAuthParams = matchRoute(segments, ['projects', ':projectId', 'stores', 'shopify', 'auth']);
  if (shopifyAuthParams && req.method === 'POST') {
    if (!shopify) { json(res, 503, { error: 'Shopify not configured' }); return true; }
    const body = await parseBody<{ shop: string; redirectUri: string }>(req);
    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = shopify.getAuthUrl(body.shop, body.redirectUri, state);
    json(res, 200, { authUrl, state });
    return true;
  }

  // GET /api/stores/shopify/callback
  const shopifyCallbackParams = matchRoute(segments, ['stores', 'shopify', 'callback']);
  if (shopifyCallbackParams && req.method === 'GET') {
    if (!shopify) { json(res, 503, { error: 'Shopify not configured' }); return true; }
    const url = new URL(req.url ?? '/', 'http://localhost');
    const shop = url.searchParams.get('shop') ?? '';
    const code = url.searchParams.get('code') ?? '';
    const projectId = url.searchParams.get('projectId') ?? '';
    if (!shop || !code || !projectId) { json(res, 400, { error: 'Missing params' }); return true; }
    const accessToken = await shopify.exchangeCode(shop, code);
    await prisma.connectedStore.upsert({
      where: { projectId_platform_shopDomain: { projectId, platform: 'shopify', shopDomain: shop } },
      create: { projectId, platform: 'shopify', shopDomain: shop, accessToken },
      update: { accessToken },
    });
    await audit.log({ userId: payload.sub, action: 'store.connect', resource: shop });
    json(res, 200, { connected: true, shop });
    return true;
  }

  // POST /api/projects/:projectId/stores/woo/auth
  const wooAuthParams = matchRoute(segments, ['projects', ':projectId', 'stores', 'woo', 'auth']);
  if (wooAuthParams && req.method === 'POST') {
    if (!woo) { json(res, 503, { error: 'WooCommerce not configured' }); return true; }
    const body = await parseBody<{ storeUrl: string }>(req);
    const authUrl = woo.getAuthUrl(body.storeUrl);
    json(res, 200, { authUrl });
    return true;
  }

  // POST /api/stores/woo/callback
  const wooCallbackParams = matchRoute(segments, ['stores', 'woo', 'callback']);
  if (wooCallbackParams && req.method === 'POST') {
    if (!woo) { json(res, 503, { error: 'WooCommerce not configured' }); return true; }
    const body = await parseBody<{
      consumer_key: string;
      consumer_secret: string;
      key_permissions: string;
      user_id?: string;
    } & { projectId?: string; storeUrl?: string }>(req);
    const creds = woo.parseCallback(body);
    const projectId = body.projectId ?? '';
    const storeUrl = body.storeUrl ?? '';
    if (projectId && storeUrl) {
      await prisma.connectedStore.upsert({
        where: { projectId_platform_shopDomain: { projectId, platform: 'woocommerce', shopDomain: storeUrl } },
        create: {
          projectId, platform: 'woocommerce', shopDomain: storeUrl,
          accessToken: creds.consumerKey,
          wooConsumerKey: creds.consumerKey,
          wooConsumerSecret: creds.consumerSecret,
          wooApiUrl: storeUrl,
        },
        update: { wooConsumerKey: creds.consumerKey, wooConsumerSecret: creds.consumerSecret },
      });
      await audit.log({ userId: payload.sub, action: 'store.connect', resource: storeUrl });
    }
    json(res, 200, { connected: true });
    return true;
  }

  // DELETE /api/projects/:projectId/stores/:storeId
  const deleteParams = matchRoute(segments, ['projects', ':projectId', 'stores', ':storeId']);
  if (deleteParams && req.method === 'DELETE') {
    const { storeId, projectId } = deleteParams;
    const store = await prisma.connectedStore.findUnique({ where: { id: storeId } });
    if (!store || store.projectId !== projectId) {
      json(res, 404, { error: 'Not found' }); return true;
    }
    await prisma.connectedStore.delete({ where: { id: storeId } });
    await audit.log({ userId: payload.sub, action: 'store.disconnect', resource: storeId });
    json(res, 204, {});
    return true;
  }

  return false;
}
