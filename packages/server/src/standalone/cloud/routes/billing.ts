import type { IncomingMessage, ServerResponse } from 'http';
import { parseBody, json, authenticate, matchRoute, readBody, type CloudDeps } from './utils.js';
import type { StripeService } from '../billing/StripeService.js';

export async function handleBilling(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { stripe: StripeService | null },
): Promise<boolean> {
  const { prisma, jwt, stripe } = deps;

  // POST /api/billing/webhook — pas de JWT auth
  const webhookParams = matchRoute(segments, ['billing', 'webhook']);
  if (webhookParams && req.method === 'POST') {
    if (!stripe) { json(res, 503, { error: 'Billing not configured' }); return true; }
    const body = await readBody(req);
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) { json(res, 400, { error: 'Missing stripe-signature header' }); return true; }
    try {
      await stripe.handleWebhook(body, sig);
      json(res, 200, { received: true });
    } catch (err) {
      json(res, 400, { error: (err as Error).message });
    }
    return true;
  }

  const payload = authenticate(req, jwt);

  // GET /api/orgs/:orgId/billing
  const billingParams = matchRoute(segments, ['orgs', ':orgId', 'billing']);
  if (billingParams && req.method === 'GET') {
    const { orgId } = billingParams;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, sessionsToday: true, tokensUsedThisMonth: true, stripeSubscriptionId: true },
    });
    if (!org) { json(res, 404, { error: 'Not found' }); return true; }
    json(res, 200, org);
    void payload;
    return true;
  }

  // POST /api/orgs/:orgId/billing/subscribe
  const subscribeParams = matchRoute(segments, ['orgs', ':orgId', 'billing', 'subscribe']);
  if (subscribeParams && req.method === 'POST') {
    if (!stripe) { json(res, 503, { error: 'Billing not configured' }); return true; }
    const { orgId } = subscribeParams;
    const body = await parseBody<{ planId: string }>(req);
    const subscriptionId = await stripe.createSubscription(orgId, body.planId);
    json(res, 200, { subscriptionId });
    return true;
  }

  // GET /api/orgs/:orgId/billing/invoices
  const invoicesParams = matchRoute(segments, ['orgs', ':orgId', 'billing', 'invoices']);
  if (invoicesParams && req.method === 'GET') {
    const { orgId } = invoicesParams;
    const invoices = await prisma.invoice.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
    json(res, 200, { invoices });
    return true;
  }

  return false;
}
