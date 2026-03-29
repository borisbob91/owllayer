import type { IncomingMessage, ServerResponse } from 'http';
import { parseBody, json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleLines(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { audit: AuditService },
): Promise<boolean> {
  const { prisma, jwt, audit } = deps;
  const payload = authenticate(req, jwt);

  // GET/POST /api/projects/:projectId/lines
  const listParams = matchRoute(segments, ['projects', ':projectId', 'lines']);
  if (listParams) {
    const { projectId } = listParams;
    if (req.method === 'GET') {
      const lines = await prisma.virtualLine.findMany({ where: { projectId } });
      json(res, 200, { lines });
      return true;
    }
    if (req.method === 'POST') {
      const body = await parseBody<{ name: string; agentId?: string; config?: Record<string, unknown> }>(req);
      const line = await prisma.virtualLine.create({
        data: { name: body.name, projectId, agentId: body.agentId, config: body.config ?? {} },
      });
      await audit.log({ userId: payload.sub, action: 'line.create', resource: line.id });
      json(res, 201, line);
      return true;
    }
  }

  // PATCH/DELETE /api/projects/:projectId/lines/:lineId
  const itemParams = matchRoute(segments, ['projects', ':projectId', 'lines', ':lineId']);
  if (itemParams) {
    const { lineId } = itemParams;
    if (req.method === 'PATCH') {
      const body = await parseBody<{ name?: string; agentId?: string; config?: Record<string, unknown> }>(req);
      const line = await prisma.virtualLine.update({ where: { id: lineId }, data: body });
      await audit.log({ userId: payload.sub, action: 'line.update', resource: lineId });
      json(res, 200, line);
      return true;
    }
    if (req.method === 'DELETE') {
      await prisma.virtualLine.delete({ where: { id: lineId } });
      await audit.log({ userId: payload.sub, action: 'line.delete', resource: lineId });
      json(res, 204, {});
      return true;
    }
  }

  return false;
}
