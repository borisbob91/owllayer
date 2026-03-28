import { useState, useEffect, useMemo } from 'preact/hooks';
import type { DashboardConfig } from './index.js';
import { createApiClient, getToken, saveToken, clearToken, loginRequest } from './api.js';
import { Layout } from './components/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { StatusPage } from './pages/StatusPage.js';
import { SessionsPage } from './pages/SessionsPage.js';
import { SessionDetailPage } from './pages/SessionDetailPage.js';
import { ToolsPage } from './pages/ToolsPage.js';
import { MetricsPage } from './pages/MetricsPage.js';
import { LinesPage } from './pages/LinesPage.js';
import { ApiKeysPage } from './pages/ApiKeysPage.js';
import { AgentsPage } from './pages/AgentsPage.js';
import { PromptsPage } from './pages/PromptsPage.js';

function parseHash(): { page: string; id?: string } {
  const raw = window.location.hash.slice(1) || '/status';
  const segments = raw.replace(/^\//, '').split('/').filter(Boolean);
  return { page: segments[0] ?? 'status', id: segments[1] };
}

export function DashboardPanel({ config }: { config: DashboardConfig }) {
  const [token, setToken] = useState<string | null>(() => {
    if (config.token) return config.token;
    return getToken(config.serverUrl);
  });
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const api = useMemo(() => {
    if (!token) return null;
    return createApiClient(config.serverUrl, token);
  }, [config.serverUrl, token]);

  const handleLogin = async (username: string, password: string) => {
    const t = await loginRequest(config.serverUrl, username, password);
    saveToken(config.serverUrl, t);
    setToken(t);
    window.location.hash = '/status';
  };

  const handleLogout = () => {
    clearToken(config.serverUrl);
    setToken(null);
    window.location.hash = '/login';
  };

  if (!token || !api) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const { page, id } = route;

  return (
    <Layout page={page} onLogout={handleLogout}>
      {page === 'status' && <StatusPage api={api} />}
      {page === 'sessions' && !id && <SessionsPage api={api} />}
      {page === 'sessions' && id && <SessionDetailPage api={api} id={id} />}
      {page === 'tools' && <ToolsPage api={api} />}
      {page === 'metrics' && <MetricsPage api={api} />}
      {page === 'lines' && <LinesPage api={api} />}
      {page === 'apikeys' && <ApiKeysPage api={api} />}
      {page === 'agents' && <AgentsPage api={api} />}
      {page === 'prompts' && <AgentsPage api={api} />}
    </Layout>
  );
}
