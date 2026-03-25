# @domos/browser

SDK Browser pour DomOS — intégration agentique dans n'importe quelle page HTML, sans framework.

```bash
pnpm add @domos/browser
```

Le SDK Browser est conçu pour les sites statiques, les templates serveur et les environnements où React, Vue ou Svelte ne sont pas souhaités. Il s'initialise une fois, expose une API JavaScript unique et peut découvrir automatiquement des tools à partir du DOM via des attributs `data-domos-*`.

## Quand l'utiliser

- site HTML statique
- Laravel Blade
- WordPress
- Shopify Liquid
- pages multi-écrans classiques avec rechargement complet
- intégration légère dans une application déjà existante

## Exports principaux

### Objet singleton

| Export | Description |
|---|---|
| `DomOS` | API principale du SDK Browser |

### Méthodes utilitaires nommées

| Export | Description |
|---|---|
| `init` | Alias de `DomOS.init()` |
| `destroy` | Alias de `DomOS.destroy()` |
| `registerTool` | Alias de `DomOS.registerTool()` |
| `unregisterTool` | Alias de `DomOS.unregisterTool()` |
| `updateContext` | Alias de `DomOS.updateContext()` |
| `setContext` | Alias de `DomOS.setContext()` |
| `sendText` | Alias de `DomOS.sendText()` |
| `disconnect` | Alias de `DomOS.disconnect()` |
| `startVoice` | Alias de `DomOS.startVoice()` |
| `stopVoice` | Alias de `DomOS.stopVoice()` |
| `muteMic` | Alias de `DomOS.muteMic()` |
| `openWidget` | Alias de `DomOS.openWidget()` |

## Capacités

- connexion WebSocket et état agent unifiés
- widget conversationnel intégré
- auto-discovery de tools HTML avec `data-domos-*`
- session persistée entre rechargements de page
- mode vocal avec fallback texte
- HITL pour les actions risquées
- API manuelle si vous préférez déclarer les tools en JavaScript

## Guides

- [Démarrage](./getting-started.md)
- [Référence API](./api-reference.md)
- [Auto-discovery HTML](./auto-discovery.md)
- [Widget, voix et session](./widget-voice-session.md)
