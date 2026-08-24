import { BrowserOwlLayerCore } from './runtime/BrowserOwlLayerCore.js';
import type { BrowserToolDefinition, OwlLayerBrowserConfig, SessionInfo } from './types.js';

const runtime = new BrowserOwlLayerCore();

export const OwlLayer = {
  init(config: OwlLayerBrowserConfig): Promise<void> {
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

export const init = OwlLayer.init.bind(OwlLayer);
export const registerTool = OwlLayer.registerTool.bind(OwlLayer);
export const unregisterTool = OwlLayer.unregisterTool.bind(OwlLayer);
export const updateContext = OwlLayer.updateContext.bind(OwlLayer);
export const sendText = OwlLayer.sendText.bind(OwlLayer);
export const destroy = OwlLayer.destroy.bind(OwlLayer);
export const onResponse = OwlLayer.onResponse.bind(OwlLayer);
export const onError = OwlLayer.onError.bind(OwlLayer);
export const onReady = OwlLayer.onReady.bind(OwlLayer);
export const onToolCall = OwlLayer.onToolCall.bind(OwlLayer);
export const setContext = OwlLayer.setContext.bind(OwlLayer);
export const disconnect = OwlLayer.disconnect.bind(OwlLayer);
export const getSession = OwlLayer.getSession.bind(OwlLayer);

export type { BrowserToolDefinition, OwlLayerBrowserConfig, SessionInfo };
