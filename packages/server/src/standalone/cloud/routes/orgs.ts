import type { IncomingMessage, ServerResponse } from 'http';
import { parseBody, json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleOrgs(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { audit: AuditService },
): Promise<boolean> {
  const { prisma, jwt, audit } = deps;
  const payload = authenticate(req, jwt);

  // GET /api/orgs — list orgs for current user
  if (segments.length === 1 && req.method === 'GET') {
    const memberships = await prisma.orgMember.findMany({
      where: { userId: payload.sub },
      include: { org: true },
    });
    json(res, 200, { orgs: memberships.map(m => ({ ...m.org, role: m.role })) });
    return true;
  }

  // POST /api/orgs — create org
  if (segments.length === 1 && req.method === 'POST') {
    const body = await parseBody<{ name: string; slug: string }>(req);
    const org = await prisma.organization.create({
      data: {
        name: body.name,
        slug: body.slug,
        members: { create: { userId: payload.sub, role: 'OWNER' } },
      },
    });
    await audit.log({ userId: payload.sub, orgId: org.id, action: 'org.create', resource: org.id });
    json(res, 201, org);
    return true;
  }

  // /api/orgs/:orgId
  const orgParams = matchRoute(segments, ['orgs', ':orgId']);
  if (orgParams) {
    const { orgId } = orgParams;

    if (req.method === 'GET') {
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) { json(res, 404, { error: 'Not found' }); return true; }
      json(res, 200, org);
      return true;
    }

    if (req.method === 'PATCH') {
      const body = await parseBody<{ name?: string }>(req);
      const org = await prisma.organization.update({ where: { id: orgId }, data: body });
      await audit.log({ userId: payload.sub, orgId, action: 'org.update', resource: orgId });
      json(res, 200, org);
      return true;
    }
  }

  // GET /api/orgs/:orgId/members
  const membersParams = matchRoute(segments, ['orgs', ':orgId', 'members']);
  if (membersParams) {
    const { orgId } = membersParams;
    if (req.method === 'GET') {
      const members = await prisma.orgMember.findMany({
        where: { orgId },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      json(res, 200, { members });
      return true;
    }
    if (req.method === 'POST') {
      const body = await parseBody<{ email: string; role: 'ADMIN' | 'DEVELOPER' | 'VIEWER' }>(req);
      const user = await prisma.user.findUnique({ where: { email: body.email } });
      if (!user) { json(res, 404, { error: 'User not found' }); return true; }
      const member = await prisma.orgMember.create({
        data: { userId: user.id, orgId, role: body.role },
      });
      await audit.log({ userId: payload.sub, orgId, action: 'member.invite', resource: user.id });
      json(res, 201, member);
      return true;
    }
  }

  // DELETE /api/orgs/:orgId/members/:memberId
  const memberParams = matchRoute(segments, ['orgs', ':orgId', 'members', ':memberId']);
  if (memberParams && req.method === 'DELETE') {
    const { orgId, memberId } = memberParams;
    await prisma.orgMember.delete({ where: { id: memberId } });
    await audit.log({ userId: payload.sub, orgId, action: 'member.remove', resource: memberId });
    json(res, 204, {});
    return true;
  }

  return false;
}
