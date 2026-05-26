---
title: "R�f�rence API � @domos/browser"
description: Documentation DomOS.
---

# Référence API — @domos/browser

Cette reference decrit l'API publique du singleton `DomOS`.

Elle est utile quand vous voulez piloter l'integration de maniere plus fine que via le widget ou l'auto-discovery HTML.

La logique generale est la suivante :

- `init`, `destroy`, `disconnect` gerent le cycle de vie
- `registerTool` et `unregisterTool` exposent les actions agent
- `sendText`, `updateContext`, `setContext` pilotent la conversation et le contexte
- les callbacks servent a raccorder DomOS a votre propre interface

## Objet `DomOS`

L'entrée publique du SDK Browser est un singleton unique nommé `DomOS`.

## Initialisation et cycle de vie

Ces methodes servent a demarrer, arreter ou nettoyer l'integration.

| Méthode | Signature | Description |
|---|---|---|
| `init` | `(config: DomOSBrowserConfig) => Promise<void>` | Initialise le runtime, connecte le client et monte le widget si activé |
| `destroy` | `() => void` | Démonte le widget et libère les ressources |
| `disconnect` | `() => void` | Ferme la connexion WebSocket sans détruire l'intégration |

## Tools

Ces methodes servent a dire explicitement a l'agent ce qu'il a le droit de faire dans votre page.

| Méthode | Signature | Description |
|---|---|---|
| `registerTool` | `(name: string, definition: BrowserToolDefinition) => void` | Enregistre un tool programmable |
| `unregisterTool` | `(name: string) => void` | Retire un tool |

```ts
DomOS.registerTool('open_support', {
  description: 'Ouvrir la page support',
  risk: 'none',
  handler: async () => {
    window.location.href = '/support';
    return { ok: true };
  },
});
```

### `BrowserToolDefinition`

Cette structure decrit un tool programmable. C'est l'equivalent JavaScript d'un tool declare dans le HTML.

| Champ | Type | Description |
|---|---|---|
| `description` | `string` | Description pour le LLM |
| `parameters` | `ToolParameters \| JsonSchemaObject` | Schéma JSON des arguments |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL |
| `handler` | `(args) => unknown` | Callback exécuté par l'agent |

## Contexte et messagerie

Ces methodes servent a alimenter l'agent avec la situation courante et a lui envoyer des messages.

| Méthode | Signature | Description |
|---|---|---|
| `updateContext` | `(data: Record<string, unknown>) => void` | Fusionne des données dans le contexte courant |
| `setContext` | `(data: Record<string, unknown>) => void` | Remplace entièrement le contexte courant |
| `sendText` | `(text: string) => void` | Envoie un message texte |

## Callbacks

Les callbacks sont utiles quand vous construisez votre propre UI et que vous voulez reactiver des comportements au fil de la conversation.

| Méthode | Signature | Description |
|---|---|---|
| `onResponse` | `(cb: (text: string, done: boolean) => void) => void` | Écoute les réponses texte de l'agent |
| `onError` | `(cb: (error: Error) => void) => void` | Écoute les erreurs |
| `onReady` | `(cb: () => void) => void` | Écoute la fin d'initialisation |
| `onToolCall` | `(cb: (name: string, args: Record<string, unknown>) => void) => void` | Écoute les appels de tools |
| `onAgentStateChange` | `(cb: (state: AgentState) => void) => void` | Écoute les changements d'état |

## Session et état

Cette partie permet de lire l'etat courant du transport et de la conversation, par exemple pour restaurer une session ou afficher un statut dans l'interface.

| Méthode | Signature | Description |
|---|---|---|
| `getSession` | `() => SessionInfo` | Retourne les informations de session |
| `getAgentState` | `() => AgentState` | Retourne l'état courant de l'agent |

### `SessionInfo`

| Champ | Type | Description |
|---|---|---|
| `sessionId` | `string \| null` | Identifiant de session |
| `status` | `'disconnected' \| 'connecting' \| 'connected'` | Statut transport |
| `messageCount` | `number` | Nombre de messages conservés |

### `AgentState`

| Valeur | Description |
|---|---|
| `'connecting'` | Connexion WebSocket en cours |
| `'idle'` | Connecté et en attente |
| `'listening'` | Capture micro active |
| `'thinking'` | L'agent traite la requête |
| `'speaking'` | Lecture audio en cours |
| `'streaming'` | Streaming texte en cours |
| `'error'` | Erreur de connexion ou d'audio |

## Voix

Ces methodes deviennent importantes des que vous voulez construire une experience plus proche d'un assistant vocal que d'un simple chat.

| Méthode | Signature | Description |
|---|---|---|
| `startVoice` | `() => Promise<void>` | Démarre la capture micro |
| `stopVoice` | `() => void` | Arrête la capture |
| `muteMic` | `() => void` | Coupe localement le micro |
| `isVoiceActive` | `() => boolean` | Indique si le mode vocal est actif |
| `getVoiceState` | `() => VoiceState` | Retourne l'état détaillé de la voix |

### `VoiceState`

| Valeur | Description |
|---|---|
| `'idle'` | Inactif |
| `'capturing'` | Capture active |
| `'awaiting_model'` | Réponse du modèle attendue |
| `'playing'` | Lecture audio de la réponse |
| `'interrupted'` | Réponse interrompue |
| `'error'` | Erreur audio |

## Widget et mémoire

Cette partie couvre les raccourcis pratiques lies au widget et a l'etat memoire local expose par le runtime.

| Méthode | Signature | Description |
|---|---|---|
| `openWidget` | `() => void` | Ouvre le widget si présent |
| `getMemorySnapshot` | `() => AgentMemorySnapshot \| null` | Retourne l'état mémoire local disponible |
| `addFeedback` | `(feedback) => void` | Ajoute un feedback utilisateur à la mémoire |
