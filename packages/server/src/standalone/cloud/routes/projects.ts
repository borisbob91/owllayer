import type { IncomingMessage, ServerResponse } from 'http';
import { parseBody, json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleProjects(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { audit: AuditService },
): Promise<boolean> {
  const { prisma, jwt, audit } = deps;
  const payload = authenticate(req, jwt);

  // GET/POST /api/orgs/:orgId/projects
  const listParams = matchRoute(segments, ['orgs', ':orgId', 'projects']);
  if (listParams) {
    const { orgId } = listParams;
    if (req.method === 'GET') {
      const projects = await prisma.project.findMany({ where: { orgId } });
      json(res, 200, { projects });
      return true;
    }
    if (req.method === 'POST') {
      const body = await parseBody<{ name: string; config?: Record<string, unknown> }>(req);
      const project = await prisma.project.create({
        data: { name: body.name, orgId, config: body.config ?? {} },
      });
      await audit.log({ userId: payload.sub, orgId, action: 'project.create', resource: project.id });
      json(res, 201, project);
      return true;
    }
  }

  // GET/PATCH/DELETE /api/orgs/:orgId/projects/:projectId
  const itemParams = matchRoute(segments, ['orgs', ':orgId', 'projects', ':projectId']);
  if (itemParams) {
    const { orgId, projectId } = itemParams;
    if (req.method === 'GET') {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) { json(res, 404, { error: 'Not found' }); return true; }
      json(res, 200, project);
      return true;
    }
    if (req.method === 'PATCH') {
      const body = await parseBody<{ name?: string; config?: Record<string, unknown> }>(req);
      const project = await prisma.project.update({ where: { id: projectId }, data: body });
      await audit.log({ userId: payload.sub, orgId, action: 'project.update', resource: projectId });
      json(res, 200, project);
      return true;
    }
    if (req.method === 'DELETE') {
      await prisma.project.delete({ where: { id: projectId } });
      await audit.log({ userId: payload.sub, orgId, action: 'project.delete', resource: projectId });
      json(res, 204, {});
      return true;
    }
  }

  return false;
}
