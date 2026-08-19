import type { SystemPrompt, SystemPromptConfig } from '@owllayer/core';

// ================================================================
// @owllayer/ui — dashboard/api.ts
// Couche HTTP admin. Token stocké en sessionStorage (pas localStorage).
// Toutes les requêtes sont authentifiées via Bearer token.
// ================================================================

const storeKey = (url: string): string =>
  `owllayer_ui_${(url.split('//')[1] ?? 'local').replace(/\W/g, '_').slice(0, 24)}`;

export function getToken(serverUrl: string): string | null {
  return sessionStorage.getItem(storeKey(serverUrl));
}

export function saveToken(serverUrl: string, token: string): void {
  sessionStorage.setItem(storeKey(serverUrl), token);
}

export function clearToken(serverUrl: string): void {
  sessionStorage.removeItem(storeKey(serverUrl));
}

export async function loginRequest(
  serverUrl: string,
  username: string,
  password: string,
): Promise<string> {
  const base = serverUrl ? `${serverUrl}/admin` : '/admin';
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  }
  return data.token as string;
}

// ---- Types ----

export interface StatusData {
  uptime: number;
  version: string;
  activeSessions: number;
  activeConnections: number;
  serverTools: string[];
  pendingToolCalls: number;
  bridge?: BridgeStatsData;
  activeAgents?: Array<{
    agentName: string;
    keyId: string;
    apiKey: string;
    apiKeyName?: string;
    sessions: number;
    lastActivityAt: number;
    currentUrl: string | null;
  }>;
}

export interface SessionSummary {
  id: string;
  apiKey: string;
  keyId?: string;
  apiKeyName?: string;
  clientType?: string[];
  agentName?: string;
  promptSource?: 'dashboardOverride' | 'codeDefault' | 'none';
  promptUpdatedAt?: number;
  state: string;
  createdAt: number;
  lastActivityAt: number;
  messageCount: number;
  toolCallCount: number;
  currentUrl: string | null;
  toolsCount?: number;
  effectiveToolsCount?: number;
}

export interface SessionDetail {
  id: string;
  apiKey: string;
  keyId?: string;
  apiKeyName?: string;
  clientType?: string[];
  agentName?: string;
  promptSource?: 'dashboardOverride' | 'codeDefault' | 'none';
  promptUpdatedAt?: number;
  state: string;
  conversation: { role: string; content: string }[];
  tools: ToolDecl[];
  effectiveTools?: ToolDecl[];
  serverTools?: ToolDecl[];
  ignoredClientTools?: ToolDecl[];
  graph: {
    pageHistory: { url: string; visitedAt: number }[];
    topTools: { name: string; count: number }[];
    metrics: {
      totalMessages: number;
      totalToolCalls: number;
      totalTokensIn: number;
      totalTokensOut: number;
      errors: number;
    };
  };
  context: { url: string; data: Record<string, unknown> };
}

export interface ToolParameterProp {
  type: string;
  description?: string;
  enum?: string[];
}

export interface ToolParameters {
  type: string;
  properties: Record<string, ToolParameterProp>;
  required?: string[];
}

export interface ToolDecl {
  name: string;
  description: string;
  parameters?: ToolParameters;
  risk?: 'none' | 'low' | 'high' | 'critical';
  source?: 'server' | 'client';
}

export interface ToolsData {
  serverTools: string[];
  serverToolDeclarations?: ToolDecl[];
  clientTools: Record<string, ToolDecl[]>;
  effectiveToolsBySession?: Record<string, ToolDecl[]>;
  ignoredClientToolsBySession?: Record<string, ToolDecl[]>;
}

export interface BridgeSessionData {
  sessionId: string;
  roomName: string;
  agentIdentity: string;
  startedAt: number;
}

export interface BridgeEventData {
  type: string;
  sessionId?: string;
  message?: string;
  reason?: string;
  toolName?: string;
  roomName?: string;
  toolCount?: number;
}

export interface BridgeStatsData {
  enabled: boolean;
  activeBridges: number;
  sessions: BridgeSessionData[];
  events?: BridgeEventData[];
  lastError?: string;
  provider?: string;
  urlConfigured?: boolean;
  model?: string;
  voice?: string;
}

export interface MetricsData {
  global: {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
    totalToolCalls: number;
    totalTokensIn: number;
    totalTokensOut: number;
    errors: number;
  };
}

export interface LineData {
  id: string;
  number: string;
  state: 'available' | 'busy' | 'waiting';
  sessionId: string | null;
  busySince: number | null;
  expiresAt: number | null;
}

export interface LinePoolData {
  apiKey: string;
  keyId: string;
  total: number;
  available: number;
  busy: number;
  lines: LineData[];
  waitingLine: LineData;
}

export interface LinesResponse {
  pools: LinePoolData[];
  enabled: boolean;
}

export interface LineAcquireResponse {
  success: boolean;
  lineNumber?: string;
  token?: string;
  waiting?: boolean;
  error?: string;
}

export interface ApiKeyEntry {
  id: string;
  publicKey?: string;
  masked: string;
  name?: string;
  description?: string;
  clientType?: string[];
  createdAt?: number;
  status?: 'active' | 'disabled' | 'revoked';
  updatedAt?: number;
  lastUsedAt?: number;
  revokedAt?: number;
  rotatedAt?: number;
}

export interface ApiKeysResponse {
  keys: ApiKeyEntry[];
  enabled: boolean;
}

export type { SystemPromptConfig };

export type SystemPromptValue = SystemPrompt;

export interface PromptEntry {
  keyId: string;
  apiKey: string;
  prompt: SystemPromptValue;
  updatedAt?: number;
}

