import type { IncomingMessage, ServerResponse } from 'http';
import type { PrismaClient } from '@prisma/client';
import type { JWTAuthService } from '../auth/JWTAuthService.js';
import type { StripeService } from '../billing/StripeService.js';
import type { AnalyticsService } from '../analytics/AnalyticsService.js';
import type { AuditService } from '../audit/AuditService.js';
import type { ShopifyConnector } from '../stores/ShopifyConnector.js';
import type { WooCommerceConnector } from '../stores/WooCommerceConnector.js';
import { json, getSegments } from './utils.js';
import { handleAuth } from './auth.js';
import { handleOrgs } from './orgs.js';
import { handleProjects } from './projects.js';
import { handleAgents } from './agents.js';
import { handleLines } from './lines.js';
import { handleAnalytics } from './analytics.js';
import { handleBilling } from './billing.js';
import { handleAudit } from './audit.js';
import { handleStores } from './stores.js';

export interface CloudRouterDeps {
  prisma: PrismaClient;
  jwt: JWTAuthService;
  stripe: StripeService | null;
  analytics: AnalyticsService;
  audit: AuditService;
  shopify: ShopifyConnector | null;
  woo: WooCommerceConnector | null;
}

/**
 * Cloud REST API router.
 * Returns true if the request was handled, false to fall through to the next handler.
 */
export function createCloudRouter(deps: CloudRouterDeps) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = req.url ?? '/';
    if (!url.startsWith('/api/')) return false;

    const segments = getSegments(url).slice(1); // remove 'api' prefix
    if (segments.length === 0) return false;

    try {
      const allDeps = { ...deps };

      // Auth routes: /api/auth/*
      if (segments[0] === 'auth') {
        return await handleAuth(req, res, segments, allDeps);
      }

      // Billing webhook (no JWT): /api/billing/webhook
      if (segments[0] === 'billing') {
        return await handleBilling(req, res, segments, allDeps);
      }

      // Org routes: /api/orgs/*
      if (segments[0] === 'orgs') {
        // analytics sub-route
        if (segments[2] === 'analytics') {
          return await handleAnalytics(req, res, segments, allDeps);
        }
        // billing sub-routes
        if (segments[2] === 'billing') {
          return await handleBilling(req, res, segments, allDeps);
        }
        // audit sub-route
        if (segments[2] === 'audit') {
          return await handleAudit(req, res, segments, allDeps);
        }
        // projects sub-routes
        if (segments[2] === 'projects') {
          return await handleProjects(req, res, segments, allDeps);
        }
        return await handleOrgs(req, res, segments, allDeps);
      }

      // Project-scoped routes: /api/projects/*
      if (segments[0] === 'projects') {
        if (segments[2] === 'agents') {
          return await handleAgents(req, res, segments, allDeps);
        }
        if (segments[2] === 'lines') {
          return await handleLines(req, res, segments, allDeps);
        }
        if (segments[2] === 'stores') {
          return await handleStores(req, res, segments, allDeps);
        }
      }

      // Store callbacks: /api/stores/*
      if (segments[0] === 'stores') {
        return await handleStores(req, res, segments, allDeps);
      }

      return false;
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      const status = error.statusCode ?? 500;
      json(res, status, { error: error.message ?? 'Internal Server Error' });
      return true;
    }
  };
}
