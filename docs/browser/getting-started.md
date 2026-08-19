# Démarrage — @owllayer/browser

Le SDK Browser repose sur un singleton `OwlLayer`. L'initialisation se fait une seule fois au chargement de la page.

Le flux standard d'integration est le suivant :

1. initialiser `OwlLayer`
2. fournir un contexte de page
3. envoyer des messages ou ouvrir le widget
4. exposer des tools en JavaScript ou via le DOM
5. activer, si besoin, la session, la voix et la mémoire locale

## 1. Initialisation minimale

Initialise le runtime avec la configuration minimale et active le widget intégré.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  await OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
    widget: { enabled: true },
  });
</script>
```

## 2. Configuration recommandée

Exemple de configuration plus complète pour un environnement de production léger : contexte initial, widget, HITL, auto-discovery, session et voix.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  await OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
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
    onReady: () => console.log('OwlLayer prêt'),
    onError: (error) => console.error(error),
  });
</script>
```

## 3. Envoyer un message texte

Le SDK peut être piloté depuis votre propre interface. `sendText()` permet d'envoyer un message sans passer par le widget intégré.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  document.getElementById('ask').addEventListener('click', () => {
    OwlLayer.sendText('Montre-moi les articles en promotion');
  });
</script>
```

## 4. Écouter les réponses et l'état

Les callbacks publics permettent de raccorder OwlLayer à une UI existante et de suivre la conversation côté navigateur.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  OwlLayer.onResponse((text, done) => {
    console.log('chunk', text, 'done:', done);
  });

  OwlLayer.onAgentStateChange((state) => {
    console.log('state:', state);
  });
</script>
```

## 5. Déclarer un tool en JavaScript

`registerTool()` expose une action explicite à l'agent. Cette approche est adaptée quand l'action dépend d'une logique métier JavaScript, pas seulement d'un élément DOM.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  OwlLayer.registerTool('clear_cart', {
    description: 'Vider entièrement le panier',
    risk: 'high',
    handler: async () => {
      clearCart();
      return { ok: true };
    },
  });
</script>
```

Pour des actions simples portées directement par le DOM, utiliser plutôt [Auto-discovery HTML](./auto-discovery.md).

## 6. Déclarer un tool dans le HTML

Le Browser SDK peut découvrir automatiquement des tools à partir du DOM quand `autoDiscovery.enabled` est actif.

```html
<button
  data-owllayer-tool="add_to_cart"
  data-owllayer-description="Ajouter le produit au panier"
  data-owllayer-risk="low"
  data-owllayer-action="click"
>
  Ajouter au panier
</button>
```

Cette approche convient bien aux templates serveur, CMS et sites multi-pages.

## 7. Activer la mémoire locale standalone

Le package peut activer une mémoire locale basée sur `OwlLayerAgent` de `@owllayer/core`. Ce mode ne remplace pas le serveur OwlLayer, mais ajoute un état mémoire local utilisable via `getMemorySnapshot()` et `addFeedback()`.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  await OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
    memory: {
      enabled: true,
      storageKey: 'owllayer_agent_id',
    },
  });
</script>
```

## `OwlLayerBrowserConfig`

`OwlLayerBrowserConfig` regroupe les options publiques du runtime Browser.

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
| `autoDiscovery.enabled` | `boolean` | Scanne le DOM pour `data-owllayer-*` |
| `sessionPersistence.enabled` | `boolean` | Alias legacy pour la persistance de session |
| `sessionPersistence.ttlMs` | `number` | Durée de vie de la session persistée |
| `session.enabled` | `boolean` | Active la persistance de session |
| `session.storageKey` | `string` | Clé `localStorage` pour la session Browser |
| `session.ttlMs` | `number` | Durée de vie de la session persistée |
| `session.maxHistoryMessages` | `number` | Nombre de messages restaurés dans le widget |
| `session.autoResume` | `boolean` | Restaure automatiquement la session précédente |
| `voice.enabled` | `boolean` | Active le micro |
| `voice.fallbackToText` | `boolean` | Bascule en texte si le micro échoue |
| `voice.sampleRate` | `number` | Fréquence PCM (défaut: `16000`) |
| `voice.live` | `boolean` | Streaming audio temps réel |
| `memory.enabled` | `boolean` | Active la mémoire locale standalone |
| `memory.storageKey` | `string` | Clé `localStorage` pour l'identité mémoire |
| `memory.userId` | `string` | Identifiant utilisateur optionnel |
| `onReady` | `() => void` | Callback de fin d'initialisation |
| `onError` | `(error: Error) => void` | Callback d'erreur |

## Contraintes

- Le SDK Browser est strictement côté client. Il ne doit pas être exécuté dans un contexte SSR ou Node.js.
- `OwlLayer` est un singleton. Appeler `init()` plusieurs fois ne crée pas plusieurs instances séparées.
- `OwlLayer.init(config)` doit être appelé avant `registerTool()`.
- Si `voice.enabled` est activé et que l'accès micro est refusé, le SDK bascule en texte si `fallbackToText: true`.

Le package est conçu pour vivre dans le navigateur, au plus près du DOM et des interactions utilisateur.
