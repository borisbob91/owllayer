---
title: "@domos/react"
description: Documentation DomOS.
---

# @domos/react

`@domos/react` est le SDK React de DomOS.

DomOS est un SDK d'**AI-driven interfaces**, ou interfaces agentiques : l'agent agit dans l'interface existante uniquement par les tools que le développeur déclare. `@domos/react` apporte ce contrat aux composants et hooks React, sans changer la nature de votre front.

L'idee n'est pas de remplacer vos composants par une UI generee. L'idee est de connecter un agent a votre interface existante pour qu'il puisse comprendre l'ecran courant, utiliser les bons outils au bon moment, et agir dans les limites que vous avez definies.

Concretement, ce package permet de brancher un agent sur votre produit React pour qu'il puisse :

- repondre aux questions utilisateur dans un chat ou une interface vocale
- lire le contexte de l'ecran courant, du panier, du compte ou du parcours en cours
- declencher des actions metier via des tools declares dans vos composants
- demander une validation humaine avant une action sensible
- embarquer un widget pret a l'emploi si vous ne voulez pas construire toute l'UI vous-meme

Le point cle, inspire du coeur de DomOS, est que les tools vivent au rythme des composants React.

Si un composant est monte, ses outils existent.
S'il disparait, ses outils disparaissent aussi.

L'agent ne travaille donc pas sur une carte statique du produit. Il travaille sur un contexte vivant, aligne sur ce que l'utilisateur a reellement sous les yeux.

## Ce que ce SDK apporte

Sans `@domos/react`, vous devriez assembler manuellement plusieurs briques : connexion temps reel, etat de session, outillage agent, synchronisation du contexte, garde-fous de validation, et interface conversationnelle.

`@domos/react` fournit deja cette couche d'integration React :

- un Provider pour connecter l'application a DomOS
- des hooks pour exposer des tools, lire l'etat de l'agent et injecter du contexte
- des composants UI pour l'etat agent et les approbations HITL
- un widget complet pour une integration rapide

Il apporte donc a React une forme de "Neural-DOM Binding" : vos composants ne sont plus seulement rendus pour l'utilisateur, ils deviennent aussi des points d'action comprehensibles par l'agent.

## Pour quels usages

Ce package est adapte si vous construisez par exemple :

- un e-commerce ou l'agent aide a chercher, comparer et acheter
- un SaaS avec navigation assistee et actions guidees dans l'interface
- un back-office ou certaines operations doivent etre confirmees par un humain
- une experience vocale embarquee dans une app React existante

## Ce que React specifique ici

Le role de `@domos/react` n'est pas de fournir le modele IA lui-meme. Le package s'occupe de l'integration cote interface React : cycle de vie, hooks, composants, widget, et synchronisation avec le runtime DomOS.

Les modeles et fournisseurs LLM restent geres cote serveur via les adapters DomOS comme Google ou OpenAI.

Autrement dit, React gere ici la couche produit visible : composants, contexte vivant, experiences utilisateur, feedback et garde-fous. Le "cerveau" reste decouple.

```bash
pnpm add @domos/react @domos/core zod
```

## Lecture rapide

| Si vous cherchez... | Commencez ici |
|---|---|
| Comprendre l'installation et le branchement de base | [Démarrage](./getting-started.md) |
| Declarer des tools et lire l'etat de l'agent | [Hooks](./hooks.md) |
| Utiliser les composants prets a l'emploi | [Composants](./components.md) |
| Integrer directement un chat/widget complet | [Widget](./widget.md) |

## Exports

### Provider

| Export | Description |
|---|---|
| `DomOSProvider` | Provider principal — wraps l'app entière |
| `DomOSContext` | Context React sous-jacent |

### Hooks

| Export | Description |
|---|---|
| `useAgent` | État agent + envoi de messages |
| `useAgentTool` | Enregistre un tool dans un composant |
| `useAgentToolResolver` | Resolver centralisé multi-tools |
| `useNavigationTool` | Tool de navigation URL standard |
| `useViewStateTool` | Tool d'état UI standard |
| `useAgentContext` | Injecte du contexte passif |
| `useApproval` | Accès aux approbations HITL en attente |
| `useVoiceMode` | Microphone + streaming audio |

### Composants

| Export | Description |
|---|---|
| `AgentIndicator` | Badge d'état visuel |
| `ApprovalModal` | Modal HITL (risk `high` / `critical`) |
| `ApprovalBanner` | Bandeau HITL compact |
| `Notification` | Feedback temporaire (risk `low`) |
| `DomOSTool` | Wrapper tool sur élément existant |
| `DomOSToolBtn` | Bouton avec tool intégré |
| `ShadowContainer` | Isolation Shadow DOM |
| `DomOSWidget` | Widget chat complet |

### Utilitaires resolver

| Export | Description |
|---|---|
| `createResolverFromSwitch` | Convertit un switch case en resolver |
| `createCRUDResolver` | Helper pour opérations CRUD |

## Guides

- [Démarrage](./getting-started.md)
- [Hooks](./hooks.md)
- [Composants](./components.md)
- [Widget](./widget.md)
