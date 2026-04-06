import type { IncomingMessage, ServerResponse } from 'http';
import { parseBody, json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleAgents(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { audit: AuditService },
): Promise<boolean> {
  const { prisma, jwt, audit } = deps;
  const payload = authenticate(req, jwt);

  // GET/POST /api/projects/:projectId/agents
  const listParams = matchRoute(segments, ['projects', ':projectId', 'agents']);
  if (listParams) {
    const { projectId } = listParams;
    if (req.method === 'GET') {
      const agents = await prisma.agent.findMany({ where: { projectId } });
      json(res, 200, { agents });
      return true;
    }
    if (req.method === 'POST') {
      const body = await parseBody<{ name: string; config?: Record<string, unknown> }>(req);
      const agent = await prisma.agent.create({
        data: { name: body.name, projectId, config: body.config ?? {} },
      });
      await audit.log({ userId: payload.sub, action: 'agent.create', resource: agent.id });
      json(res, 201, agent);
      return true;
    }
  }

  // PATCH/DELETE /api/projects/:projectId/agents/:agentId
  const itemParams = matchRoute(segments, ['projects', ':projectId', 'agents', ':agentId']);
  if (itemParams) {
    const { projectId, agentId } = itemParams;
    if (req.method === 'PATCH') {
      const body = await parseBody<{ name?: string; config?: Record<string, unknown> }>(req);
      const agent = await prisma.agent.update({ where: { id: agentId }, data: body });
      await audit.log({ userId: payload.sub, action: 'agent.update', resource: agentId });
      json(res, 200, agent);
      return true;
    }
    if (req.method === 'DELETE') {
      await prisma.agent.delete({ where: { id: agentId } });
      await audit.log({ userId: payload.sub, action: 'agent.delete', resource: agentId });
      json(res, 204, {});
      return true;
    }
    void projectId;
  }

  return false;
}
