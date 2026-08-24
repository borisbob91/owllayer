// ============================================================
// @owllayer/vue - OwlLayer Vue SDK
// Composables, Plugin, Composants pour UI Agentique
// ============================================================

// --- Plugin ---
export { OwlLayerPlugin } from './plugin/OwlLayerPlugin.js';
export type { OwlLayerPluginOptions, OwlLayerReactiveState, PendingApproval } from './plugin/OwlLayerPlugin.js';

// --- Composables ---
export { useAgent } from './composables/useAgent.js';
export { useAgentTool } from './composables/useAgentTool.js';
export { useAgentToolResolver } from './composables/useAgentToolResolver.js';
export { useNavigationTool } from './composables/useNavigationTool.js';
export { useViewStateTool } from './composables/useViewStateTool.js';
export type { AgentToolDefinition } from './composables/useAgentTool.js';
export type { NavigateToolArgs, NavigationToolOptions } from './composables/useNavigationTool.js';
export type { ViewStateToolArgs } from './composables/useViewStateTool.js';
export { useAgentContext } from './composables/useAgentContext.js';
export { useApproval } from './composables/useApproval.js';
export { useVoiceMode } from './composables/useVoiceMode.js';
export { useOwlLayerEvent, useOwlLayerAnyEvent } from './composables/useOwlLayerEvent.js';

// --- Resolver (centralized tools) ---
export {
  createResolverFromSwitch,
  createCRUDResolver,
} from './composables/resolverHelpers.js';
export type {
  ResolverConfig,
  ResolverToolDefinition,
  ResolverToolGroup,
  UseAgentToolResolverOptions,
  UseAgentToolResolverResult,
} from './composables/types/resolver.js';

// --- Components ---
export { default as AgentIndicator } from './components/agentic-ui.Indicator.vue';
export { default as ApprovalModal } from './components/hitl.ApprovalModal.vue';
export { default as ApprovalBanner } from './components/hitl.ApprovalBanner.vue';

// --- Agentic UI: Co-located tools ---
export { default as OwlLayerTool } from './components/tool/OwlLayerTool.vue';
export { default as OwlLayerToolBtn } from './components/tool/OwlLayerToolBtn.vue';
export type { OwlLayerToolProps, OwlLayerToolBtnProps, OwlLayerToolBaseProps, RiskLevel } from './components/tool/types.js';

// --- Widget (Chat UI complète) ---
export { default as OwlLayerWidget } from './components/widget/OwlLayerWidget.vue';

// --- Plugin UI ---
export { usePluginComponents } from './plugins/usePluginComponents.js';
export { useDevTools } from './composables/useDevTools.js';
export type { UseDevToolsOptions } from './composables/useDevTools.js';
