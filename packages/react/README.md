# @owllayer/react

React SDK for **OwlLayer AI**. Build Agentic UI applications with React hooks, components, real-time voice mode, tool registration, and Human-in-the-Loop (HITL) security.

---

## Features

- **`OwlLayerProvider`**: Context provider managing the WebSocket connection, session lifecycle, and agent state.
- **`useAgentTool`**: Register reactive frontend tools directly within React components (auto-registered on mount, cleaned up on unmount).
- **`useVoiceMode`**: Integrated microphone capture, PCM streaming, voice activity detection, and interrupt handling.
- **`OwlLayerWidget`**: Turnkey floating or embedded AI chat/voice assistant widget.
- **Human-in-the-Loop (HITL)**: Built-in `ApprovalModal` and `ApprovalBanner` components for sensitive tool execution.
- **Specialized Hooks**: `useNavigationTool`, `useViewStateTool`, `useAgentContext`, `useOwlLayerEvent`.
- **LiveKit WebRTC Integration**: `useOwlLayerLiveKitRoom` hook for WebRTC voice rooms.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/react @owllayer/core react react-dom

# npm
npm install @owllayer/react @owllayer/core react react-dom

# yarn
yarn add @owllayer/react @owllayer/core react react-dom
```

---

## Quick Start

### 1. Setup the Provider

Wrap your application in `OwlLayerProvider`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { OwlLayerProvider, OwlLayerWidget } from '@owllayer/react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OwlLayerProvider
      endpoint="ws://localhost:3001/owllayer"
      apiKey="pk_dev_xxxx"
    >
      <App />
      <OwlLayerWidget agentName="Léa" agentTitle="Shopping Assistant" />
    </OwlLayerProvider>
  </React.StrictMode>
);
```

### 2. Declare Client Tools (`useAgentTool`)

Tools declared with `useAgentTool` are available to the AI only while the component is mounted:

```tsx
import React, { useState } from 'react';
import { useAgentTool } from '@owllayer/react';

export function ProductDetails({ product }) {
  const [highlighted, setHighlighted] = useState(false);

  useAgentTool({
    name: 'highlight_product',
    description: 'Highlight the current product on screen',
    parameters: {
      type: 'object',
      properties: {
        color: { type: 'string', description: 'Highlight outline color' },
      },
    },
    risk: 'none',
    handler: async ({ color }) => {
      setHighlighted(true);
      return { success: true, highlighted: true };
    },
  });

  return (
    <div className={`product-card ${highlighted ? 'border-primary' : ''}`}>
      <h2>{product.name}</h2>
      <p>{product.price} €</p>
    </div>
  );
}
```

### 3. Voice Mode (`useVoiceMode`)

```tsx
import React from 'react';
import { useVoiceMode, useAgent } from '@owllayer/react';

export function VoiceControls() {
  const { voiceState, isCapturing, isSpeaking, startVoice, stopVoice, mute } = useVoiceMode();
  const { agentState } = useAgent();

  return (
    <div>
      <p>Voice State: {voiceState}</p>
      <button onClick={isCapturing ? stopVoice : startVoice}>
        {isCapturing ? 'Stop Talking' : 'Start Voice'}
      </button>
    </div>
  );
}
```

### 4. Human-in-the-Loop (HITL) Confirmations

When a tool with `risk: 'high'` or `risk: 'critical'` is invoked, OwlLayer automatically pauses execution and requests confirmation:

```tsx
import React from 'react';
import { useApproval, ApprovalModal } from '@owllayer/react';

export function SecurityOverlay() {
  const { pendingApproval, approve, deny } = useApproval();

  if (!pendingApproval) return null;

  return (
    <ApprovalModal
      request={pendingApproval}
      onApprove={() => approve(pendingApproval.id)}
      onDeny={() => deny(pendingApproval.id)}
    />
  );
}
```

---

## Core Hooks & Components

### Hooks

| Hook | Purpose |
|---|---|
| `useAgent()` | Access global agent state (`idle`, `thinking`, `speaking`, `disconnected`), session ID, and send messages. |
| `useAgentTool(definition)` | Register a client-side tool with the server. |
| `useVoiceMode()` | Full microphone capture and audio playback control. |
| `useAgentContext(key, data)` | Sync local component state into the AI's shadow context. |
| `useNavigationTool()` | Expose router navigation actions to the AI. |
| `useApproval()` | Manage pending HITL approval requests. |
| `useOwlLayerLiveKitRoom()` | Connect to a LiveKit WebRTC room with token minting. |

### Components

| Component | Description |
|---|---|
| `<OwlLayerWidget />` | Ready-to-use floating chat and voice assistant widget. |
| `<ApprovalModal />` | Modal overlay for confirming high-risk actions. |
| `<ApprovalBanner />` | Non-blocking top banner for HITL confirmation. |
| `<AgentIndicator />` | Visual pill showing agent connection & speaking status. |
| `<ShadowContainer />` | Isolated CSS container rendering inside Shadow DOM. |

---

## License

MIT © OwlLayer
