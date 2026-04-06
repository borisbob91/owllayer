import Stripe from 'stripe';
import type { PrismaClient } from '@prisma/client';
import type { BillingPlan, CloudConfig } from '../../config/types.js';

export class StripeService {
  private stripe: Stripe;
  private webhookSecret: string;
  private plans: BillingPlan[];

  constructor(
    config: NonNullable<CloudConfig['billing']>,
    private prisma: PrismaClient,
    plans: BillingPlan[],
  ) {
    this.stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2025-01-27.acacia' });
    this.webhookSecret = config.webhookSecret;
    this.plans = plans;
  }

  async createCustomer(orgId: string, email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { orgId },
    });
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createSubscription(orgId: string, planId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const plan = this.plans.find(p => p.id === planId);
    if (!plan?.stripePriceId) throw new Error(`Plan ${planId} has no Stripe price`);
    if (!org.stripeCustomerId) throw new Error('Organization has no Stripe customer');

    const subscription = await this.stripe.subscriptions.create({
      customer: org.stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      metadata: { orgId, planId },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { plan: planId, stripeSubscriptionId: subscription.id },
    });

    return subscription.id;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const orgId = invoice.metadata?.orgId;
        if (orgId) {
          await this.prisma.invoice.create({
            data: {
              orgId,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'paid',
              stripeId: invoice.id,
              period: new Date(invoice.period_start * 1000).toISOString().slice(0, 7),
            },
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          await this.prisma.organization.update({
            where: { id: orgId },
            data: { plan: 'free', stripeSubscriptionId: null },
          });
        }
        break;
      }
    }
  }
}
