import type { ToolParameters, WidgetConfig } from '@domos/core';

export type BrowserToolRisk = 'none' | 'low' | 'high' | 'critical';

export interface BrowserToolDefinition {
  description: string;
  parameters?: ToolParameters;
  risk?: BrowserToolRisk;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface DomOSBrowserConfig {
  apiKey: string;
  endpoint: string;
  debug?: boolean;
  autoConnect?: boolean;
  context?: Record<string, unknown>;
  widget?: {
    enabled?: boolean;
    config?: WidgetConfig;
  };
  hitl?: {
    enabled?: boolean;
  };
  autoDiscovery?: {
    enabled?: boolean;
  };
  sessionPersistence?: {
    enabled?: boolean;
    ttlMs?: number;
  };
}

export interface PersistedBrowserSession {
  version: 1;
  savedAt: number;
  expiresAt: number;
  sessionId: string | null;
  context: Record<string, unknown>;
  recentMessages: Array<{ role: 'user' | 'agent'; content: string; timestamp: number }>;
}

export interface DiscoveredToolConfig {
  name: string;
  description: string;
  risk: BrowserToolRisk;
  action: 'click' | 'focus' | 'scrollIntoView' | 'setValue';
  selector?: string;
}
