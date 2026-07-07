'use client';

// ============================================================
// @domos/react - DomOS React SDK
// Hooks, Provider, Composants pour UI Agentique
// ============================================================

// --- Provider ---
export { DomOSProvider } from './provider/DomOSProvider.js';
export type { DomOSProviderProps } from './provider/DomOSProvider.js';

export { DomOSContext } from './provider/DomOSContext.js';
export type { DomOSContextValue, AgentState, PendingApproval } from './provider/DomOSContext.js';

// --- Hooks ---
export { useAgent } from './hooks/useAgent.js';
export { useAgentTool } from './hooks/useAgentTool.js';
export { useAgentToolResolver } from './hooks/useAgentToolResolver.js';
export { useNavigationTool } from './hooks/useNavigationTool.js';
export { useViewStateTool } from './hooks/useViewStateTool.js';
export type { AgentToolDefinition } from './hooks/useAgentTool.js';
export type { NavigateToolArgs } from './hooks/useNavigationTool.js';
export type { ViewStateToolArgs } from './hooks/useViewStateTool.js';
export { useAgentContext } from './hooks/useAgentContext.js';
export { useApproval } from './hooks/useApproval.js';
export { useDomOSEvent, useDomOSAnyEvent } from './hooks/useDomOSEvent.js';

// --- Types Resolver ---
export type {
  ResolverConfig,
  ResolverToolDefinition,
  ResolverToolGroup,
  UseAgentToolResolverOptions,
  UseAgentToolResolverResult,
  RiskLevel,
} from './types/resolver.js';

// --- Utilities ---
export { createResolverFromSwitch, createCRUDResolver } from './utils/resolverHelpers.js';

// --- Voice ---
export { useVoiceMode } from './voice/useVoiceMode.js';

// --- LiveKit optional room runtime ---
export { useDomOSLiveKitRoom } from './livekit/useDomOSLiveKitRoom.js';
export type {
  DomOSLiveKitRoomFactory,
  DomOSLiveKitRoomLike,
  DomOSLiveKitRoomRuntime,
  DomOSLiveKitRoomStatus,
  DomOSLiveKitRoomTokenRequest,
  DomOSLiveKitRoomTokenResponse,
  DomOSLiveKitTokenFetcher,
  UseDomOSLiveKitRoomOptions,
  UseDomOSLiveKitRoomResult,
} from './livekit/useDomOSLiveKitRoom.js';

// --- Components (Agentic UI) ---
export { ShadowContainer } from './components/shadow-dom.Container.js';
export { ApprovalModal } from './components/hitl.ApprovalModal.js';
export { ApprovalBanner } from './components/hitl.ApprovalBanner.js';
export { AgentIndicator } from './components/agentic-ui.Indicator.js';
export { Notification } from './components/agentic-ui.Notification.js';

// --- DomOS Agentic UI: Co-located tools ---
export { DomOSTool, DomOSToolBtn } from './components/tool/index.js';
export type { DomOSToolProps, DomOSToolBtnProps, DomOSToolBaseProps } from './components/tool/index.js';

// --- Widget (Chat UI complète) ---
export { DomOSWidget } from './components/widget/DomOSWidget.js';

// --- Plugin UI ---
export { usePluginComponents } from './plugins/usePluginComponents.js';
export { PluginRenderer } from './plugins/PluginRenderer.js';
export type { PluginRendererProps } from './plugins/PluginRenderer.js';
export { PluginDevPanel } from './plugins/PluginDevPanel.js';
export type { PluginDevPanelProps } from './plugins/PluginDevPanel.js';
export { useDevTools } from './plugins/useDevTools.js';
export type { UseDevToolsOptions } from './plugins/useDevTools.js';
export type { DomOSWidgetProps } from './components/widget/DomOSWidget.js';
