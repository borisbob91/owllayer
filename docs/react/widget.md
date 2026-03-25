# Widget — @domos/react

`DomOSWidget` est un widget chat vocal/texte autonome — il encapsule son propre `DomOSProvider`.

## Usage minimal

```tsx
import { DomOSWidget } from '@domos/react';

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
| `config` | `WidgetConfig` | Configuration du widget (voir ci-dessous) |

## WidgetConfig

```ts
interface WidgetConfig {
  agentName?: string;           // Nom affiché de l'agent
  agentTitle?: string;          // Titre/rôle affiché
  mode?: WidgetMode;            // 'audio' | 'text' (défaut: 'audio')
  position?: WidgetPosition;    // 'bottom-right' | 'bottom-left' (défaut: 'bottom-right')
  stylePreset?: WidgetStylePreset; // 'call' | 'chat' | 'travel' (défaut: 'call')
  allowModeSwitch?: boolean;    // Bouton de bascule audio/texte (défaut: true)
  fallbackToText?: boolean;     // Bascule auto en texte si erreur audio (défaut: true)
  disableEndCallTool?: boolean; // Désactive le tool end_call auto (défaut: false)
  theme?: WidgetTheme;          // Personnalisation visuelle
  labels?: WidgetLabels;        // Textes personnalisés (i18n)
}
```

### WidgetMode

| Valeur | Description |
|---|---|
| `'audio'` | Mode vocal — micro + synthèse vocale |
| `'text'` | Mode texte — chat classique |

### WidgetPosition

| Valeur | Description |
|---|---|
| `'bottom-right'` | Coin inférieur droit (défaut) |
| `'bottom-left'` | Coin inférieur gauche |

### WidgetStylePreset

| Valeur | Description |
|---|---|
| `'call'` | Style appel téléphonique — avatar central, animations orb |
| `'chat'` | Style messagerie — bulle chat classique |
| `'travel'` | Style immersif — waveform 32 barres réactif au micro |

## WidgetTheme

Toutes les valeurs sont optionnelles — celles non fournies prennent la valeur par défaut.

```ts
interface WidgetTheme {
  accentColor?: string;      // défaut: '#f97316'  (orange)
  backgroundColor?: string;  // défaut: '#0f172a'  (slate-950)
  surfaceColor?: string;     // défaut: '#1e293b'  (slate-800)
  textColor?: string;        // défaut: '#f1f5f9'  (slate-100)
  textMuted?: string;        // défaut: '#94a3b8'  (slate-400)
  dangerColor?: string;      // défaut: '#ef4444'  (red-500)
  liveColor?: string;        // défaut: '#22c55e'  (green-500)
  borderColor?: string;      // défaut: '#334155'  (slate-700)
  borderRadius?: string;     // défaut: '16px'
}
```

Exemple :

```tsx
<DomOSWidget
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/domos"
  config={{
    agentName: 'Sophie',
    theme: {
      accentColor: '#6366f1',   // indigo
      backgroundColor: '#1a1a2e',
      borderRadius: '12px',
    },
  }}
/>
```

## WidgetLabels

Tous les textes affichés sont personnalisables (i18n).

```ts
interface WidgetLabels {
  badge?: string;           // Texte du badge sur le FAB (ex: "1 appel manqué")
  callToAction?: string;    // Texte du bouton FAB
  subtitle?: string;        // Sous-titre du bouton FAB
  listening?: string;       // État micro actif
  thinking?: string;        // Agent traite la requête
  speaking?: string;        // Agent répond
  idle?: string;            // En attente
  error?: string;           // Erreur
  reconnecting?: string;    // Reconnexion en cours
  live?: string;            // Indicateur "En direct"
  hangUp?: string;          // Bouton raccrocher
  textPlaceholder?: string; // Placeholder du champ texte
  send?: string;            // Bouton envoyer
}
```

Exemple :

```tsx
config={{
  labels: {
    callToAction: 'Parler à notre conseiller',
    badge: '1 appel manqué',
    hangUp: 'Terminer',
    textPlaceholder: 'Votre message…',
  },
}}
```

## Tool end_call

Le widget enregistre automatiquement un tool `end_call` que l'agent peut utiliser pour fermer le widget proprement.

Pour le désactiver :

```tsx
config={{ disableEndCallTool: true }}
```

## Montage via DomOSProvider

Si le widget est déjà dans un `DomOSProvider`, utiliser `config.widget` sur le Provider plutôt que `<DomOSWidget>` standalone :

```tsx
<DomOSProvider
  apiKey="pk_live_xxx"
  endpoint="wss://api.example.com/domos"
  config={{
    widget: {
      enabled: true,
      config: {
        agentName: 'Alex',
        mode: 'audio',
      },
    },
  }}
>
  <App />
</DomOSProvider>
```

Les tools enregistrés via `useAgentTool` dans l'app sont automatiquement disponibles pour ce widget.