export interface PromptsResponse {
  prompts: PromptEntry[];
}

// Capabilities types
export interface LLMModel {
  id: string;
  name: string;
  supportsAudio: boolean;
  supportsTools: boolean;
  description?: string;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
}

export interface ProviderCapabilities {
  provider: string;
  providerName: string;
  models: LLMModel[];
  voices?: VoiceInfo[];
  currentModel?: string;
  currentVoice?: string;
}

export interface SpeechCapabilities {
  provider: string;
  providerName: string;
  voices?: VoiceInfo[];
  languages?: string[];
  models?: Array<{ id: string; name: string; description?: string }>;
  currentVoice?: string;
  currentLanguage?: string;
}

export interface ServerCapabilities {
  llm: ProviderCapabilities | null;
  live: ProviderCapabilities | null;
  stt: SpeechCapabilities | null;
  tts: SpeechCapabilities | null;
  voiceConfig?: RuntimeVoiceConfigResponse;
}

export interface RuntimeVoiceConfigResponse {
  configurable: boolean;
  liveVoice?: string;
  ttsVoice?: string;
  language?: string;
}

export interface AdminEventEntry {
  id: string;
  type: string;
  at: number;
  message: string;
  data?: Record<string, unknown>;
}

// ---- Client factory ----

export function createApiClient(serverUrl: string, token: string) {
  const base = serverUrl ? `${serverUrl}/admin` : '/admin';
  const authHeader = { Authorization: `Bearer ${token}` };

  async function readApiError(res: Response): Promise<Error> {
    try {
      const data = await res.json() as { error?: string; message?: string; code?: string; remediation?: string };
      const detail = data.remediation ? `${data.message ?? data.error} ${data.remediation}` : (data.message ?? data.error);
      return new Error(detail ?? `HTTP ${res.status}: ${res.statusText}`);
    } catch {
      return new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
  }

  async function fetchJSON<T>(path: string): Promise<T> {
    const res = await fetch(`${base}${path}`, { headers: authHeader });
    if (!res.ok) throw await readApiError(res);
    return res.json() as Promise<T>;
  }

  async function deleteReq<T>(path: string): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    if (!res.ok) throw await readApiError(res);
    return res.json() as Promise<T>;
  }

  async function postJSON<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await readApiError(res);
    return res.json() as Promise<T>;
  }

  return {
    logout: () => postJSON<{ success: boolean }>('/logout', {}),
    getStatus: () => fetchJSON<StatusData>('/status'),
    getBridge: () => fetchJSON<BridgeStatsData>('/bridge'),
    getBridgeEvents: () => fetchJSON<{ events: BridgeEventData[] }>('/bridge/events'),
    getSessions: () =>
      fetchJSON<{ sessions: SessionSummary[] }>('/sessions').then(r => r.sessions),
    getSession: (id: string) => fetchJSON<SessionDetail>(`/sessions/${id}`),
    deleteSession: (id: string) => deleteReq<{ ok: boolean }>(`/sessions/${id}`),
    getTools: () => fetchJSON<ToolsData>('/tools'),
    getMetrics: () => fetchJSON<MetricsData>('/metrics'),
    getEvents: () => fetchJSON<{ events: AdminEventEntry[] }>('/events'),
    getApiKeys: () => fetchJSON<ApiKeysResponse>('/client/keys'),
    addApiKey: (apiKey: string, opts?: { name?: string; description?: string; clientType?: string[] }) =>
      postJSON<{ success: boolean; id: string; publicKey?: string }>('/client/keys', { apiKey, ...opts }),
    setApiKeyStatus: (keyRef: string, status: ApiKeyEntry['status']) =>
      postJSON<{ success: boolean; status: ApiKeyEntry['status']; closedSessions?: number }>(
        `/client/keys/${encodeURIComponent(keyRef)}/status`,
        { status },
      ),
    rotateApiKey: (keyRef: string, apiKey?: string) =>
      postJSON<{ success: boolean; id: string; publicKey?: string; rotatedFrom: string; closedSessions?: number }>(
        `/client/keys/${encodeURIComponent(keyRef)}/rotate`,
        apiKey ? { apiKey } : {},
      ),
    deleteApiKey: (keyRef: string) =>
      deleteReq<{ success: boolean }>(`/client/keys/${encodeURIComponent(keyRef)}`),
    getPrompts: () => fetchJSON<PromptsResponse>('/prompts'),
    setPrompt: (keyRef: string, prompt: SystemPromptValue) =>
      postJSON<{ success: boolean }>('/prompts', { keyRef, prompt }),
    deletePrompt: (keyRef: string) =>
      deleteReq<{ success: boolean }>(`/prompts/${encodeURIComponent(keyRef)}`),
    getLines: () => fetchJSON<LinesResponse>('/lines'),
    acquireLine: (keyRef: string) =>
      postJSON<LineAcquireResponse>('/lines/acquire', { keyRef }),
    releaseLine: (lineToken: string) =>
      postJSON<{ success: boolean }>('/lines/release', { token: lineToken }),
    forceReleaseLine: (keyRef: string, lineId: string) =>
      postJSON<{ success: boolean; lineId: string; sessionId?: string | null }>(
        '/lines/force-release',
        { keyRef, lineId },
      ),
    getCapabilities: () => fetchJSON<ServerCapabilities>('/capabilities'),
    getVoiceConfig: () => fetchJSON<RuntimeVoiceConfigResponse>('/voice-config'),
    setVoiceConfig: (config: { liveVoice?: string; ttsVoice?: string; language?: string }) =>
      postJSON<{ success: boolean; voiceConfig: RuntimeVoiceConfigResponse }>('/voice-config', config),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
