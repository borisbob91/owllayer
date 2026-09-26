// ============================================================
// @owllayer/core - OwlLayer Core Package
// Protocole AITP, Shadow Context, HITL Security, ToolRegistry
// ============================================================

// --- AITP Protocol (Agent-to-Interface Transfer Protocol) ---
export { MessageType } from './protocol/aitp.types.js';
export type {
  AITPMessage,
  AITPMessageMeta,
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
  EffectiveToolsPayload,
  ToolDeclaration,
  ToolParameters,
  ToolParameterProperty,
} from './protocol/aitp.types.js';

export { AITP_VERSION, SDK_VERSION, ErrorCode, DEFAULTS } from './protocol/aitp.constants.js';

export {
  createMessage,
  encode,
  decode,
  tryDecode,
  Messages,
} from './protocol/aitp.serializer.js';

export { validateMessage, validatePayload } from './protocol/aitp.validator.js';
export type { ValidationResult } from './protocol/aitp.validator.js';

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
  HitlLabels,
} from './security/hitl.types.js';

export { HITLPolicy } from './security/hitl.policy.js';
export type { SecurityAction } from './security/hitl.policy.js';

// --- OwlLayer Client (framework-agnostic) ---
export { OwlLayerClient } from './client/OwlLayerClient.js';
export type {
  ClientState,
  ClientTransport,
  RegisteredTool,
  PluginMeta,
  OwlLayerClientOptions,
  ClientEventHandlers,
} from './client/OwlLayerClient.js';
export { EventEmitter } from './client/EventEmitter.js';
export { OWLLAYER_CLIENT_EVENT_TYPES } from './client/events.js';
export type {
  OwlLayerClientAnyEventListener,
  OwlLayerClientEvent,
  OwlLayerClientEventListener,
  OwlLayerClientEventMap,
  OwlLayerClientEventOf,
  OwlLayerClientEventType,
  OwlLayerClientLineState,
  OwlLayerClientPlaybackSource,
  OwlLayerClientTurnSource,
} from './client/events.js';

// --- Plugins ---
export { installPlugin, assertNamespace } from './plugins/installPlugin.js';
export type {
  OwlLayerClientPlugin,
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

// --- OwlLayerAgent (frontend memory runtime) ---
export { OwlLayerAgent } from './agent/OwlLayerAgent.js';
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
  OwlLayerAgentOptions,
} from './agent/agent.types.js';
export type {
  RemoteMemoryTransport,
  RemoteMemoryAdapterOptions,
} from './agent/RemoteMemoryAdapter.js';

// --- Utils ---
export { generateId } from './utils/uuid.js';
export { createLogger, setLogLevel, LogLevel } from './utils/logger.js';
export type { Logger } from './utils/logger.js';
