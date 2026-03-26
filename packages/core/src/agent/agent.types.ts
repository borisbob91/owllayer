export interface AgentIdentity {
  sessionId: string;
  userId?: string;
}

export type AgentRole = 'user' | 'assistant' | 'system';

export interface AgentSessionEntry {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: number;
  contextSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentObjective {
  id: string;
  goal: string;
  status: 'pending' | 'in-progress' | 'done';
  updatedAt: number;
  details?: string;
}

export interface AgentHistoryEntry {
  id: string;
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
}

export interface AgentSummaryEntry {
  /** Résumé complet et cumulatif généré par le LLM */
  text: string;
  /** Timestamp de la sauvegarde (Date.now()) */
  savedAt: number;
}

export interface AgentPersistentMemory {
  preferences: Record<string, unknown>;
  objectives: AgentObjective[];
  history: AgentHistoryEntry[];
  /** Résumés cumulatifs écrits par le LLM via domos_save_summary */
  summaries: AgentSummaryEntry[];
}

export interface AgentFeedback {
  id: string;
  timestamp: number;
  type: 'positive' | 'negative' | 'correction' | 'suggestion';
  message: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentMemorySnapshot {
  schemaVersion: number;
  session: AgentSessionEntry[];
  persistent: AgentPersistentMemory;
  feedback: AgentFeedback[];
  updatedAt: number;
}

export interface MemorySummary {
  sessionId: string;
  userId?: string;
  updatedAt: number;
}

export interface MemoryListFilter {
  userId?: string;
  updatedAfter?: number;
  limit?: number;
}

export interface MemoryAdapter {
  /** Optional name for the adapter (useful for logging) */
  name?: string;
  loadMemory(identity: AgentIdentity): Promise<AgentMemorySnapshot | null>;
  saveMemory(identity: AgentIdentity, snapshot: AgentMemorySnapshot): Promise<void>;
  appendEvent?(identity: AgentIdentity, event: AgentHistoryEntry): Promise<void>;
  listMemories?(filter?: MemoryListFilter): Promise<MemorySummary[]>;
  deleteMemory(identity: AgentIdentity): Promise<void>;
  close?(): Promise<void> | void;
}

export interface AgentRequestPayload {
  content: string;
  contextSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentResponsePayload {
  content: string;
  contextSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type ResetMemoryScope = 'all' | 'session' | 'persistent' | 'feedback';

export interface DomosAgentOptions {
  adapter?: MemoryAdapter;
  saveDebounceMs?: number;
  maxSessionEntries?: number;
  maxFeedbackEntries?: number;
}
