# Widget, voix et session — @domos/browser

## Widget

Le SDK Browser peut monter un widget conversationnel global. Ce widget est isolé du CSS de la page et se place en position fixe.

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  await DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/domos',
    widget: {
      enabled: true,
      config: {
        agentName: 'Alex',
        stylePreset: 'chat',
      },
    },
  });
</script>
```

### Comportement du widget

- bouton flottant fixe
- ouverture du panneau de chat au clic
- affichage des messages persistés de la session
- bouton vocal si `voice.enabled: true`
- état visuel synchronisé avec `AgentState`

## WidgetConfig

Le Browser SDK réutilise `WidgetConfig` du core.

| Champ | Description |
|---|---|
| `agentName` | Nom affiché dans l'interface |
| `agentTitle` | Titre ou rôle affiché |
| `stylePreset` | Preset visuel du widget |
| `theme` | Personnalisation des couleurs et du style |
| `labels` | Personnalisation des textes |

## Voix

Le mode vocal se pilote depuis la config ou via les méthodes publiques.

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  await DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/domos',
    voice: {
      enabled: true,
      fallbackToText: true,
      sampleRate: 16000,
      live: true,
    },
  });

  document.getElementById('start-voice').addEventListener('click', async () => {
    await DomOS.startVoice();
  });

  document.getElementById('stop-voice').addEventListener('click', () => {
    DomOS.stopVoice();
  });
</script>
```

### Options voice

| Champ | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Active le mode vocal |
| `fallbackToText` | `boolean` | Bascule en texte si le micro est refusé |
| `sampleRate` | `number` | Fréquence d'échantillonnage PCM |
| `live` | `boolean` | Active le flux temps réel |
| `onStateChange` | `(state) => void` | Écoute l'état vocal |

## Session

Le SDK Browser sait persister une session entre deux chargements de page. Cette capacité est particulièrement utile dans les parcours multi-pages.

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  await DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/domos',
    session: {
      enabled: true,
      autoResume: true,
      storageKey: 'domos_browser_session_v1',
      maxHistoryMessages: 10,
    },
  });
</script>
```

### Options session

| Champ | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Active la persistance |
| `storageKey` | `string` | Clé `localStorage` utilisée |
| `ttlMs` | `number` | Durée de vie de la session persistée |
| `maxHistoryMessages` | `number` | Nombre max de messages restaurés |
| `autoResume` | `boolean` | Restaure automatiquement la session précédente |
| `onResume` | `() => void` | Callback de reprise de session |
| `onNewSession` | `() => void` | Callback de nouvelle session |

## Différences importantes par rapport aux SDK framework

- pas de Provider ou de plugin
- pas de réactivité framework automatique
- callbacks manuels pour synchroniser l'UI existante
- session multi-page plus naturelle
- auto-discovery HTML disponible nativement

## Limites à connaître

- usage uniquement côté navigateur
- dépendance au `localStorage` pour la persistance
- widget isolé du CSS global via Shadow DOM
- singleton global unique pour toute la page
