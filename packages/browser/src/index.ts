import { BrowserDomOS } from './runtime/BrowserDomOS.js';
import type { AgentState, BrowserToolDefinition, DomOSBrowserConfig, SessionInfo, VoiceState } from './types.js';
import type { AgentMemorySnapshot } from '@domos/core';

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
  // --- Mémoire standalone (DomosAgent) ---
  getMemorySnapshot(): AgentMemorySnapshot | null {
    return runtime.getMemorySnapshot();
  },
  addFeedback(feedback: { type: 'positive' | 'negative' | 'correction' | 'suggestion'; message: string; score?: number }): void {
    runtime.addFeedback(feedback);
  },
};

export const init = DomOS.init;
export const registerTool = DomOS.registerTool;
export const unregisterTool = DomOS.unregisterTool;
export const updateContext = DomOS.updateContext;
export const sendText = DomOS.sendText;
export const destroy = DomOS.destroy;
export const onResponse = DomOS.onResponse;
export const onError = DomOS.onError;
export const onReady = DomOS.onReady;
export const onToolCall = DomOS.onToolCall;
export const setContext = DomOS.setContext;
export const disconnect = DomOS.disconnect;
export const getSession = DomOS.getSession;
export const startVoice = DomOS.startVoice.bind(DomOS);
export const stopVoice = DomOS.stopVoice;
export const muteMic = DomOS.muteMic;
export const isVoiceActive = DomOS.isVoiceActive;
export const getVoiceState = DomOS.getVoiceState;
export const onAgentStateChange = DomOS.onAgentStateChange.bind(DomOS);
export const getAgentState = DomOS.getAgentState.bind(DomOS);
export const getMemorySnapshot = DomOS.getMemorySnapshot.bind(DomOS);
export const addFeedback = DomOS.addFeedback.bind(DomOS);
export const openWidget = DomOS.openWidget.bind(DomOS);

export type { AgentState, BrowserToolDefinition, DomOSBrowserConfig, SessionInfo, VoiceState } from './types.js';
export type { AgentMemorySnapshot } from '@domos/core';

if (typeof window !== 'undefined') {
  (window as unknown as { DomOS?: typeof DomOS }).DomOS = DomOS;
}
