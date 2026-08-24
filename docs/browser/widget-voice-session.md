# Widget, voix et session — @owllayer/browser

Ces trois sujets sont souvent ceux qui donnent le plus de valeur visible a une integration Browser :

- le widget rend OwlLayer accessible immediatement
- la voix rend l'interaction plus fluide et plus naturelle
- la session permet de garder une continuite entre plusieurs pages ou plusieurs moments d'usage

## Widget

Le SDK Browser peut monter un widget conversationnel global. Ce widget est isolé du CSS de la page et se place en position fixe.

Le widget est le moyen le plus rapide d'ajouter OwlLayer a un site existant sans construire toute une interface custom.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  await OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
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

En pratique, cela permet d'ajouter un point d'entree conversationnel global a un site, comme un assistant flottant accessible depuis toutes les pages.

## WidgetConfig

Le Browser SDK réutilise `WidgetConfig` du core.

Cette configuration sert a aligner le widget avec votre identite produit et votre type de parcours.

| Champ | Description |
|---|---|
| `agentName` | Nom affiché dans l'interface |
| `agentTitle` | Titre ou rôle affiché |
| `stylePreset` | Preset visuel du widget |
| `theme` | Personnalisation des couleurs et du style |
| `labels` | Personnalisation des textes |

## Voix

Le mode vocal se pilote depuis la config ou via les méthodes publiques.

La voix est utile quand l'echange doit etre plus direct, plus rapide ou plus proche d'un assistant en temps reel qu'un chat traditionnel.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  await OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
    voice: {
      enabled: true,
      fallbackToText: true,
      sampleRate: 16000,
      live: true,
    },
  });

  document.getElementById('start-voice').addEventListener('click', async () => {
    await OwlLayer.startVoice();
  });

  document.getElementById('stop-voice').addEventListener('click', () => {
    OwlLayer.stopVoice();
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

Cette partie est importante pour les sites e-commerce, les parcours de souscription, ou toute navigation ou l'utilisateur change d'ecran sans vouloir recommencer la conversation a zero.

```html
<script type="module">
  import { OwlLayer } from '@owllayer/browser';

  await OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://api.example.com/owllayer',
    session: {
      enabled: true,
      autoResume: true,
      storageKey: 'owllayer_browser_session_v1',
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

En resume, le SDK Browser est moins "framework-aware", mais souvent plus simple a integrer sur un existant web reel.

## Limites à connaître

- usage uniquement côté navigateur
- dépendance au `localStorage` pour la persistance
- widget isolé du CSS global via Shadow DOM
- singleton global unique pour toute la page

Ces limites ne sont pas des defauts systematiques, mais des choix d'architecture a garder en tete avant de concevoir une integration tres personnalisee.
