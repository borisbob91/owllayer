// ============================================================
// @domos/vue - DomOS Vue SDK
// Composables, Plugin, Composants pour UI Agentique
// ============================================================

// --- Plugin ---
export { DomOSPlugin } from './plugin/DomOSPlugin.js';
export type { DomOSPluginOptions, DomOSReactiveState, PendingApproval } from './plugin/DomOSPlugin.js';

// --- Composables ---
export { useAgent } from './composables/useAgent.js';
export { useAgentTool } from './composables/useAgentTool.js';
export { useAgentToolResolver } from './composables/useAgentToolResolver.js';
export { useNavigationTool } from './composables/useNavigationTool.js';
export { useViewStateTool } from './composables/useViewStateTool.js';
export type { AgentToolDefinition } from './composables/useAgentTool.js';
export type { NavigateToolArgs } from './composables/useNavigationTool.js';
export type { ViewStateToolArgs } from './composables/useViewStateTool.js';
export { useAgentContext } from './composables/useAgentContext.js';
export { useApproval } from './composables/useApproval.js';
export { useVoiceMode } from './composables/useVoiceMode.js';

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

// --- Widget (Chat UI complète) ---
export { default as DomOSWidget } from './components/widget/DomOSWidget.vue';
