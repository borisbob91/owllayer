import { BrowserDomOSCore } from './runtime/BrowserDomOSCore.js';
import type { BrowserToolDefinition, DomOSBrowserConfig, SessionInfo } from './types.js';

const runtime = new BrowserDomOSCore();

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
  onResponse(cb: (text: string, done: boolean) => void): void {
    runtime.onResponse(cb);
  },
  onError(cb: (error: Error) => void): void {
    runtime.onError(cb);
  },
  onReady(cb: () => void): void {
    runtime.onReady(cb);
  },
  onToolCall(cb: (name: string, args: Record<string, unknown>) => void): void {
    runtime.onToolCall(cb);
  },
  setContext(data: Record<string, unknown>): void {
    runtime.setContext(data);
  },
  disconnect(): void {
    runtime.disconnect();
  },
  getSession(): SessionInfo {
    return runtime.getSession();
  },
};

export const init = DomOS.init.bind(DomOS);
export const registerTool = DomOS.registerTool.bind(DomOS);
export const unregisterTool = DomOS.unregisterTool.bind(DomOS);
export const updateContext = DomOS.updateContext.bind(DomOS);
export const sendText = DomOS.sendText.bind(DomOS);
export const destroy = DomOS.destroy.bind(DomOS);
export const onResponse = DomOS.onResponse.bind(DomOS);
export const onError = DomOS.onError.bind(DomOS);
export const onReady = DomOS.onReady.bind(DomOS);
export const onToolCall = DomOS.onToolCall.bind(DomOS);
export const setContext = DomOS.setContext.bind(DomOS);
export const disconnect = DomOS.disconnect.bind(DomOS);
export const getSession = DomOS.getSession.bind(DomOS);

export type { BrowserToolDefinition, DomOSBrowserConfig, SessionInfo };
