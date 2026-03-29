import type { IncomingMessage, ServerResponse } from 'http';
import { json, authenticate, matchRoute, type CloudDeps } from './utils.js';
import type { AnalyticsService } from '../analytics/AnalyticsService.js';

export async function handleAnalytics(
  req: IncomingMessage,
  res: ServerResponse,
  segments: string[],
  deps: CloudDeps & { analytics: AnalyticsService },
): Promise<boolean> {
  const { jwt, analytics } = deps;
  const payload = authenticate(req, jwt);

  // GET /api/orgs/:orgId/analytics
  const summaryParams = matchRoute(segments, ['orgs', ':orgId', 'analytics']);
  if (summaryParams && req.method === 'GET') {
    const { orgId } = summaryParams;
    const url = new URL(req.url ?? '/', 'http://localhost');
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const summary = await analytics.getOrgSummary(orgId, startDate, endDate);
    json(res, 200, { summary });
    void payload;
    return true;
  }

  return false;
}
