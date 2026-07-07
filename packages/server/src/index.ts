// ============================================================
// @domos/server - DomOS Server Package
// ============================================================

// --- Core ---
export { DomOSServer } from './core/DomOSServer.js';
export type { DomOSServerOptions, DashboardUIOptions } from './core/DomOSServer.js';

// --- Dashboard UI Handler ---
export { DashboardUIHandler } from './admin/DashboardUIHandler.js';
export type { DashboardUIHandlerOptions } from './admin/DashboardUIHandler.js';

// --- Server Plugin System ---
export type { DomOSServerPlugin, ServerPluginContext, PluginCapabilities, PluginMode, PluginRuntimeOptions } from './plugins/plugin.types.js';
export { installServerPlugin } from './plugins/installServerPlugin.js';

export { SessionManager } from './core/SessionManager.js';
export type { Session, SessionState, SessionLifecycleHooks } from './core/SessionManager.js';

export { ToolRouter } from './core/ToolRouter.js';
export type { ServerToolDeclaration, ServerToolHandler, ServerToolMetadata, ServerToolRisk } from './core/ToolRouter.js';

// --- Transport abstrait ---
export type { Transport, TransportEvents, TransportType, ConnectionId } from './transport/Transport.js';

// --- ADTP Transport (WebSocket) ---
export { ADTPTransport } from './transport/adtp.transport.js';
export type { TransportOptions } from './transport/adtp.transport.js';

// --- WebRTC Transport ---
export { WebRTCTransport } from './transport/WebRTCTransport.js';
export type { WebRTCTransportOptions } from './transport/WebRTCTransport.js';

export { ConnectionPool } from './transport/ConnectionPool.js';
export type { ConnectionInfo } from './transport/ConnectionPool.js';

// --- Factory ---
export { createDomOSProxy } from './createDomOSProxy.js';
export type { DomOSProxyOptions } from './createDomOSProxy.js';
export { attachDomOS } from './adapters/express.js';
export type { AttachDomOSExpressOptions, ExpressLikeApp } from './adapters/express.js';

// --- LLM (Text mode) ---
export type { LLMAdapter, LLMRequest, LLMResponse, LLMToolCall, ChatMessage } from '@domos/core';
export { BaseLLMAdapter } from '@domos/core';

// --- LLM (Live Audio mode) ---
export type { LiveAdapter, LiveSession, LiveSessionConfig } from '@domos/core';

// --- Middleware ---
export { AuthMiddleware } from './middleware/auth.js';
export type { AuthResult, ApiKeyValidator } from './middleware/auth.js';

// --- Auth Managers (v0.2) ---
export { AdminAuthManager } from './auth/AdminAuthManager.js';
export { ClientAuthManager } from './auth/ClientAuthManager.js';
export type { 
  AdminAuthOptions, 
  ClientAuthOptions, 
  AdminSession,
  LoginAttempt
} from './auth/types.js';

export { HITLSecurityMiddleware } from './middleware/hitl.security.js';

// --- Persistence ---
export type { SessionStore, SessionData, StoreOptions, ApiKeyRecord, ApiKeyStore, AgentRecord, AgentStore } from './persistence/types.js';
export { MemoryStore } from './persistence/MemoryStore.js';
export { MongoStore } from './persistence/MongoStore.js';
export type { MongoStoreOptions } from './persistence/MongoStore.js';
export { SQLiteStore } from './persistence/SQLiteStore.js';
export type { SQLiteStoreOptions } from './persistence/SQLiteStore.js';
export { MemoryApiKeyStore } from './persistence/MemoryApiKeyStore.js';
export { SQLiteApiKeyStore } from './persistence/SQLiteApiKeyStore.js';
export { MongoApiKeyStore } from './persistence/MongoApiKeyStore.js';
export { MemoryAgentStore } from './persistence/MemoryAgentStore.js';
export { SQLiteAgentStore } from './persistence/SQLiteAgentStore.js';
export { MongoAgentStore } from './persistence/MongoAgentStore.js';
export type {
  AgentMemoryProvider,
  BaseAgentMemoryConfig,
  MemoryProviderConfig,
  SQLiteProviderConfig,
  MongoProviderConfig,
  AgentMemoryConfig,
  AgentMemoryRecord,
  AgentMemoryStore,
} from './persistence/agentMemory.types.js';

// --- Agent Memory ---
export { MemoryManager } from './persistence/MemoryManager.js';

// --- Memory ---
export { ConversationBuffer } from './memory/ConversationBuffer.js';
export { SessionGraph } from './memory/SessionGraph.js';

// --- Admin ---
export { AdminAPI } from './admin/AdminAPI.js';
export type { AdminAPIDeps } from './admin/AdminAPI.js';

// --- Virtual Lines ---
export { VirtualLineManager } from './lines/VirtualLineManager.js';
export type {
  VirtualLineConfig,
  VirtualLine,
  LineState,
  LineAcquireResult,
  LinePoolStatus,
} from './lines/VirtualLineManager.js';
export { LineHTTPHandler } from './lines/LineHTTPHandler.js';

// --- Speech Services (STT/TTS) ---
export type {
  STTService,
  TTSService,
  STTAudioConfig,
  STTResult,
  TTSConfig,
  TTSResult,
  Voice,
  SpeechServiceOptions,
} from '@domos/core';
export { SpeechServiceError, BaseSTTService, BaseTTSService } from '@domos/core';

// --- Speech Providers ---
export { ElevenLabsTTS } from './speech/providers/ElevenLabsTTS.js';
export type { ElevenLabsTTSOptions } from './speech/providers/ElevenLabsTTS.js';


// Capabilities types (Sprint 2)
export type { LLMAdapterCapabilities, LLMModel, VoiceInfo, SpeechCapabilities } from '@domos/core';
