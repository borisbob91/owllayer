# Démarrage — @domos/browser

Le SDK Browser repose sur un singleton `DomOS`. L'initialisation se fait une seule fois au chargement de la page.

## 1. Initialisation minimale

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  await DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/domos',
    widget: { enabled: true },
  });
</script>
```

## 2. Configuration recommandée

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  await DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/domos',
    debug: false,
    context: {
      page: 'catalog',
      locale: 'fr',
    },
    widget: {
      enabled: true,
      config: {
        agentName: 'Alex',
        stylePreset: 'chat',
      },
    },
    hitl: { enabled: true },
    autoDiscovery: { enabled: true },
    session: {
      autoResume: true,
      maxHistoryMessages: 10,
    },
    voice: {
      enabled: true,
      fallbackToText: true,
      live: true,
    },
    onReady: () => console.log('DomOS prêt'),
    onError: (error) => console.error(error),
  });
</script>
```

## 3. Envoyer un message texte

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  document.getElementById('ask').addEventListener('click', () => {
    DomOS.sendText('Montre-moi les articles en promotion');
  });
</script>
```

## 4. Écouter les réponses et l'état

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  DomOS.onResponse((text, done) => {
    console.log('chunk', text, 'done:', done);
  });

  DomOS.onAgentStateChange((state) => {
    console.log('state:', state);
  });
</script>
```

## 5. Déclarer un tool en JavaScript

```html
<script type="module">
  import { DomOS } from '@domos/browser';

  DomOS.registerTool('clear_cart', {
    description: 'Vider entièrement le panier',
    risk: 'high',
    handler: async () => {
      clearCart();
      return { ok: true };
    },
  });
</script>
```

## `DomOSBrowserConfig`

| Champ | Type | Description |
|---|---|---|
| `apiKey` | `string` | Clé publique |
| `endpoint` | `string` | Endpoint WebSocket |
| `debug` | `boolean` | Active les logs détaillés |
| `autoConnect` | `boolean` | Connexion automatique (défaut : `true`) |
| `context` | `Record<string, unknown>` | Contexte initial |
| `widget.enabled` | `boolean` | Active le widget |
| `widget.config` | `WidgetConfig` | Configuration du widget |
| `hitl.enabled` | `boolean` | Active l'overlay HITL |
| `autoDiscovery.enabled` | `boolean` | Scanne le DOM pour `data-domos-*` |
| `session.enabled` | `boolean` | Active la persistance de session |
| `session.autoResume` | `boolean` | Restaure automatiquement la session précédente |
| `voice.enabled` | `boolean` | Active le micro |
| `voice.fallbackToText` | `boolean` | Bascule en texte si le micro échoue |
| `voice.live` | `boolean` | Streaming audio temps réel |
| `onReady` | `() => void` | Callback de fin d'initialisation |
| `onError` | `(error: Error) => void` | Callback d'erreur |

## Contraintes

- Le SDK Browser est strictement côté client. Il ne doit pas être exécuté dans un contexte SSR ou Node.js.
- `DomOS` est un singleton. Appeler `init()` plusieurs fois ne crée pas plusieurs instances séparées.
- Si `voice.enabled` est activé et que l'accès micro est refusé, le SDK bascule en texte si `fallbackToText: true`.
