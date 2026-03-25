# Référence API — @domos/browser

## Objet `DomOS`

L'entrée publique du SDK Browser est un singleton unique nommé `DomOS`.

## Initialisation et cycle de vie

| Méthode | Signature | Description |
|---|---|---|
| `init` | `(config: DomOSBrowserConfig) => Promise<void>` | Initialise le runtime, connecte le client et monte le widget si activé |
| `destroy` | `() => void` | Démonte le widget et libère les ressources |
| `disconnect` | `() => void` | Ferme la connexion WebSocket sans détruire l'intégration |

## Tools

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

| Champ | Type | Description |
|---|---|---|
| `description` | `string` | Description pour le LLM |
| `parameters` | `ToolParameters \| JsonSchemaObject` | Schéma JSON des arguments |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | Niveau HITL |
| `handler` | `(args) => unknown` | Callback exécuté par l'agent |

## Contexte et messagerie

| Méthode | Signature | Description |
|---|---|---|
| `updateContext` | `(data: Record<string, unknown>) => void` | Fusionne des données dans le contexte courant |
| `setContext` | `(data: Record<string, unknown>) => void` | Remplace entièrement le contexte courant |
| `sendText` | `(text: string) => void` | Envoie un message texte |

## Callbacks

| Méthode | Signature | Description |
|---|---|---|
| `onResponse` | `(cb: (text: string, done: boolean) => void) => void` | Écoute les réponses texte de l'agent |
| `onError` | `(cb: (error: Error) => void) => void` | Écoute les erreurs |
| `onReady` | `(cb: () => void) => void` | Écoute la fin d'initialisation |
| `onToolCall` | `(cb: (name: string, args: Record<string, unknown>) => void) => void` | Écoute les appels de tools |
| `onAgentStateChange` | `(cb: (state: AgentState) => void) => void` | Écoute les changements d'état |

## Session et état

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

| Méthode | Signature | Description |
|---|---|---|
| `openWidget` | `() => void` | Ouvre le widget si présent |
| `getMemorySnapshot` | `() => AgentMemorySnapshot \| null` | Retourne l'état mémoire local disponible |
| `addFeedback` | `(feedback) => void` | Ajoute un feedback utilisateur à la mémoire |
