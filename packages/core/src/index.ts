// ============================================================
// @domos/core - DomOS Core Package
// Protocole ADTP, Shadow Context, HITL Security, ToolRegistry
// ============================================================

// --- ADTP Protocol (Agent-to-DOM Transfer Protocol) ---
export { MessageType } from './protocol/adtp.types.js';
export type {
  ADTPMessage,
  ADTPMessageMeta,
  PayloadOf,
  InputModality,
  ToolResultStatus,
  SystemEventKind,
  HandshakeInitPayload,
  HandshakeAckPayload,
  ContextUpdatePayload,
  ToolResultPayload,
  ApprovalRequestPayload,
  ApprovalResponsePayload,
  UserInputPayload,
  ToolCallPayload,
  AudioStreamPayload,
  VoiceInputEndPayload,
  VoiceInterruptPayload,
  VoiceStateEventPayload,
  SystemEventPayload,
  ToolDeclaration,
  ToolParameters,
  ToolParameterProperty,
} from './protocol/adtp.types.js';

export { ADTP_VERSION, SDK_VERSION, ErrorCode, DEFAULTS } from './protocol/adtp.constants.js';

export {
  createMessage,
  encode,
  decode,
  tryDecode,
  Messages,
} from './protocol/adtp.serializer.js';

export { validateMessage, validatePayload } from './protocol/adtp.validator.js';
export type { ValidationResult } from './protocol/adtp.validator.js';

// --- Tools ---
export { RiskLevel } from './tools/types.js';
export type {
  ToolDefinition,
  ToolExecutionResult,
  ToolRegistryDiff,
} from './tools/types.js';
export { toDeclaration } from './tools/types.js';

export { zodToToolParameters } from './tools/schema.js';

export { ToolRegistry } from './tools/registry.js';
export { createUiStateSchema } from './tools/schema.helpers.js';

// --- Shadow Context ---
export type {
  ShadowContext,
  ContextChangeEvent,
  ContextDiffResult,
} from './context/shadow-context.types.js';

export { diffContext, hasChanges, createEmptyContext } from './context/shadow-context.differ.js';

// --- HITL Security (Human-in-the-Loop) ---
export type {
  ApprovalRequest,
  ApprovalResponse,
} from './security/hitl.types.js';

export { HITLPolicy } from './security/hitl.policy.js';
export type { SecurityAction } from './security/hitl.policy.js';

// --- DomOS Client (framework-agnostic) ---
export { DomOSClient } from './client/DomOSClient.js';
export type {
  ClientState,
  ClientTransport,
  RegisteredTool,
  PluginMeta,
  DomOSClientOptions,
  ClientEventHandlers,
} from './client/DomOSClient.js';
export { EventEmitter } from './client/EventEmitter.js';
export { DOMOS_CLIENT_EVENT_TYPES } from './client/events.js';
export type {
  DomOSClientAnyEventListener,
  DomOSClientEvent,
  DomOSClientEventListener,
  DomOSClientEventMap,
  DomOSClientEventOf,
  DomOSClientEventType,
  DomOSClientLineState,
  DomOSClientPlaybackSource,
  DomOSClientTurnSource,
} from './client/events.js';

// --- Plugins ---
export { installPlugin, assertNamespace } from './plugins/installPlugin.js';
export type {
  DomOSClientPlugin,
  PluginClientContext,
  PluginToolDefinition,
  PluginEntry,
} from './plugins/plugin.types.js';
export type { PluginUIDeclaration, PluginComponentMap } from './plugins/ui.types.js';

// --- System Prompt ---
export type { SystemPromptConfig, SystemPrompt } from './prompt/SystemPromptConfig.js';
export { compileSystemPrompt, resolveSystemPrompt } from './prompt/SystemPromptConfig.js';

// --- Widget ---
export type {
  WidgetMode,
  WidgetPosition,
  WidgetStylePreset,
  WidgetVisualState,
  WidgetTheme,
  WidgetLabels,
  WidgetMessage,
  WidgetConfig,
} from './widget/widget.types.js';
export { DEFAULT_THEME, DEFAULT_LABELS, DEFAULT_WIDGET_CONFIG } from './widget/widget.constants.js';
export { WIDGET_STYLES, generateWidgetStyles } from './widget/widget.styles.js';

// --- Voice State Machine ---
export { VoiceStateMachine } from './voice/VoiceStateMachine.js';
export type { VoiceState, VoiceEvent, VoiceStateMachineOptions } from './voice/VoiceStateMachine.js';
export * from './voice/index.js';

// --- DomosAgent (frontend memory runtime) ---
export { DomosAgent } from './agent/DomosAgent.js';
export { RemoteMemoryAdapter } from './agent/RemoteMemoryAdapter.js';
export { LocalStorageTransport } from './agent/LocalStorageTransport.js';
export { getBrowserId } from './agent/getBrowserId.js';
export { registerMemoryTools } from './agent/registerMemoryTools.js';
export type {
  AgentIdentity,
  AgentRole,
  AgentSessionEntry,
  AgentObjective,
  AgentHistoryEntry,
  AgentSummaryEntry,
  AgentPersistentMemory,
  AgentFeedback,
  AgentMemorySnapshot,
  MemorySummary,
  MemoryListFilter,
  MemoryAdapter,
  AgentRequestPayload,
  AgentResponsePayload,
  ResetMemoryScope,
  DomosAgentOptions,
} from './agent/agent.types.js';
export type {
  RemoteMemoryTransport,
  RemoteMemoryAdapterOptions,
} from './agent/RemoteMemoryAdapter.js';

// --- Utils ---
export { generateId } from './utils/uuid.js';
export { createLogger, setLogLevel, LogLevel } from './utils/logger.js';
export type { Logger } from './utils/logger.js';
