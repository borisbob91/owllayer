---
title: "@domos/svelte"
description: Documentation DomOS.
---

# @domos/svelte

DomOS est un SDK d'**AI-driven interfaces**, ou interfaces agentiques : l'agent agit dans une interface existante par les tools explicitement déclarés par l'application. `@domos/svelte` intègre ce modèle avec stores, actions, HITL et widget texte ou vocal.

Les actions Svelte déclarent les capacités visibles sur la page courante ; lorsqu'un élément n'est plus monté, son tool ne doit plus être présenté à l'agent.

```bash
pnpm add @domos/svelte @domos/core zod
```

## Exports

### Stores

| Export | Description |
|---|---|
| `domosClient` | Instance cliente DomOS courante |
| `agentState` | Store de l'état courant de l'agent |
| `sessionId` | Store de l'identifiant de session |
| `lastResponse` | Store du dernier message agent |
| `pendingApproval` | Store de la demande HITL en attente |
| `isConnected` | Store booléen de connexion |
| `isThinking` | Store booléen de réflexion |
| `isSpeaking` | Store booléen de lecture audio |

### Fonctions de store

| Export | Description |
|---|---|
| `initDomOS` | Initialise DomOS une fois à la racine de l'application |
| `sendText` | Envoie un message texte |
| `sendAudio` | Envoie un chunk audio en mode STT |
| `sendAudioStream` | Envoie un flux audio en mode Live |
| `sendAudioEnd` | Signale la fin du flux audio |
| `sendInterrupt` | Interrompt l'agent pendant sa réponse |
| `approveAction` | Accepte une demande HITL |
| `denyAction` | Refuse une demande HITL |
| `onAudioOutput` | Écoute les chunks audio de sortie |

### Actions Svelte

| Export | Description |
|---|---|
| `agentTool` | Enregistre un tool sur un nœud DOM |
| `agentToolResolver` | Enregistre un resolver multi-tools |
| `agentContext` | Injecte du contexte passif |
| `navigateTool` | Tool de navigation URL standard |
| `uiStateTool` | Tool d'état UI standard |

### Helpers et composables

| Export | Description |
|---|---|
| `createAgent` | Helper pour regrouper les stores agent utiles |
| `createVoiceMode` | Helper microphone et audio |
| `createResolverFromSwitch` | Convertit une map de handlers en resolver |
| `createCRUDResolver` | Génère les tools CRUD d'une ressource |

### Composants

| Export | Description |
|---|---|
| `AgentIndicator` | Badge d'état visuel |
| `ApprovalModal` | Modal HITL |
| `ApprovalBanner` | Bandeau HITL compact |
| `DomOSTool` | Wrapper tool sur élément existant |
| `DomOSToolBtn` | Bouton avec tool intégré |
| `DomOSWidget` | Widget chat complet |

## Guides

- [Démarrage](./getting-started.md)
- [Stores et actions](./stores-actions.md)
- [Composants](./components.md)
- [Widget](./widget.md)
