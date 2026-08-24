import type { AgentIdentity, AgentMemorySnapshot, MemoryAdapter } from '@owllayer/core';

export type AgentMemoryProvider = 'memory' | 'sqlite' | 'mongo';

export interface BaseAgentMemoryConfig {
  provider: AgentMemoryProvider;
}

export interface MemoryProviderConfig extends BaseAgentMemoryConfig {
  provider: 'memory';
}

export interface SQLiteProviderConfig extends BaseAgentMemoryConfig {
  provider: 'sqlite';
  sqlitePath?: string;
  journalMode?: 'WAL' | 'DELETE';
}

export interface MongoProviderConfig extends BaseAgentMemoryConfig {
  provider: 'mongo';
  uri: string;
  database?: string;
  collection?: string;
}

export type AgentMemoryConfig = MemoryProviderConfig | SQLiteProviderConfig | MongoProviderConfig;

export interface AgentMemoryRecord {
  identity: AgentIdentity;
  snapshot: AgentMemorySnapshot;
  updatedAt: number;
}

export interface AgentMemoryStore extends MemoryAdapter {}
