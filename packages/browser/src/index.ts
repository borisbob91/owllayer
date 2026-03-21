import { BrowserDomOS } from './runtime/BrowserDomOS.js';
import type { BrowserToolDefinition, DomOSBrowserConfig } from './types.js';

const runtime = new BrowserDomOS();

export const DomOS = {
  init(config: DomOSBrowserConfig): Promise<void> {
    return runtime.init(config);
  },
  registerTool(name: string, definition: BrowserToolDefinition): void {
    runtime.registerTool(name, definition);
  },
  unregisterTool(name: string): void {
    runtime.unregisterTool(name);
  },
  updateContext(data: Record<string, unknown>): void {
    runtime.updateContext(data);
  },
  sendText(text: string): void {
    runtime.sendText(text);
  },
  destroy(): void {
    runtime.destroy();
  },
};

export const init = DomOS.init;
export const registerTool = DomOS.registerTool;
export const unregisterTool = DomOS.unregisterTool;
export const updateContext = DomOS.updateContext;
export const sendText = DomOS.sendText;
export const destroy = DomOS.destroy;

export type { BrowserToolDefinition, DomOSBrowserConfig } from './types.js';

if (typeof window !== 'undefined') {
  (window as unknown as { DomOS?: typeof DomOS }).DomOS = DomOS;
}
