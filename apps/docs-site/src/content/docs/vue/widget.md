---
title: "Widget � @domos/vue"
description: Documentation DomOS.
---

# Widget — @domos/vue

`DomOSWidget` est un widget chat vocal/texte autonome. Il crée son propre client DomOS en interne et n'a pas besoin que `DomOSPlugin` soit installé, ce qui le rend utilisable dans n'importe quelle page Vue, même sans plugin global.

## Usage minimal

```vue
<script setup>
import { DomOSWidget } from '@domos/vue';
</script>

<template>
  <DomOSWidget
    api-key="pk_live_xxx"
    endpoint="wss://api.example.com/domos"
    :config="{
      agentName: 'Alex',
      agentTitle: 'Assistant',
    }"
  />
</template>
```

## Props

| Prop | Type | Description |
|---|---|---|
| `api-key` | `string` | Clé publique (requis si `client` n'est pas fourni) |
| `endpoint` | `string` | WebSocket endpoint ADTP (requis si `client` n'est pas fourni) |
| `client` | `DomOSClient` | Client existant à réutiliser — utile quand le plugin est déjà installé |
| `config` | `WidgetConfig` | Configuration du widget (voir ci-dessous) |
| `show-approval-modal` | `boolean` | Intègre la modal HITL dans le widget (défaut : `true`) |

## WidgetConfig

```ts
interface WidgetConfig {
  agentName?: string;              // Nom affiché de l'agent
  agentTitle?: string;             // Titre ou rôle affiché sous le nom
  mode?: 'audio' | 'text';        // Mode par défaut (défaut : 'audio')
  position?: 'bottom-right' | 'bottom-left'; // Position du bouton flottant (défaut : 'bottom-right')
  stylePreset?: 'call' | 'chat' | 'travel';  // Apparence du widget (défaut : 'call')
  allowModeSwitch?: boolean;       // Bouton de bascule audio ↔ texte (défaut : true)
  fallbackToText?: boolean;        // Bascule automatiquement en texte si le mode audio échoue (défaut : true)
  disableEndCallTool?: boolean;    // Désactive le tool end_call automatique (défaut : false)
  theme?: WidgetTheme;             // Personnalisation des couleurs et du style
  labels?: WidgetLabels;           // Textes de l'interface (i18n)
}
```

### WidgetStylePreset

| Valeur | Description |
|---|---|
| `'call'` | Style appel téléphonique — avatar centré avec animations orb |
| `'chat'` | Style messagerie — bulles de chat classiques |
| `'travel'` | Style immersif — waveform 32 barres réactif au niveau du microphone |

## WidgetTheme

Toutes les propriétés sont optionnelles. Les valeurs non fournies conservent les valeurs par défaut du preset.

```ts
interface WidgetTheme {
  accentColor?: string;      // défaut : '#f97316'  (orange)
  backgroundColor?: string;  // défaut : '#0f172a'  (slate-950)
  surfaceColor?: string;     // défaut : '#1e293b'  (slate-800)
  textColor?: string;        // défaut : '#f1f5f9'  (slate-100)
  textMuted?: string;        // défaut : '#94a3b8'  (slate-400)
  dangerColor?: string;      // défaut : '#ef4444'  (red-500)
  liveColor?: string;        // défaut : '#22c55e'  (green-500)
  borderColor?: string;      // défaut : '#334155'  (slate-700)
  borderRadius?: string;     // défaut : '16px'
}
```

Exemple de thème personnalisé :

```vue
<template>
  <DomOSWidget
    api-key="pk_live_xxx"
    endpoint="wss://api.example.com/domos"
    :config="{
      agentName: 'Sophie',
      stylePreset: 'travel',
      theme: {
        accentColor: '#6366f1',
        backgroundColor: '#1a1a2e',
        borderRadius: '12px',
      },
    }"
  />
</template>
```

## WidgetLabels

Tous les textes affichés dans le widget peuvent être remplacés pour l'internationalisation ou pour adapter le vocabulaire à votre produit.

```ts
interface WidgetLabels {
  badge?: string;            // Texte du badge sur le bouton flottant (ex. : "1 appel manqué")
  callToAction?: string;     // Texte principal du bouton flottant
  subtitle?: string;         // Sous-titre du bouton flottant
  listening?: string;        // Texte pendant la capture micro
  thinking?: string;         // Texte pendant le traitement
  speaking?: string;         // Texte pendant la lecture de l'audio
  idle?: string;             // Texte en attente
  error?: string;            // Texte en cas d'erreur
  reconnecting?: string;     // Texte pendant la reconnexion
  live?: string;             // Indicateur "En direct"
  hangUp?: string;           // Bouton de fin d'appel
  textPlaceholder?: string;  // Placeholder du champ texte
  send?: string;             // Bouton d'envoi du message texte
}
```

Exemple :

```vue
<template>
  <DomOSWidget
    api-key="pk_live_xxx"
    endpoint="wss://api.example.com/domos"
    :config="{
      labels: {
        callToAction: 'Parler à notre conseiller',
        badge: '1 appel manqué',
        hangUp: 'Terminer',
        textPlaceholder: 'Posez votre question…',
      },
    }"
  />
</template>
```

## Tool end_call

Le widget enregistre automatiquement un tool `end_call` que l'agent peut appeler pour fermer le widget proprement à la fin d'une conversation. Pour le désactiver :

```vue
<template>
  <DomOSWidget
    api-key="pk_live_xxx"
    endpoint="wss://api.example.com/domos"
    :config="{ disableEndCallTool: true }"
  />
</template>
```

## Réutiliser le client du plugin

Si `DomOSPlugin` est déjà installé dans l'application, passer le client existant au widget pour partager la même connexion WebSocket et les mêmes tools. Cela évite d'ouvrir deux connexions simultanées.

```vue
<script setup>
import { inject } from 'vue';
import { DomOSWidget, DOMOS_CLIENT_KEY } from '@domos/vue';

const client = inject(DOMOS_CLIENT_KEY);
</script>

<template>
  <DomOSWidget :client="client" :config="{ agentName: 'Alex' }" />
</template>
```
