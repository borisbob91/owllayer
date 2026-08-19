---
title: "@owllayer/browser"
description: Documentation OwlLayer.
---

# @owllayer/browser

`@owllayer/browser` est la version la plus directe de OwlLayer : vous pouvez ajouter un assistant conversationnel a une page web classique, sans React, sans Vue et sans Svelte.

OwlLayer est un SDK d'**AI-driven interfaces**, ou interfaces agentiques : l'agent agit dans l'interface par les tools explicitement déclarés par le développeur. Si vous avez déjà un site HTML, un template serveur, un thème e-commerce ou une interface existante, ce SDK permet d'ajouter cette capacité sans reconstruire toute l'application.

Le principe reste le même : il ne s'agit pas de remplacer votre interface par une UI générée, mais d'exposer un contexte utile et des actions autorisées.

Un lien, un bouton, un champ, un widget et un contexte de page peuvent ainsi devenir les briques d'une UI agentique reelle, sans migration de framework.

Le SDK peut :

- ouvrir un widget de conversation pret a l'emploi
- comprendre le contexte courant de la page
- exposer des boutons, liens et champs HTML comme actions agent
- ajouter une couche vocale et de la persistance de session
- fonctionner dans des environnements simples ou hybrides

Il est donc particulierement adapte quand le sujet n'est pas "quel framework choisir ?" mais plutot : "comment donner une vraie capacite d'action a une IA sur un site deja en production ?"

```bash
pnpm add @owllayer/browser
```

Le SDK Browser est conçu pour les sites statiques, les templates serveur et les environnements où React, Vue ou Svelte ne sont pas souhaités. Il s'initialise une fois, expose une API JavaScript unique et peut découvrir automatiquement des tools à partir du DOM via des attributs `data-owllayer-*`.

## Pourquoi ce SDK est utile

Dans beaucoup de projets, le besoin n'est pas de changer de stack front, mais d'ajouter une couche conversationnelle sur un existant.

`@owllayer/browser` est fait pour cela : il permet d'essayer OwlLayer vite, de l'integrer progressivement, et d'apporter des capacites agentiques a une interface qui existe deja.

Le Browser SDK reprend les idees fortes de OwlLayer dans un format plus direct :

- un contexte de page leger partage avec le serveur
- un registre d'actions qui suit le DOM reel
- une boucle claire entre intention utilisateur, appel d'outil et resultat
- des garde-fous HITL pour les actions sensibles

## Quand l'utiliser

- site HTML statique
- Laravel Blade, Django Template, Jinja2 ou tout moteur de template serveur
- pages multi-écrans classiques avec rechargement complet
- intégration légère dans une application déjà existante

## Ce que vous obtenez en pratique

Avec ce SDK, vous n'ajoutez pas seulement un script. Vous ajoutez une couche d'interaction capable de :

- discuter avec l'utilisateur
- lire un contexte de page ou de session
- piloter certains elements du DOM de maniere controlee
- conserver une conversation entre plusieurs pages
- activer une experience vocale si le parcours le demande

En resume, `@owllayer/browser` transforme un site classique en interface pilotable, sans exiger une reimplementation applicative complete.

## Lecture rapide

| Si vous cherchez... | Commencez ici |
|---|---|
| Monter OwlLayer pour la premiere fois dans une page web | [Démarrage](./getting-started.md) |
| Comprendre les méthodes disponibles | [Référence API](./api-reference.md) |
| Déclarer des actions directement dans le HTML | [Auto-discovery HTML](./auto-discovery.md) |
| Configurer le widget, la voix et la session | [Widget, voix et session](./widget-voice-session.md) |

## Exports principaux

### Objet singleton

| Export | Description |
|---|---|
| `OwlLayer` | API principale du SDK Browser |

### Méthodes utilitaires nommées

| Export | Description |
|---|---|
| `init` | Alias de `OwlLayer.init()` |
| `destroy` | Alias de `OwlLayer.destroy()` |
| `registerTool` | Alias de `OwlLayer.registerTool()` |
| `unregisterTool` | Alias de `OwlLayer.unregisterTool()` |
| `updateContext` | Alias de `OwlLayer.updateContext()` |
| `setContext` | Alias de `OwlLayer.setContext()` |
| `sendText` | Alias de `OwlLayer.sendText()` |
| `disconnect` | Alias de `OwlLayer.disconnect()` |
| `startVoice` | Alias de `OwlLayer.startVoice()` |
| `stopVoice` | Alias de `OwlLayer.stopVoice()` |
| `muteMic` | Alias de `OwlLayer.muteMic()` |
| `openWidget` | Alias de `OwlLayer.openWidget()` |

## Capacités

- connexion WebSocket et état agent unifiés
- widget conversationnel intégré
- auto-discovery de tools HTML avec `data-owllayer-*`
- session persistée entre rechargements de page
- mode vocal avec fallback texte
- HITL pour les actions risquées
- API manuelle si vous préférez déclarer les tools en JavaScript

Ces capacites peuvent etre adoptees ensemble ou progressivement. Vous pouvez commencer par un widget simple, puis ajouter des tools HTML, puis activer la voix ou la session persistante ensuite.

## Guides

- [Démarrage](./getting-started.md)
- [Référence API](./api-reference.md)
- [Auto-discovery HTML](./auto-discovery.md)
- [Widget, voix et session](./widget-voice-session.md)
