---
title: "Widget � @domos/svelte"
description: Documentation DomOS.
---

# Widget — @domos/svelte

`DomOSWidget` est un widget chat vocal/texte complet. Il peut fonctionner de façon autonome avec `apiKey` et `endpoint`, ou réutiliser un client existant.

## Usage minimal

```svelte
<script>
  import { DomOSWidget } from '@domos/svelte';
</script>

<DomOSWidget
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/domos"
  config={{
    agentName: 'Alex',
    agentTitle: 'Assistant',
  }}
/>
```

## Props

| Prop | Type | Description |
|---|---|---|
| `apiKey` | `string` | Clé publique |
| `endpoint` | `string` | WebSocket endpoint ADTP |
| `client` | `DomOSClient` | Client existant à réutiliser |
| `config` | `WidgetConfig` | Configuration du widget |

## WidgetConfig

```ts
interface WidgetConfig {
  mode?: 'text' | 'voice' | 'auto';
  position?: 'bottom-right' | 'bottom-left';
  stylePreset?: 'call' | 'chat' | 'travel';
  theme?: Record<string, string>;
  labels?: Record<string, string>;
  agentName?: string;
  agentTitle?: string;
}
```

## Presets

| Valeur | Description |
|---|---|
| `'call'` | Style appel, orienté conversation vocale |
| `'chat'` | Style messagerie, orienté texte |
| `'travel'` | Style immersif avec visualisation plus expressive |

## Configuration visuelle

Le widget accepte un objet `theme` pour ajuster les couleurs principales et un objet `labels` pour adapter le vocabulaire affiché à votre produit.

```svelte
<DomOSWidget
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/domos"
  config={{
    agentName: 'Sophie',
    stylePreset: 'travel',
    theme: {
      accentColor: '#6366f1',
      backgroundColor: '#111827',
      borderRadius: '12px',
    },
    labels: {
      callToAction: 'Parler à un conseiller',
      textPlaceholder: 'Écrivez votre message…',
    },
  }}
/>
```

## Mode vocal

Le widget gère la capture micro, le streaming audio et la lecture de la réponse sans configuration supplémentaire. Si l'application utilise déjà un client DomOS initialisé ailleurs, il est préférable de le réutiliser via la prop `client`.

```svelte
<script>
  import { get } from 'svelte/store';
  import { domosClient, DomOSWidget } from '@domos/svelte';
</script>

<DomOSWidget client={get(domosClient)} config={{ agentName: 'Alex' }} />
```

## Tool `end_call`

Le widget expose un outil de fin d'appel si l'implémentation du package le prend en charge dans votre version installée. Si votre intégration dépend de ce comportement, vérifier la version publiée du package Svelte avant de le documenter côté produit.
