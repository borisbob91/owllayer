const BASE = '/admin';
const SESSION_TOKEN_STORAGE = 'owllayer_admin_session';

export function getAdminKey(): string | null {
  return localStorage.getItem(SESSION_TOKEN_STORAGE);
}

export function setAdminKey(token: string): void {
  localStorage.setItem(SESSION_TOKEN_STORAGE, token);
}

export function clearAdminKey(): void {
  localStorage.removeItem(SESSION_TOKEN_STORAGE);
}

function getAuthHeaders(): Record<string, string> {
  const token = getAdminKey();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  setAdminKey(data.token);
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function deleteJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Types
export interface StatusData {
  uptime: number;
  version: string;
  activeSessions: number;
  activeConnections: number;
  serverTools: string[];
  pendingToolCalls: number;
}

export interface SessionSummary {
  id: string;
  apiKey: string;
  state: string;
  createdAt: number;
  lastActivityAt: number;
  messageCount: number;
  toolCallCount: number;
  currentUrl: string | null;
}

export interface SessionDetail {
  id: string;
  state: string;
  conversation: { role: string; content: string }[];
  tools: { name: string; description: string }[];
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
}

export interface ToolsData {
  serverTools: string[];
  clientTools: Record<string, ToolDecl[]>;
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
  total: number;
  available: number;
  busy: number;
  lines: LineData[];
  waitingLine: {
    number: string;
    state: string;
    sessionId: string | null;
  };
}

export interface LineAcquireResponse {
  success: boolean;
  lineNumber?: string;
  token?: string;
  waiting?: boolean;
  error?: string;
}

export interface LinesResponse {
  pools: LinePoolData[];
  enabled: boolean;
}

export interface ApiKeyEntry {
  key: string;
  masked: string;
  name?: string;
  description?: string;
  clientType?: string[];
  createdAt?: number;
}

export interface ApiKeysResponse {
  keys: ApiKeyEntry[];
  enabled: boolean;
}

export interface SystemPromptConfig {
  name?: string;
  language?: string;
  role: string;
  personality?: string;
  capabilities?: string[];
  rules?: string[];
  context?: string;
  toolInstructions?: string;
  responseFormat?: string;
  sections?: Record<string, string | string[]>;
}

export type SystemPromptValue = string | SystemPromptConfig;

export interface PromptEntry {
  apiKey: string;
  prompt: SystemPromptValue;
}

export interface PromptsResponse {
  prompts: PromptEntry[];
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
}

// API
export const api = {
  getStatus: () => fetchJSON<StatusData>('/status'),
  getSessions: () => fetchJSON<{ sessions: SessionSummary[] }>('/sessions').then(r => r.sessions),
  getSession: (id: string) => fetchJSON<SessionDetail>(`/sessions/${id}`),
  deleteSession: (id: string) => deleteJSON<{ ok: boolean; deleted: string }>(`/sessions/${id}`),
  getTools: () => fetchJSON<ToolsData>('/tools'),
  getMetrics: () => fetchJSON<MetricsData>('/metrics'),
  getApiKeys: () => fetchJSON<ApiKeysResponse>('/client/keys'),
  addApiKey: (apiKey: string, opts?: { name?: string; description?: string; clientType?: string[] }) => postJSON<{ success: boolean; apiKey: string }>('/client/keys', { apiKey, ...opts }),
  deleteApiKey: (key: string) => deleteJSON<{ success: boolean; deleted: string }>(`/client/keys/${encodeURIComponent(key)}`),
  getPrompts: () => fetchJSON<PromptsResponse>('/prompts'),
  getPrompt: (apiKey: string) => fetchJSON<PromptEntry>(`/prompts/${encodeURIComponent(apiKey)}`),
  setPrompt: (apiKey: string, prompt: SystemPromptValue) => postJSON<{ success: boolean }>('/prompts', { apiKey, prompt }),
  deletePrompt: (apiKey: string) => deleteJSON<{ success: boolean }>(`/prompts/${encodeURIComponent(apiKey)}`),
  getLines: () => fetchJSON<LinesResponse>('/lines'),
  getLinesByApiKey: (apiKey: string) => fetchJSON<LinePoolData>(`/lines/${encodeURIComponent(apiKey)}`),
  acquireLine: (apiKey: string) => postJSON<LineAcquireResponse>('/lines/acquire', { apiKey }),
  releaseLine: (token: string) => postJSON<{ success: boolean }>('/lines/release', { token }),
  getCapabilities: () => fetchJSON<ServerCapabilities>('/capabilities'),
};
