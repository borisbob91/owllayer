import type { DomOSServer } from '../core/DomOSServer.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    llm: { status: 'ok' | 'error'; provider?: string };
    persistence: { status: 'ok' | 'error'; type?: string };
    websocket: { status: 'ok'; connections: number };
  };
}

export function getHealthStatus(server: DomOSServer): HealthStatus {
  const checks = {
    llm: {
      status: 'ok' as const,
      provider: (server as any).getLLMProviderName?.() as string | undefined,
    },
    persistence: {
      status: 'ok' as const,
      type: (server as any).getPersistenceType?.() as string | undefined,
    },
    websocket: {
      status: 'ok' as const,
      connections: server.activeSessions ?? 0,
    },
  };

  const hasError = Object.values(checks).some((c) => c.status === 'error');
  const llmDown = checks.llm.status === 'error';

  return {
    status: llmDown ? 'unhealthy' : hasError ? 'degraded' : 'healthy',
    version: process.env.npm_package_version ?? 'unknown',
    uptime: process.uptime(),
    checks,
  };
}
