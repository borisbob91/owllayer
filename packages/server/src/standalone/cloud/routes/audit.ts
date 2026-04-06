import type { IncomingMessage, ServerResponse } from 'http';
import { json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { AuditService } from '../audit/AuditService.js';

export async function handleAudit(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { audit: AuditService },
): Promise<boolean> {
  const { jwt, audit } = deps;
  const payload = authenticate(req, jwt);

  // GET /api/orgs/:orgId/audit
  const auditParams = matchRoute(segments, ['orgs', ':orgId', 'audit']);
  if (auditParams && req.method === 'GET') {
    const { orgId } = auditParams;
    const url = new URL(req.url ?? '/', 'http://localhost');
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
    const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
    const logs = await audit.query({ orgId, limit, offset });
    json(res, 200, { logs });
    void payload;
    return true;
  }

  return false;
}
