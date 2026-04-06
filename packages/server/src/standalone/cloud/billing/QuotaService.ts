import type { PrismaClient } from '@prisma/client';
import type { BillingPlan } from '../../config/types.js';

export class QuotaService {
  constructor(
    private prisma: PrismaClient,
    private plans: BillingPlan[],
  ) {}

  async checkSessionQuota(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, sessionsToday: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    const plan = this.plans.find(p => p.id === org.plan);
    if (!plan) return { allowed: false, reason: 'Unknown plan' };

    if (org.sessionsToday >= plan.limits.sessionsPerDay) {
      return { allowed: false, reason: `Daily session limit reached (${plan.limits.sessionsPerDay})` };
    }

    return { allowed: true };
  }

  async checkTokenQuota(orgId: string, tokensToAdd: number): Promise<{ allowed: boolean; reason?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, tokensUsedThisMonth: true },
    });
    if (!org) return { allowed: false, reason: 'Organization not found' };

    const plan = this.plans.find(p => p.id === org.plan);
    if (!plan) return { allowed: false, reason: 'Unknown plan' };

    if (org.tokensUsedThisMonth + tokensToAdd > plan.limits.tokensPerMonth) {
      return { allowed: false, reason: `Monthly token limit reached (${plan.limits.tokensPerMonth})` };
    }

    return { allowed: true };
  }

  async incrementSessionCount(orgId: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { sessionsToday: { increment: 1 } },
    });
  }

  async incrementTokenUsage(orgId: string, tokens: number): Promise<void> {
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { tokensUsedThisMonth: { increment: tokens } },
    });
  }

  /** Reset quotas journaliers — à appeler via cron à minuit UTC */
  async resetDailyQuotas(): Promise<void> {
    await this.prisma.organization.updateMany({
      data: { sessionsToday: 0 },
    });
  }

  /** Reset quotas mensuels — à appeler le 1er du mois */
  async resetMonthlyQuotas(): Promise<void> {
    await this.prisma.organization.updateMany({
      data: { tokensUsedThisMonth: 0 },
    });
  }
}
