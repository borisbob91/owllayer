// ============================================================
// @owllayer/svelte - OwlLayer Svelte SDK
// Stores, Actions, Composants pour UI Agentique
// ============================================================

// --- Stores ---
export {
  owlLayerClient,
  agentState,
  sessionId,
  lastResponse,
  pendingApproval,
  hitlLabels,
  isConnected,
  isThinking,
  isSpeaking,
  initOwlLayer,
  sendText,
  sendAudio,
  sendAudioStream,
  onAudioOutput,
  subscribeEvent,
  subscribeAnyEvent,
  approveAction,
  denyAction,
  setClientLanguage,
} from './stores/owllayer.store.js';

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
export { default as OwlLayerWidget } from './components/widget/OwlLayerWidget.svelte';

// --- Plugin UI ---
export { getPluginComponent } from './plugins/pluginComponents.js';

// --- Agentic UI: Co-located tools ---
export { default as OwlLayerTool } from './components/tool/OwlLayerTool.svelte';
export { default as OwlLayerToolBtn } from './components/tool/OwlLayerToolBtn.svelte';
