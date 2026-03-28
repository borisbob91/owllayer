// ============================================================
// @domos/svelte - DomOS Svelte SDK
// Stores, Actions, Composants pour UI Agentique
// ============================================================

// --- Stores ---
export {
  domosClient,
  agentState,
  sessionId,
  lastResponse,
  pendingApproval,
  isConnected,
  isThinking,
  isSpeaking,
  initDomOS,
  sendText,
  sendAudio,
  sendAudioStream,
  onAudioOutput,
  approveAction,
  denyAction,
} from './stores/domos.store.js';

// --- Actions ---
export { agentTool } from './actions/useAgentTool.js';
export { agentToolResolver } from './actions/agentToolResolver.js';
export { agentContext } from './actions/useAgentContext.js';
export { navigateTool } from './actions/useNavigationTool.js';
export { uiStateTool } from './actions/useViewStateTool.js';

// --- Resolver (centralized tools) ---
export {
  createResolverFromSwitch,
  createCRUDResolver,
} from './actions/resolverHelpers.js';
export type {
  ResolverConfig,
  ResolverToolDefinition,
  ResolverToolGroup,
  AgentToolResolverOptions,
  AgentToolResolverResult,
} from './actions/types/resolver.js';

// --- Composables ---
export { createAgent } from './composables/createAgent.js';
export { createVoiceMode } from './composables/createVoiceMode.js';
export { createDevTools } from './composables/createDevTools.js';
export type { CreateDevToolsOptions } from './composables/createDevTools.js';

// --- Components ---
export { default as AgentIndicator } from './components/agentic-ui.Indicator.svelte';
export { default as ApprovalModal } from './components/hitl.ApprovalModal.svelte';
export { default as ApprovalBanner } from './components/hitl.ApprovalBanner.svelte';

// --- Widget (Chat UI complète) ---
export { default as DomOSWidget } from './components/widget/DomOSWidget.svelte';

// --- Plugin UI ---
export { getPluginComponent } from './plugins/pluginComponents.js';

// --- Agentic UI: Co-located tools ---
export { default as DomOSTool } from './components/tool/DomOSTool.svelte';
export { default as DomOSToolBtn } from './components/tool/DomOSToolBtn.svelte';
