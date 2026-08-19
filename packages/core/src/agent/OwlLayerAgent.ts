import { generateId } from '../utils/uuid.js';
import type {
  AgentFeedback,
  AgentHistoryEntry,
  AgentIdentity,
  AgentMemorySnapshot,
  AgentRequestPayload,
  AgentResponsePayload,
  AgentSummaryEntry,
  OwlLayerAgentOptions,
  MemoryAdapter,
  ResetMemoryScope,
} from './agent.types.js';

const SCHEMA_VERSION = 1;

function cloneSnapshot(snapshot: AgentMemorySnapshot): AgentMemorySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as AgentMemorySnapshot;
}

function createEmptySnapshot(): AgentMemorySnapshot {
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    session: [],
    persistent: {
      preferences: {},
      objectives: [],
      history: [],
      summaries: [],
    },
    feedback: [],
    updatedAt: now,
  };
}

export class OwlLayerAgent {
  private identity: AgentIdentity | null = null;
  private snapshot: AgentMemorySnapshot = createEmptySnapshot();
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saveInFlight: Promise<void> | null = null;
  private readonly adapter: MemoryAdapter | null;
  private readonly saveDebounceMs: number;
  private readonly maxSessionEntries: number;
  private readonly maxFeedbackEntries: number;

  constructor(options: OwlLayerAgentOptions = {}) {
    this.adapter = options.adapter ?? null;
    this.saveDebounceMs = options.saveDebounceMs ?? 300;
    this.maxSessionEntries = options.maxSessionEntries ?? 100;
    this.maxFeedbackEntries = options.maxFeedbackEntries ?? 100;
  }

  async init(identity: AgentIdentity, seedContext?: Record<string, unknown>): Promise<void> {
    this.identity = identity;

    const persisted = this.adapter
      ? await this.adapter.loadMemory(identity)
      : null;

    this.snapshot = persisted ? cloneSnapshot(persisted) : createEmptySnapshot();
    if (seedContext && Object.keys(seedContext).length > 0) {
      this.pushHistory({
        id: generateId(),
        type: 'seed_context',
        payload: seedContext,
        timestamp: Date.now(),
      });
    }
    this.snapshot.updatedAt = Date.now();
    this.dirty = false;
  }

  onUserRequest(payload: AgentRequestPayload | string): void {
    const normalized = typeof payload === 'string' ? { content: payload } : payload;
    this.snapshot.session.push({
      id: generateId(),
      role: 'user',
      content: normalized.content,
      timestamp: Date.now(),
      contextSnapshot: normalized.contextSnapshot,
      metadata: normalized.metadata,
    });
    this.truncateSession();
    this.markDirtyAndScheduleSave();
  }

  onAgentResponse(payload: AgentResponsePayload | string): void {
    const normalized = typeof payload === 'string' ? { content: payload } : payload;
    this.snapshot.session.push({
      id: generateId(),
      role: 'assistant',
      content: normalized.content,
      timestamp: Date.now(),
      contextSnapshot: normalized.contextSnapshot,
      metadata: normalized.metadata,
    });
    this.pushHistory({
      id: generateId(),
      type: 'agent_response',
      payload: {
        content: normalized.content,
      },
      timestamp: Date.now(),
    });
    this.truncateSession();
    this.markDirtyAndScheduleSave();
  }

  appendSummary(text: string): void {
    const entry: AgentSummaryEntry = { text, savedAt: Date.now() };
    this.snapshot.persistent.summaries.push(entry);
    this.markDirtyAndScheduleSave();
  }

  addFeedback(feedback: Omit<AgentFeedback, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): void {
    this.snapshot.feedback.push({
      id: feedback.id ?? generateId(),
      timestamp: feedback.timestamp ?? Date.now(),
      type: feedback.type,
      message: feedback.message,
      score: feedback.score,
      metadata: feedback.metadata,
    });
    if (this.snapshot.feedback.length > this.maxFeedbackEntries) {
      this.snapshot.feedback = this.snapshot.feedback.slice(-this.maxFeedbackEntries);
    }
    this.pushHistory({
      id: generateId(),
      type: 'feedback',
      payload: {
        type: feedback.type,
        message: feedback.message,
        score: feedback.score,
      },
      timestamp: Date.now(),
    });
    this.markDirtyAndScheduleSave();
  }

  getMemorySnapshot(): AgentMemorySnapshot {
    return cloneSnapshot(this.snapshot);
  }

  resetMemory(scope: ResetMemoryScope = 'all'): void {
    switch (scope) {
      case 'session':
        this.snapshot.session = [];
        break;
      case 'persistent':
        this.snapshot.persistent = {
          preferences: {},
          objectives: [],
          history: [],
          summaries: [],
        };
        break;
      case 'feedback':
        this.snapshot.feedback = [];
        break;
      case 'all':
      default:
        this.snapshot = createEmptySnapshot();
        break;
    }
    this.markDirtyAndScheduleSave();
  }

  async flush(): Promise<void> {
    if (!this.identity || !this.adapter) {
      return;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.persistNow();
  }

  async close(): Promise<void> {
    await this.flush();
    await this.adapter?.close?.();
  }

  private pushHistory(entry: AgentHistoryEntry): void {
    this.snapshot.persistent.history.push(entry);
    if (this.snapshot.persistent.history.length > 500) {
      this.snapshot.persistent.history = this.snapshot.persistent.history.slice(-500);
    }
  }

  private truncateSession(): void {
    if (this.snapshot.session.length > this.maxSessionEntries) {
      this.snapshot.session = this.snapshot.session.slice(-this.maxSessionEntries);
    }
  }

  private markDirtyAndScheduleSave(): void {
    this.snapshot.updatedAt = Date.now();
    this.dirty = true;

    if (!this.identity || !this.adapter) {
      return;
    }

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.persistNow();
    }, this.saveDebounceMs);
  }

  private async persistNow(): Promise<void> {
    if (!this.identity || !this.adapter || !this.dirty) {
      return;
    }

    if (this.saveInFlight) {
      await this.saveInFlight;
      if (!this.dirty) {
        return;
      }
    }

    const snapshot = cloneSnapshot(this.snapshot);
    this.saveInFlight = this.adapter.saveMemory(this.identity, snapshot);
    try {
      await this.saveInFlight;
      this.dirty = false;
    } finally {
      this.saveInFlight = null;
    }
  }
}

