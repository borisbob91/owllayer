# Chat Widget UI Component

The Agentic UI SDK provides a pre-built, injectable UI component called **`OwlLayerWidget`**. This component renders a float chat bubble panel (supporting text messaging and real-time PCM voice streaming) in just a few lines of code.

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
pnpm add @owllayer/react @owllayer/core

# Vue SDK
pnpm add @owllayer/vue @owllayer/core

# Svelte SDK
pnpm add @owllayer/svelte @owllayer/core
```

---

## 3. Usage & Framework Integration

The widget can be loaded in two modes: **Explicit Instance** (autonomous, handles its own connection lifecycle) or **Auto-Mount Mode** (shares context inside a parent provider).

### React Integration (Explicit)
```tsx
import { OwlLayerWidget } from '@owllayer/react';

function App() {
  return (
    <OwlLayerWidget
      apiKey="pk_live_xxxx"
      endpoint="wss://api.owllayer.dev/owllayer"
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
When using `<OwlLayerProvider>`, pass the widget configuration directly to the provider options to mount it automatically:
```tsx
import { OwlLayerProvider } from '@owllayer/react';

function App() {
  return (
    <OwlLayerProvider
      apiKey="pk_live_xxxx"
      endpoint="wss://api.owllayer.dev/owllayer"
      config={{
        widget: {
          enabled: true,
          config: { stylePreset: 'chat', mode: 'text' }
        }
      }}
    >
      <YourMainApp />
    </OwlLayerProvider>
  );
}
```

### Vue 3 Integration (Explicit)
```vue
<template>
  <OwlLayerWidget
    api-key="pk_live_xxxx"
    endpoint="wss://api.owllayer.dev/owllayer"
    :config="{
      agentName: 'Alex',
      agentTitle: 'Assistant',
      stylePreset: 'chat',
      mode: 'audio'
    }"
  />
</template>

<script setup>
import { OwlLayerWidget } from '@owllayer/vue';
</script>
```

### Svelte Integration (Explicit)
```svelte
<script>
  import { OwlLayerWidget } from '@owllayer/svelte';
</script>

<OwlLayerWidget
  apiKey="pk_live_xxxx"
  endpoint="wss://api.owllayer.dev/owllayer"
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
