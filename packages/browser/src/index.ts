import { BrowserOwlLayer } from './runtime/BrowserOwlLayer.js';
import type { AgentState, BrowserToolDefinition, OwlLayerBrowserConfig, SessionInfo, VoiceState } from './types.js';
import type {
  AgentMemorySnapshot,
  OwlLayerClientAnyEventListener,
  OwlLayerClientEvent,
  OwlLayerClientEventListener,
  OwlLayerClientEventType,
} from '@owllayer/core';

const runtime = new BrowserOwlLayer();

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
  // --- Etat agent ---
  onAgentStateChange(cb: (state: AgentState) => void): void {
    runtime.onAgentStateChange(cb);
  },
  getAgentState(): AgentState {
    return runtime.getAgentState();
  },
  // --- Voix ---
  async startVoice(): Promise<void> {
    return runtime.startVoice();
  },
  stopVoice(): void {
    runtime.stopVoice();
  },
  muteMic(): void {
    runtime.muteMic();
  },
  isVoiceActive(): boolean {
    return runtime.isVoiceActive();
  },
  getVoiceState(): VoiceState {
    return runtime.getVoiceState();
  },
  // --- Widget ---
  openWidget(): void {
    runtime.openWidget();
  },
  // --- Mémoire standalone (OwlLayerAgent) ---
  getMemorySnapshot(): AgentMemorySnapshot | null {
    return runtime.getMemorySnapshot();
  },
  addFeedback(feedback: { type: 'positive' | 'negative' | 'correction' | 'suggestion'; message: string; score?: number }): void {
    runtime.addFeedback(feedback);
  },
  // --- DevTools ---
  getRegisteredTools() {
    return runtime.getRegisteredTools();
  },
  callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    return runtime.callTool(name, args);
  },
  mountDevTools(container?: HTMLElement): Promise<void> {
    return runtime.mountDevTools(container);
  },
  subscribeEvent<TType extends OwlLayerClientEventType>(type: TType, listener: OwlLayerClientEventListener<TType>): () => void {
    return runtime.subscribeEvent(type, listener);
  },
  subscribeAnyEvent(listener: OwlLayerClientAnyEventListener): () => void {
    return runtime.subscribeAnyEvent(listener);
  },
};

export const init = OwlLayer.init;
export const registerTool = OwlLayer.registerTool;
export const unregisterTool = OwlLayer.unregisterTool;
export const updateContext = OwlLayer.updateContext;
export const sendText = OwlLayer.sendText;
export const destroy = OwlLayer.destroy;
export const onResponse = OwlLayer.onResponse;
export const onError = OwlLayer.onError;
export const onReady = OwlLayer.onReady;
export const onToolCall = OwlLayer.onToolCall;
export const setContext = OwlLayer.setContext;
export const disconnect = OwlLayer.disconnect;
export const getSession = OwlLayer.getSession;
export const startVoice = OwlLayer.startVoice.bind(OwlLayer);
export const stopVoice = OwlLayer.stopVoice;
export const muteMic = OwlLayer.muteMic;
export const isVoiceActive = OwlLayer.isVoiceActive;
export const getVoiceState = OwlLayer.getVoiceState;
export const onAgentStateChange = OwlLayer.onAgentStateChange.bind(OwlLayer);
export const getAgentState = OwlLayer.getAgentState.bind(OwlLayer);
export const getMemorySnapshot = OwlLayer.getMemorySnapshot.bind(OwlLayer);
export const addFeedback = OwlLayer.addFeedback.bind(OwlLayer);
export const openWidget = OwlLayer.openWidget.bind(OwlLayer);
export const subscribeEvent = OwlLayer.subscribeEvent.bind(OwlLayer);
export const subscribeAnyEvent = OwlLayer.subscribeAnyEvent.bind(OwlLayer);

export type { AgentState, BrowserToolDefinition, OwlLayerBrowserConfig, SessionInfo, VoiceState } from './types.js';
export type {
  AgentMemorySnapshot,
  OwlLayerClientAnyEventListener,
  OwlLayerClientEvent,
  OwlLayerClientEventListener,
  OwlLayerClientEventType,
  RemoteMemoryTransport,
} from '@owllayer/core';
export { LocalStorageTransport } from './runtime/LocalStorageTransport.js';

if (typeof window !== 'undefined') {
  (window as unknown as { OwlLayer?: typeof OwlLayer }).OwlLayer = OwlLayer;
}
