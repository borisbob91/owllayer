# API Reference

This page contains a comprehensive API reference for the classes, types, hooks, and utilities provided by the DomOS framework.

---

## 1. Client-Side Core API (`@domos/core` & `@domos/browser`)

### `DomOSClient`
The primary client-side connection manager. Handles WebSocket or WebRTC connections, tool registrations, and event dispatches.

```typescript
class DomOSClient {
  constructor(options: DomOSClientOptions);
  
  // Properties
  readonly state: ClientState; // 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'
  readonly sessionId: string | null;
  
  // Methods
  connect(): void;
  disconnect(): void;
  registerTool(name: string, definition: ToolDefinition): void;
  unregisterTool(name: string): void;
  sendInput(content: string, modality: 'text' | 'audio'): void;
  startAudioCapture(): Promise<void>;
  stopAudioCapture(): void;
  
  // Event listeners
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}
```

### `DomosAgent`
Manages the local agent runtime session state, request history, and memory caching.

```typescript
class DomosAgent {
  constructor(options: DomosAgentOptions);
  
  init(identity: { sessionId: string; userId?: string }): Promise<void>;
  onUserRequest(request: { content: string }): void;
  onAgentResponse(response: { content: string }): void;
  getMemorySnapshot(): Record<string, any>;
  flush(): Promise<void>;
}
```

### `RemoteMemoryAdapter`
Adapter to synchronize frontend `DomosAgent` state snapshots with the backend database.

```typescript
class RemoteMemoryAdapter implements MemoryAdapter {
  constructor(config: {
    transport: {
      load: (identity: MemoryIdentity) => Promise<Record<string, any>>;
      save: (identity: MemoryIdentity, snapshot: Record<string, any>) => Promise<void>;
      delete: (identity: MemoryIdentity) => Promise<void>;
    };
    enableLocalCache?: boolean; // Falls back to localStorage if network is offline
  });
}
```

---

## 2. Server-Side API (`@domos/server`)

### `DomOSServer`
Orchestrates active client WebSocket connections, coordinates LLM interactions, and executes backend server tools.

```typescript
class DomOSServer {
  constructor(options: DomOSServerOptions);
  
  listen(callback?: () => void): void;
  close(callback?: () => void): void;
  tool(name: string, handler: ToolHandler, options?: ToolOptions): void;
  installPlugin(plugin: DomOSServerPlugin, config?: any): void;
  addApiKey(key: string): void;
  removeApiKey(key: string): void;
}
```

### `DomOSServerOptions`
```typescript
interface DomOSServerOptions {
  llm: BaseLLMAdapter;
  port?: number;             // Default: 3000
  path?: string;             // Default: '/domos'
  server?: http.Server;      // Attach to custom Express/Fastify server
  toolTimeout?: number;      // Default: 30000ms
  maxConversationMessages?: number; // Default: 100
  agentMemory?: AgentMemoryConfig;
  virtualLines?: {
    lines: Array<{ apiKey: string; count: number; ttlMs: number }>;
  };
}
```

### LLM Adapters
Official adapters provided by `@domos/adapter-google` or `@domos/adapter-openai`.

```typescript
class GoogleAdapter extends BaseLLMAdapter {
  constructor(config: {
    apiKey: string;
    model?: string; // Default: 'gemini-2.0-flash'
    systemPrompt?: string | SystemPromptConfig;
  });
}
```

---

## 3. React SDK API (`@domos/react`)

### `<DomOSProvider>`
Context provider component that instantiates and injects the `DomOSClient` into your React component tree.

```typescript
interface DomOSProviderProps {
  apiKey: string;
  endpoint: string;
  plugins?: Array<[DomOSClientPlugin, any]>;
  options?: {
    reconnectDelay?: number;
    maxReconnectAttempts?: number;
  };
  children: React.ReactNode;
}
```

### `useAgent()`
Hook to access the current `DomOSClient` instance and the WebSocket connection state.

```typescript
function useAgent(): {
  client: DomOSClient | null;
  state: ClientState;
  sessionId: string | null;
  error: Error | null;
};
```

### `useAgentTool()`
Registers a client-side tool dynamically with the agent on component mount, and unregisters it on component unmount.

```typescript
function useAgentTool(
  config: {
    name: string;
    description: string;
    schema: ZodSchema;
    risk?: 'none' | 'low' | 'medium' | 'high' | 'critical'; // HITL Risk level
  },
  handler: (args: any) => Promise<any>
): void;
```

### `useVoiceMode()`
Manages microphone capture states and coordinates audio pipelines.

```typescript
function useVoiceMode(): {
  voiceState: VoiceState; // 'idle' | 'capturing' | 'awaiting_model' | 'playing' | 'interrupted'
  isCapturing: boolean;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  error: Error | null;
};
```

---

## 4. Vue SDK Composables (`@domos/vue`)

### `useAgent()`
Exposes reactive references to the client runtime state.
```typescript
function useAgent(): {
  client: Ref<DomOSClient | null>;
  state: Ref<ClientState>;
  sessionId: Ref<string | null>;
  error: Ref<Error | null>;
};
```

### `useAgentTool()`
Declares a tool within the Vue component lifecycle setup.
```typescript
function useAgentTool(
  config: {
    name: string;
    description: string;
    schema: ZodSchema;
    risk?: 'none' | 'low' | 'high';
  },
  handler: (args: any) => Promise<any>
): void;
```
