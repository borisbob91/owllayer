export { DomOSAngularService } from './lib/services/DomOSAngularService.js';
export { injectDomOS, provideDomOS } from './lib/providers/provideDomOS.js';
export { registerContext } from './lib/context/registerAgentContext.js';
export { registerNavigationTool } from './lib/navigation/registerNavigationTool.js';
export { registerViewStateTool } from './lib/navigation/registerViewStateTool.js';
export { registerToolResolver } from './lib/resolver/registerToolResolver.js';
export { createResolverFromSwitch, createCRUDResolver } from './lib/resolver/resolverHelpers.js';
export { injectDomOSDevTools } from './lib/devtools/mountDevTools.js';
export { DomOSToolDirective } from './lib/directives/DomOSToolDirective.js';
export { DomOSToolButtonComponent } from './lib/components/tool/DomOSToolButtonComponent.js';
// --- Plugin UI ---
export { getPluginComponents } from './lib/plugins/getPluginComponents.js';
export { DomOSPluginOutletComponent } from './lib/plugins/DomOSPluginOutletComponent.js';
// --- Voice Service ---
export { DomOSVoiceService } from './lib/services/voice/index.js';
// --- Widget Surface ---
export { DomOSWidgetComponent } from './lib/components/widget/DomOSWidgetComponent.js';
export { DomOSApprovalModalComponent } from './lib/components/hitl/DomOSApprovalModalComponent.js';
export type { DomOSAngularDevToolsOptions } from './lib/devtools/mountDevTools.js';
export type {
  DomOSAngularConfig,
  DomOSContextInput,
  DomOSContextValue,
  DomOSNavigationArgs,
  DomOSNavigationHandler,
  DomOSNavigationOptions,
  DomOSResolverConfig,
  DomOSResolverHandle,
  DomOSResolverOptions,
  DomOSResolverToolDefinition,
  DomOSResolverToolGroup,
  DomOSToolDefinition,
  DomOSToolHandler,
  DomOSViewStateArgs,
  DomOSViewStateHandler,
  DomOSViewStateOptions,
} from './lib/types/types.js';
export type {
  ClientState,
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventType,
} from '@domos/core';