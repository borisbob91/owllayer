# OwlLayer Widget - Chat UI injectable

Le `OwlLayerWidget` est un composant de chat complet injectable dans n'importe quelle application web. Il fonctionne en React, Vue et Svelte.

## Fonctionnalites

- Bouton flottant "pill" avec badge, titre et icone telephone
- Panneau de conversation compact (audio + texte)
- 3 presets visuels (`call`, `chat`, `travel`)
- Animation audio (5 dots animes selon l'etat)
- Bascule audio / texte avec fallback automatique
- Bulles de conversation avec auto-scroll
- Indicateur de statut en temps reel (LIVE, EN ECOUTE, PARLE...)
- CSS isole (Shadow DOM en React, style injecte en Vue/Svelte)
- Responsive (mobile + desktop)
- Aucune configuration obligatoire - tout a des defauts sensibles

## Installation

Le widget est inclus dans chaque SDK framework :

```bash
# React
pnpm add @owllayer/react @owllayer/core

# Vue
pnpm add @owllayer/vue @owllayer/core

# Svelte
pnpm add @owllayer/svelte @owllayer/core
```

## Usage

### React (explicite)

```tsx
import { OwlLayerWidget } from '@owllayer/react';

function App() {
  return (
    <>
      <MonApp />
      <OwlLayerWidget
        apiKey="pk_live_xxx"
        endpoint="wss://api.example.com/owllayer"
        config={{
          agentName: 'Alex',
          agentTitle: 'CEO',
          mode: 'audio',
          stylePreset: 'call',
          allowModeSwitch: true,
          labels: {
            callToAction: 'Appeler le CEO',
            badge: '1 appel manque',
          },
        }}
      />
    </>
  );
}
```

Pas besoin de `<OwlLayerProvider>` - le widget l'encapsule automatiquement.

### React (auto-mount via Provider)

```tsx
import { OwlLayerProvider } from '@owllayer/react';

function App() {
  return (
    <OwlLayerProvider
      apiKey="pk_live_xxx"
      endpoint="wss://api.example.com/owllayer"
      config={{
        widget: {
          enabled: true,
          config: {
            stylePreset: 'chat',
            mode: 'audio',
            allowModeSwitch: true,
          },
        },
      }}
    >
      <MonApp />
    </OwlLayerProvider>
  );
}
```

### Vue (auto-mount via plugin)

```ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';

createApp(App).use(OwlLayerPlugin, {
  endpoint: 'ws://localhost:4001/owllayer',
  apiKey: 'pk_dev_123',
  widget: {
    enabled: true,
    config: { stylePreset: 'chat', mode: 'audio' },
  },
}).mount('#app');
```

### Svelte (auto-mount via initOwlLayer)

```ts
import { initOwlLayer } from '@owllayer/svelte';

initOwlLayer({
  endpoint: 'ws://localhost:4001/owllayer',
  apiKey: 'pk_dev_123',
  widget: {
    enabled: true,
    config: { stylePreset: 'travel', mode: 'audio' },
  },
});
```

Mode auto-mount disponible sur React, Vue et Svelte.

### Vue

```vue
<template>
  <MonApp />
  <OwlLayerWidget
    api-key="pk_live_xxx"
    endpoint="wss://api.example.com/owllayer"
    :config="{
      agentName: 'Alex',
      agentTitle: 'CEO',
      mode: 'audio',
      stylePreset: 'chat',
    }"
  />
</template>

<script setup>
import { OwlLayerWidget } from '@owllayer/vue';
</script>
```

Le widget Vue cree son propre `OwlLayerClient` - pas besoin du plugin global `OwlLayerPlugin`.

### Svelte

```svelte
<script>
  import { OwlLayerWidget } from '@owllayer/svelte';
</script>

<MonApp />
<OwlLayerWidget
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/owllayer"
  config={{
    agentName: 'Alex',
    agentTitle: 'CEO',
    mode: 'audio',
    stylePreset: 'travel',
  }}
/>
```

Le widget Svelte est autonome - pas besoin de `initOwlLayer()`.

## Configuration

L'interface `WidgetConfig` permet de personnaliser le widget :

```ts
interface WidgetConfig {
  agentName?: string;       // Nom affiche (defaut: "Alex")
  agentTitle?: string;      // Titre/role (defaut: "Assistant")
  mode?: 'audio' | 'text';  // Mode par defaut (defaut: "audio")
  position?: 'bottom-right' | 'bottom-left'; // Position (defaut: "bottom-right")
  stylePreset?: 'call' | 'chat' | 'travel'; // Preset visuel (defaut: "call")
  allowModeSwitch?: boolean; // Bouton bascule mode (defaut: true)
  fallbackToText?: boolean;  // Bascule texte si micro refuse (defaut: true)
  theme?: WidgetTheme;       // Theme visuel
  labels?: WidgetLabels;     // Labels / i18n
}
```

### Presets visuels

- `call` : style telephonique compact (preset par defaut)
- `chat` : style chat modernise, panel plus large
- `travel` : variante accentuee orientee experience immersive

### Theme

```ts
interface WidgetTheme {
  accentColor?: string;      // Couleur d'accent (defaut: "#f97316" orange)
  backgroundColor?: string;  // Fond bouton/panneau (defaut: "#0f172a")
  surfaceColor?: string;     // Fond secondaire (defaut: "#1e293b")
  textColor?: string;        // Texte principal (defaut: "#f1f5f9")
  textMuted?: string;        // Texte secondaire (defaut: "#94a3b8")
  dangerColor?: string;      // Bouton raccrocher (defaut: "#ef4444")
  liveColor?: string;        // Badge LIVE (defaut: "#22c55e")
  borderColor?: string;      // Bordures (defaut: "#334155")
  borderRadius?: string;     // Rayon bordure (defaut: "16px")
}
```

### Labels (i18n)

```ts
interface WidgetLabels {
  badge?: string;            // Badge bouton ("1 appel manque")
  callToAction?: string;     // Titre bouton ("Appeler l'assistant")
  subtitle?: string;         // Sous-titre ("Reponse immediate")
  listening?: string;        // Statut ecoute ("EN ECOUTE...")
  thinking?: string;         // Statut reflexion ("REFLEXION...")
  speaking?: string;         // Statut parle ("PARLE...")
  idle?: string;             // Statut pret ("PRET")
  error?: string;            // Statut erreur ("HORS LIGNE")
  live?: string;             // Badge live ("LIVE")
  hangUp?: string;           // Bouton raccrocher ("Raccrocher")
  textPlaceholder?: string;  // Placeholder input ("Tapez votre message...")
  send?: string;             // Bouton envoyer ("Envoyer")
}
```

## Etats visuels

Le widget affiche differents etats selon la connexion et l'activite de l'agent :

| Etat | Visuel | Description |
|---|---|---|
| `idle` | Dots statiques | Widget connecte, en attente |
| `listening` | Dots rebondissants (orange) | Le micro est actif, l'utilisateur parle |
| `thinking` | Dots pulsants | L'agent reflechit |
| `speaking` | Barres audio animees | L'agent parle |
| `error` | Dots rouges | Connexion perdue |

## Modes

### Mode audio (defaut)

Le widget ouvre automatiquement le micro au lancement. L'audio est streame en PCM 16kHz via `sendAudioStream()`. Les transcriptions de l'agent apparaissent dans les messages.

### Mode texte

L'utilisateur tape son message dans un champ de saisie. Les reponses s'affichent en bulles de conversation avec auto-scroll et indicateur "typing".

### Bascule

Si `allowModeSwitch: true`, un bouton dans le header du panneau permet de basculer entre les deux modes. Si le micro echoue et `fallbackToText: true`, le widget bascule automatiquement en mode texte.

## Architecture interne

Les types, constantes et CSS sont definis dans `@owllayer/core` :
- `packages/core/src/widget/widget.types.ts` - Types partages
- `packages/core/src/widget/widget.constants.ts` - Valeurs par defaut
- `packages/core/src/widget/widget.styles.ts` - CSS pur genere avec le theme

Chaque framework a sa propre implementation UI :
- React : `packages/react/src/components/widget/` (ShadowDOM)
- Vue : `packages/vue/src/components/widget/OwlLayerWidget.vue`
- Svelte : `packages/svelte/src/components/widget/OwlLayerWidget.svelte`

## Note demos

Les applications `apps/demo*` restent la base de reference produit. Le widget SDK s'aligne sur leurs comportements audio et conversationnels.

## Branding OwlLayer

Le widget affiche par defaut la signature `by OwlLayer AI` dans le bouton flottant et dans le panneau de chat (React, Vue, Svelte).

Pour le garder bien ancre chez des integrateurs externes :
- conserver la signature dans les composants SDK (pas dans les demos uniquement),
- ajouter une verification CI/release qui echoue si `by OwlLayer AI` disparait des composants widget,
- ajouter une clause de branding dans les conditions d'utilisation du SDK.

Important : en frontend pur, rien n'est 100% impossible a retirer; la combinaison UI + CI + licence est la bonne strategie.
