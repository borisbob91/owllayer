# Chat Widget UI Component

The Agentic UI SDK provides a pre-built, injectable UI component called **`DomOSWidget`**. This component renders a float chat bubble panel (supporting text messaging and real-time PCM voice streaming) in just a few lines of code.

---

## 1. Key Features

- **Floating Action Button**: Renders a compact launcher pill with badges, custom labels, and call icons.
- **Audio & Text Modalities**: Dynamic switching between text chat and hands-free vocal streaming.
- **Live Connection Monitor**: Displays active voice pipeline states (e.g., *LIVE*, *LISTENING*, *SPEAKING...*).
- **Responsive Layout**: Adapts smoothly to mobile and desktop screens.
- **Styling Presets**: Features 3 aesthetic presets: `call`, `chat`, and `travel`.
- **Isolated CSS Styles**: Injected cleanly into the React Shadow DOM or packaged component-scoped styles in Vue/Svelte.

---

## 2. Installation

The UI widget component is packed directly inside each SDK package:

```bash
# React SDK
pnpm add @domos/react @domos/core

# Vue SDK
pnpm add @domos/vue @domos/core

# Svelte SDK
pnpm add @domos/svelte @domos/core
```

---

## 3. Usage & Framework Integration

The widget can be loaded in two modes: **Explicit Instance** (autonomous, handles its own connection lifecycle) or **Auto-Mount Mode** (shares context inside a parent provider).

### React Integration (Explicit)
```tsx
import { DomOSWidget } from '@domos/react';

function App() {
  return (
    <DomOSWidget
      apiKey="pk_live_xxxx"
      endpoint="wss://api.domos.dev/domos"
      config={{
        agentName: 'Alex',
        agentTitle: 'Expert Assistant',
        mode: 'audio',
        stylePreset: 'call',
        allowModeSwitch: true,
        labels: {
          callToAction: 'Call Assistant',
          badge: '1 missed call'
        }
      }}
    />
  );
}
```

### React Auto-Mount (Shared Context)
When using `<DomOSProvider>`, pass the widget configuration directly to the provider options to mount it automatically:
```tsx
import { DomOSProvider } from '@domos/react';

function App() {
  return (
    <DomOSProvider
      apiKey="pk_live_xxxx"
      endpoint="wss://api.domos.dev/domos"
      config={{
        widget: {
          enabled: true,
          config: { stylePreset: 'chat', mode: 'text' }
        }
      }}
    >
      <YourMainApp />
    </DomOSProvider>
  );
}
```

### Vue 3 Integration (Explicit)
```vue
<template>
  <DomOSWidget
    api-key="pk_live_xxxx"
    endpoint="wss://api.domos.dev/domos"
    :config="{
      agentName: 'Alex',
      agentTitle: 'Assistant',
      stylePreset: 'chat',
      mode: 'audio'
    }"
  />
</template>

<script setup>
import { DomOSWidget } from '@domos/vue';
</script>
```

### Svelte Integration (Explicit)
```svelte
<script>
  import { DomOSWidget } from '@domos/svelte';
</script>

<DomOSWidget
  apiKey="pk_live_xxxx"
  endpoint="wss://api.domos.dev/domos"
  config={{
    agentName: 'Alex',
    agentTitle: 'Support agent',
    stylePreset: 'travel',
    mode: 'audio'
  }}
/>
```

---

## 4. Configuration Options Reference (`WidgetConfig`)

Customize the layout, labels, and themes using the `WidgetConfig` properties:

| Property | Type | Default | Description |
|---|---|---|---|
| `agentName` | `string` | `'Alex'` | Name displayed in header panel. |
| `agentTitle` | `string` | `'Assistant'` | Caption displayed below the agent name. |
| `mode` | `'audio' \| 'text'` | `'audio'` | Initial capture modality. |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Placement on the screen. |
| `stylePreset` | `'call' \| 'chat' \| 'travel'` | `'call'` | Visual style aesthetic theme. |
| `allowModeSwitch` | `boolean` | `true` | Show/hide the button to toggle between audio and text modes. |
| `fallbackToText` | `boolean` | `true` | Automatic switch to text mode if microphone permission is denied. |
| `theme` | `WidgetTheme` | — | Custom color theme overrides. |
| `labels` | `WidgetLabels` | — | Interface localization parameters. |

### Visual Presets Details
- **`call`**: Telephone-like interface optimized for compact, voice-centric overlays.
- **`chat`**: Classic chat bubbles stream interface with a wider input panel.
- **`travel`**: Immersive widget layout featuring enhanced ambient animations.
