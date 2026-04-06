import type { PrismaClient } from '@prisma/client';

export interface AnalyticsSummary {
  period: string;
  totalSessions: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalToolCalls: number;
  estimatedCostUsd: number;
  averageDuration: number;
}

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  async getOrgSummary(orgId: string, startDate: Date, endDate: Date): Promise<AnalyticsSummary[]> {
    const records = await this.prisma.usageRecord.findMany({
      where: {
        orgId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return records.map(r => ({
      period: r.date.toISOString().slice(0, 10),
      totalSessions: r.sessions,
      totalTokensIn: r.tokensIn,
      totalTokensOut: r.tokensOut,
      totalToolCalls: r.toolCalls,
      estimatedCostUsd: r.costUsd,
      averageDuration: 0,
    }));
  }

  async recordSessionEnd(
    projectId: string,
    orgId: string,
    data: { tokensIn: number; tokensOut: number; toolCalls: number; duration: number },
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.usageRecord.upsert({
      where: { orgId_date: { orgId, date: today } },
      create: {
        orgId,
        date: today,
        sessions: 1,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        toolCalls: data.toolCalls,
        costUsd: this.estimateCost(data.tokensIn, data.tokensOut),
      },
      update: {
        sessions: { increment: 1 },
        tokensIn: { increment: data.tokensIn },
        tokensOut: { increment: data.tokensOut },
        toolCalls: { increment: data.toolCalls },
        costUsd: { increment: this.estimateCost(data.tokensIn, data.tokensOut) },
      },
    });
  }

  private estimateCost(tokensIn: number, tokensOut: number): number {
    const inputRate = 0.075 / 1_000_000;
    const outputRate = 0.30 / 1_000_000;
    return tokensIn * inputRate + tokensOut * outputRate;
  }
}
