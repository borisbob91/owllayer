import type { PrismaClient } from '@prisma/client';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'org.create'
  | 'org.update'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'agent.create'
  | 'agent.update'
  | 'agent.delete'
  | 'line.create'
  | 'line.update'
  | 'line.delete'
  | 'session.start'
  | 'session.end'
  | 'apikey.create'
  | 'apikey.revoke'
  | 'store.connect'
  | 'store.disconnect'
  | 'billing.plan_change'
  | 'member.invite'
  | 'member.remove'
  | 'member.role_change';

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async log(params: {
    userId?: string;
    orgId?: string;
    action: AuditAction;
    resource?: string;
    details?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({ data: params });
  }

  async query(params: {
    orgId: string;
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.auditLog.findMany({
      where: {
        orgId: params.orgId,
        ...(params.action && { action: params.action }),
        ...(params.userId && { userId: params.userId }),
        ...(params.startDate && { createdAt: { gte: params.startDate } }),
        ...(params.endDate && { createdAt: { lte: params.endDate } }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 50,
      skip: params.offset ?? 0,
      include: { user: { select: { email: true, name: true } } },
    });
  }
}
