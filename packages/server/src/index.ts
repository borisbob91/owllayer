// ============================================================
// @domos/server - DomOS Server Package
// ============================================================

// --- Core ---
export { DomOSServer } from './core/DomOSServer.js';
export type { DomOSServerOptions } from './core/DomOSServer.js';

// --- Server Plugin System ---
export type { DomOSServerPlugin, ServerPluginContext, PluginCapabilities, PluginMode, PluginRuntimeOptions } from './plugins/plugin.types.js';
export { installServerPlugin } from './plugins/installServerPlugin.js';

export { SessionManager } from './core/SessionManager.js';
export type { Session, SessionState, SessionLifecycleHooks } from './core/SessionManager.js';

export { ToolRouter } from './core/ToolRouter.js';
export type { ServerToolHandler } from './core/ToolRouter.js';

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

// --- LLM (Text mode) ---
export type { LLMAdapter, LLMRequest, LLMResponse, LLMToolCall, ChatMessage } from './llm/types.js';
export { BaseLLMAdapter } from './llm/BaseLLMAdapter.js';

// --- LLM (Live Audio mode) ---
export type { LiveAdapter, LiveSession, LiveSessionConfig } from './llm/types.js';

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

export { RateLimitMiddleware, RedisRateLimiter } from './middleware/rateLimit.js';
export type { RateLimitOptions, RateLimiter, RedisRateLimitOptions } from './middleware/rateLimit.js';

export { HITLSecurityMiddleware } from './middleware/hitl.security.js';

// --- Persistence ---
export type { SessionStore, SessionData, StoreOptions } from './persistence/types.js';
export { MemoryStore } from './persistence/MemoryStore.js';
export { MongoStore } from './persistence/MongoStore.js';
export type { MongoStoreOptions } from './persistence/MongoStore.js';
export { SQLiteStore } from './persistence/SQLiteStore.js';
export type { SQLiteStoreOptions } from './persistence/SQLiteStore.js';
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
  SpeechServiceError,
} from './speech/types.js';
export { BaseSTTService } from './speech/STTService.js';
export { BaseTTSService } from './speech/TTSService.js';

// --- Speech Providers ---
export { WhisperSTT } from './speech/providers/WhisperSTT.js';
export type { WhisperSTTOptions } from './speech/providers/WhisperSTT.js';
export { OpenAITTS } from './speech/providers/OpenAITTS.js';
export type { OpenAITTSOptions } from './speech/providers/OpenAITTS.js';
export { GoogleSTT } from './speech/providers/GoogleSTT.js';
export type { GoogleSTTOptions } from './speech/providers/GoogleSTT.js';
export { GoogleTTS } from './speech/providers/GoogleTTS.js';
export type { GoogleTTSOptions } from './speech/providers/GoogleTTS.js';
export { ElevenLabsTTS } from './speech/providers/ElevenLabsTTS.js';
export type { ElevenLabsTTSOptions } from './speech/providers/ElevenLabsTTS.js';
