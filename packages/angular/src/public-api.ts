export { DomOSAngularService } from './lib/DomOSAngularService.js';
export { injectDomOS, provideDomOS } from './lib/provideDomOS.js';
export { registerContext } from './lib/registerAgentContext.js';
export { registerNavigationTool } from './lib/registerNavigationTool.js';
export { registerToolResolver } from './lib/registerToolResolver.js';
export { registerViewStateTool } from './lib/registerViewStateTool.js';
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
} from './lib/types.js';
export type {
  ClientState,
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventType,
} from '@domos/core';