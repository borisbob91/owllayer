# DomosAgent — Guide d'implémentation

> **Package cible** : `@domos/server` (ou `@domos/agent` si isolé)
> **Dépendances** : `@domos/core`, `@domos/server`
> **Compatibilité** : Rétrocompatible — drop-in replacement du `DomOSClient`

---

## Table des matières

1. [Philosophie de conception](#1-philosophie-de-conception)
2. [Architecture](#2-architecture)
3. [Les deux modes de l'agent](#3-les-deux-modes-de-lagent)
4. [Installation & usage minimal](#4-installation--usage-minimal)
5. [Configuration complète](#5-configuration-complète)
6. [Personnalité & rôles](#6-personnalité--rôles)
7. [Système de mémoire](#7-système-de-mémoire)
8. [Planification & objectifs](#8-planification--objectifs)
9. [Feedback loop](#9-feedback-loop)
10. [Prompt dynamique — Text vs Live](#10-prompt-dynamique--text-vs-live)
11. [Mode Live — Gestion de la voix](#11-mode-live--gestion-de-la-voix)
12. [Intégration React / Vue / Svelte](#12-intégration-react--vue--svelte)
13. [Côté serveur — override du systemPrompt](#13-côté-serveur--override-du-systemprompt)
14. [Migration depuis DomOSClient](#14-migration-depuis-domosclient)
15. [Référence API](#15-référence-api)

---

## 1. Philosophie de conception

### Le problème

`DomOSClient` est déjà un agent en puissance. Il gère la connexion WebSocket/WebRTC, les tools, le Shadow Context, HITL, **la voix bidirectionnelle native** via `GoogleLiveAdapter`. Il manque une seule chose : **le cerveau**.

Un `systemPrompt` statique reste une instruction figée. Il ne se souvient pas de ce que l'utilisateur a fait, ne connaît pas ses préférences, ne sait pas qu'il essaie d'accomplir quelque chose de multi-étapes — et surtout, il est identique qu'on soit en mode **texte** ou en mode **vocal live**.

### La solution

`DomosAgent` **wrappe** `DomOSClient`. Il lui ajoute une couche intelligence **consciente du mode** :

```
DomOSClient (transport, tools, HITL, WebSocket/WebRTC)
     ↑ wrappé par
DomosAgent  (mémoire, prompt dynamique, rôles, objectifs, feedback)
     ↑ conscient du mode
AgentPromptBuilder
   ├── buildTextPrompt()   → prompt riche, structuré, multi-sections
   └── buildVoicePrompt()  → prompt court, conversationnel, zéro markdown
```

### Principe central

> L'agent ne se contente plus de **répondre**. Il **mémorise**, **comprend le contexte**, **adapte son comportement** selon qu'il parle ou écrit, et **guide l'utilisateur vers ses objectifs**.

---

## 2. Architecture

```
DomosAgent
├── client: DomOSClient           ← transport, tools, HITL (inchangé)
├── AgentPersonality              ← identité, rôle, ton, restrictions
├── AgentMemory                   ← session + persistante + objectifs + feedback
│   ├── SessionMemory             ← interactions de la session courante
│   └── PersistentMemory          ← préférences, patterns, historique cross-session
├── AgentPromptBuilder            ← construit le prompt dynamique selon le mode
│   ├── buildTextPrompt()         ← mode texte : 6 sections structurées
│   └── buildVoicePrompt()        ← mode Live : court, naturel, sans markdown
└── FeedbackAdapter               ← transforme les feedbacks en patterns comportementaux
```

### Flux en mode texte

```
1. agent.sendText("Ajoute ce produit au panier")
        ↓
2. buildTextPrompt() → prompt 6 sections
        ↓
3. client.updateContext({ __agentPrompt: prompt })
        ↓
4. client.sendText(text) → CONTEXT_UPDATE + USER_INPUT → Serveur → LLM texte
        ↓
5. Réponse LLM (done=true) → memory.saveInteraction()
```

### Flux en mode Live (voix)

```
1. agent.startVoiceSession()
        ↓
2. buildVoicePrompt() → prompt court conversationnel
        ↓
3. GoogleLiveAdapter.createSession({ systemPrompt: voicePrompt, tools, ... })
        ↓
4. Session WebSocket persistante ouverte avec Gemini Live
        ↓
5. agent.sendAudioStream(pcmBase64) → Gemini Live → réponse audio
        ↓
6. Transcriptions in/out → memory.saveInteraction() (via onTranscript)
        ↓
7. agent.endVoiceSession() → session.close()
```

---

## 3. Les deux modes de l'agent

C'est la différence fondamentale introduite par `GoogleLiveAdapter` :

| | Mode texte | Mode Live (voix) |
|---|---|---|
| **Transport** | WebSocket ADTP classique | WebSocket persistant Gemini Live |
| **LLM** | `GoogleAdapter` (requête/réponse) | `GoogleLiveAdapter` (streaming bidirectionnel) |
| **Prompt injecté** | À chaque `sendText()` | À la **création de la session** uniquement |
| **Format du prompt** | Riche, 6 sections, markdown OK | Court, 2-3 règles max, zéro markdown |
| **Mémoire injectée** | Oui — top-K interactions pertinentes | Non — trop long pour la voix |
| **Objectifs injectés** | Oui — étapes détaillées | Oui — version courte (1 ligne) |
| **Function calling** | Séquentiel (appel → résultat → réponse) | Temps réel pendant le stream audio |
| **Transcription** | N/A | Automatique input + output (Gemini natif) |
| **Barge-in** | N/A | Natif — l'utilisateur peut couper l'agent |

### Règle critique pour le prompt Live

En mode Live, le `systemPrompt` est envoyé **une seule fois** à la connexion. Il ne peut pas changer pendant la session. Conséquences pour `DomosAgent` :

1. Le prompt vocal doit être **compact** — fenêtre système limitée.
2. La mémoire session **ne peut pas être injectée** dans le prompt Live.
3. Si le contexte change (changement de page), il faut **fermer et rouvrir** la session Live avec un nouveau prompt.

---

## 4. Installation & usage minimal

### Mode texte

```ts
import { DomosAgent } from '@domos/agent';

const agent = new DomosAgent({
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_dev_123',
});

agent.on({
  onAgentResponse: (text, done) => console.log(text),
});

agent.connect();
agent.sendText('Bonjour !');
```

### Mode Live (voix)

```ts
import { DomosAgent } from '@domos/agent';

const agent = new DomosAgent({
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_dev_123',
  personality: { name: 'Alex', objective: 'Assistant vocal de l\'application' },
  voice: { enabled: true, voiceName: 'Fenrir' },
});

agent.on({
  onAudioOutput:     (data, mime)   => playAudio(data, mime),
  onTranscript:      (role, text)   => appendToUI(role, text),
  onVoiceStateEvent: (event)        => updateVoiceUI(event),
});

agent.connect();

// Ouvrir la session vocale
await agent.startVoiceSession();

// Micro → Gemini Live
micStream.ondata = (pcmBase64) => agent.sendAudioStream(pcmBase64);

// Fin de prise de parole
stopButton.onclick   = () => agent.endAudioTurn();

// Barge-in — couper l'agent
bargeIn.onclick      = () => agent.sendInterrupt();

// Raccrocher
hangup.onclick       = () => agent.endVoiceSession();
```

---

## 5. Configuration complète

```ts
const agent = new DomosAgent({
  // --- Transport (obligatoire) ---
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_dev_123',

  // --- Options client passthrough ---
  clientOptions: {
    autoReconnect: true,
    debug: false,
    transport: 'websocket',
  },

  // --- Personnalité partagée text + voice ---
  personality: {
    name: 'Maya',
    role: 'advisor',
    objective: 'Accompagner les agriculteurs dans la saisie et l\'analyse de leurs données terrain.',
    tone: 'Bienveillant, concret, utilise des exemples du quotidien',
    language: 'fr',
    restrictions: [
      'Ne jamais supprimer des données sans confirmation',
      'Toujours proposer un résumé avant une action complexe',
    ],
  },

  // --- Mémoire ---
  memory: {
    session: true,
    persistent: false,
    maxSessionHistory: 5,
  },

  // --- Voice config (mode Live) ---
  voice: {
    enabled: true,
    voiceName: 'Kore',   // Fenrir | Puck | Kore | Charon | Aoede
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  },

  // --- Rôle dynamique selon la page ---
  roleAdapter: (context) => {
    if (String(context['url']).startsWith('/admin')) {
      return { role: 'expert', tone: 'Technique, précis' };
    }
    return {};
  },

  // --- Hook prompt (debug / enrichissement) ---
  onPromptBuilt: (prompt, mode, context) => {
    console.log(`[DomosAgent][${mode}]`, prompt.slice(0, 150));
    return prompt;
  },
});
```

---

## 6. Personnalité & rôles

La personnalité est **partagée** entre les deux modes. `AgentPromptBuilder` l'adapte automatiquement selon le format attendu.

```ts
// Même personnalité → deux formes différentes selon le mode

// Mode texte → prompt structuré
"[IDENTITÉ]
Tu es Maya, Accompagner les agriculteurs dans la saisie...
Ton rôle : advisor | Style : Bienveillant, concret..."

// Mode Live → prompt ultra-compact
"Tu es Maya, assistante terrain agricole.
Style : bienveillant, concret. Réponses courtes (1-2 phrases max).
Pas de listes ni de markdown — tu parles, pas tu écris."
```

### Rôle dynamique

En mode Live, le `roleAdapter` est appelé **à la création de la session** — le prompt ne pouvant pas changer en cours de session, c'est le seul moment où il est pris en compte.

```ts
roleAdapter: (context) => {
  const page = String(context['url'] ?? '');
  if (page.startsWith('/checkout')) {
    return {
      objective: 'Guider l\'utilisateur dans le processus de paiement.',
      tone: 'Rassurant, précis sur les étapes',
    };
  }
  return {};
},
```

---

## 7. Système de mémoire

### Ce qui est sauvegardé

```ts
interface Interaction {
  id: string;
  timestamp: number;
  userRequest: string;   // Texte saisi ou transcription (mode Live)
  agentResponse: string; // Réponse texte ou transcription output (mode Live)
  page: string;          // Page au moment de l'interaction
  toolsUsed: string[];   // Tools appelés pendant l'interaction
  mode: 'text' | 'voice';
}
```

### En mode Live — sauvegarde via transcriptions

`GoogleLiveAdapter` fournit `onTranscript(role, text)` nativement. `DomosAgent` l'utilise pour alimenter la mémoire sans intervention du développeur. À chaque `turnComplete`, l'interaction complète (question + réponse + tools) est sauvegardée :

```
[turn_complete]
  userRequest  : "Est-ce que la parcelle nord a été saisie ?"  (transcription input)
  agentResponse: "Oui, la parcelle nord a bien été enregistrée le 10 mars." (transcription output)
  toolsUsed    : ["search_parcelles"]
  mode         : "voice"
  → memory.saveInteraction(...)
```

### Mémoire et changement de page en mode Live

```ts
// Recommandé : redémarrer la session pour un prompt à jour
agent.on({
  onContextChange: async (newContext) => {
    if (agent.isVoiceActive) {
      await agent.restartVoiceSession(); // close() + startVoiceSession()
    }
  },
});

// Acceptable si le contexte change peu
agent.updateContext({ url: newPage }); // Mis à jour silencieusement
```

---

## 8. Planification & objectifs

### En mode texte — version détaillée

```
[OBJECTIFS EN COURS]
• [ACTIVE] Onboarding complet
  ✅ Compléter le profil
  ✅ Configurer les préférences
  ⬜ Lier un mode de paiement   ← tu es là
  ⬜ Vérifier l'adresse email
```

### En mode Live — version compacte

```
Objectif en cours : "Onboarding complet"
Étape actuelle : Lier un mode de paiement (/billing).
```

### API (identique dans les deux modes)

```ts
const objective = agent.createObjective(
  'Onboarding complet',
  [
    { description: 'Compléter le profil',        targetPage: '/profile' },
    { description: 'Configurer les préférences', targetPage: '/settings' },
    { description: 'Lier un mode de paiement',   targetPage: '/billing' },
  ]
);

agent.completeStep(objective.id, 'step_0');
agent.completeStep(objective.id, 'step_1');

agent.getActiveObjectives(); // → [{ id, description, steps, status }]
```

---

## 9. Feedback loop

```ts
// Feedback après réponse texte
agent.addFeedback({ type: 'negative', message: 'Trop long.', timestamp: Date.now() });

// Feedback après interaction vocale
agent.addFeedback({ type: 'positive', timestamp: Date.now() });

// Correction
agent.addFeedback({ type: 'correction', message: 'Ce n\'est pas Lyon, c\'est Abidjan.', timestamp: Date.now() });
```

Les patterns générés s'injectent dans le **prompt texte** immédiatement, et dans le **prompt vocal** à la prochaine création de session.

```
// 3× feedback négatif → pattern auto-généré :
"L'utilisateur préfère des réponses plus concises."

// Injecté dans le prompt texte :
[PRÉFÉRENCES MÉMORISÉES]
Comportements observés :
- L'utilisateur préfère des réponses plus concises.
```

---

## 10. Prompt dynamique — Text vs Live

### Prompt texte complet (exemple)

```
[IDENTITÉ]
Tu es Maya, Accompagner les agriculteurs dans la saisie et l'analyse de leurs données terrain.
Ton rôle : advisor | Style : Bienveillant, concret | Date : 11/03/2026 | Langue : fr

[CONTEXTE]
Page : /collect/new
Données UI disponibles :
  formId: "form_abc123"
  fields: ["parcelle","culture","date_semis"]

[MÉMOIRE SESSION]
[09:12] Utilisateur : Comment ajouter une nouvelle parcelle ?
[09:12] Toi : Clique sur "Nouvelle parcelle" en haut à droite...
---
[09:18] Utilisateur : Quelle culture mettre pour le maïs ?
[09:18] Toi : Dans le champ "culture", tape "maïs"...

[PRÉFÉRENCES MÉMORISÉES]
Préférences : {"language":"fr","theme":"dark"}
Comportements observés :
- L'utilisateur préfère des réponses plus concises.

[OBJECTIFS EN COURS]
• [ACTIVE] Première collecte terrain
  ✅ Se connecter  ✅ Créer une parcelle
  ⬜ Remplir le formulaire  ← tu es là
  ⬜ Soumettre les données

[RÈGLES]
- Tu as accès à des tools qui changent selon la page.
- Confirme chaque action. N'invente pas de données.
- risk:high et risk:critical → demande confirmation.
- Ne jamais supprimer des données sans confirmation.

[FORMAT]
Sois concis (max 2-3 phrases). Réponds en français.
```

**Taille estimée** : 500–1500 tokens selon la mémoire.

### Prompt vocal complet (exemple)

```
Tu es Maya, assistante terrain agricole.
Date : 11/03/2026.

STYLE : Bienveillant, concret. Réponses courtes (1-2 phrases max).
Pas de listes ni de markdown — tu parles, pas tu écris.
Si tu navigues, dis "Je vais..." AVANT d'appeler l'outil.

OUTILS : Tu peux agir sur l'interface. Confirme brièvement chaque action.

SÉCURITÉ : Les actions importantes demandent confirmation vocale.

OBJECTIF EN COURS : Première collecte terrain — étape actuelle : remplir le formulaire.

RÈGLES :
- Ne supprime jamais de données sans confirmation explicite.
- Si tu ne comprends pas, demande de répéter brièvement.
```

**Taille estimée** : 100–200 tokens. Toujours.

### Comparaison des sections

| Section | Texte | Live |
|---|---|---|
| Identité | Détaillée (rôle, ton, date, langue) | Compacte (1-2 lignes) |
| Contexte page + Shadow Context | ✅ Oui | ❌ Non |
| Mémoire session (top-K) | ✅ Oui | ❌ Non |
| Préférences mémorisées | ✅ Oui | ❌ Non |
| Objectifs | ✅ Détaillés avec étapes | ✅ 1 ligne — étape courante |
| Règles HITL | Complètes | Simplifiées |
| Instructions format | Texte | Voix (pas de markdown) |

---

## 11. Mode Live — Gestion de la voix

### Cycle de vie d'une session vocale

```
startVoiceSession()
    → buildVoicePrompt()
    → GoogleLiveAdapter.createSession({ systemPrompt, tools, voice, callbacks })
    → Session Gemini Live ouverte ✅

sendAudioStream(pcmBase64)          ← flux micro continu (16kHz PCM)
endAudioTurn()                      ← l'utilisateur a fini de parler
sendInterrupt()                     ← barge-in (coupe l'agent pendant qu'il parle)

onAudioOutput(data, mime)           ← Gemini renvoie l'audio réponse (24kHz PCM)
onTranscript('user', text)          ← transcription de ce que l'utilisateur a dit
onTranscript('agent', text)         ← transcription de ce que l'agent a dit
onVoiceStateEvent('turn_complete')  ← fin du tour → interaction sauvegardée en mémoire

endVoiceSession()
    → session.close()
    → isVoiceActive = false
```

### Gestion des tool calls en temps réel

En mode Live, Gemini peut appeler des tools **pendant qu'il génère l'audio**. `DomosAgent` câble automatiquement le cycle complet :

```ts
// Cycle interne — géré automatiquement par DomosAgent
onToolCall: async (toolCall) => {
  this._liveToolsUsed.push(toolCall.name);
  this.handlers.onToolCall?.(toolCall.name, toolCall.args);

  const tool = this.client.tools.get(toolCall.name);

  if (!tool) {
    await this._liveSession.sendToolResponse(
      toolCall.callId, toolCall.name, { error: 'Tool not found' }
    );
    return;
  }

  try {
    const result = await tool.handler(toolCall.args);
    // Gemini reprend la parole immédiatement après avoir reçu le résultat
    await this._liveSession.sendToolResponse(toolCall.callId, toolCall.name, result);
  } catch (err) {
    await this._liveSession.sendToolResponse(
      toolCall.callId, toolCall.name,
      { error: err instanceof Error ? err.message : String(err) }
    );
  }
},
```

### Voix disponibles (Gemini Live)

| Nom | Caractère |
|---|---|
| `Fenrir` | Grave, autoritaire (défaut) |
| `Puck` | Léger, enjoué |
| `Kore` | Féminin, doux |
| `Charon` | Neutre, posé |
| `Aoede` | Féminin, expressif |

### Redémarrage de session après changement de page

```ts
// Pattern recommandé — router / layout
router.afterEach(async (to) => {
  agent.updateContext({ url: to.path });
  if (agent.isVoiceActive) {
    // Nouveau prompt avec le nouveau contexte de page
    await agent.restartVoiceSession();
  }
});
```

---

## 12. Intégration React / Vue / Svelte

### React — hook complet avec support voix

```tsx
// hooks/useAgent.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { DomosAgent } from '@domos/agent';
import type { AgentConfig } from '@domos/agent';

export function useAgent(config: AgentConfig) {
  const agentRef                          = useRef<DomosAgent | null>(null);
  const [state, setState]                 = useState('disconnected');
  const [lastResponse, setLastResponse]   = useState('');
  const [isThinking, setIsThinking]       = useState(false);
  const [isVoiceActive, setVoiceActive]   = useState(false);
  const [transcript, setTranscript]       = useState<{ role: string; text: string }[]>([]);

  useEffect(() => {
    const agent = new DomosAgent(config);
    agent.on({
      onStateChange:     (s)          => { setState(s); setIsThinking(s === 'thinking'); },
      onAgentResponse:   (text, done) => { if (done) setLastResponse(text); },
      onAudioOutput:     (data, mime) => playAudio(data, mime),
      onTranscript:      (role, text) => setTranscript(p => [...p, { role, text }]),
      onVoiceStateEvent: (event)      => { if (event === 'turn_complete') setIsThinking(false); },
    });
    agent.connect();
    agentRef.current = agent;
    return () => agent.destroy();
  }, []);

  const startVoice = useCallback(async () => {
    await agentRef.current?.startVoiceSession();
    setVoiceActive(true);
  }, []);

  const endVoice = useCallback(() => {
    agentRef.current?.endVoiceSession();
    setVoiceActive(false);
  }, []);

  return {
    agent: agentRef.current,
    state, lastResponse, isThinking, isVoiceActive, transcript,
    sendText:     (t: string) => agentRef.current?.sendText(t),
    sendAudio:    (b: string) => agentRef.current?.sendAudioStream(b),
    endAudioTurn: ()          => agentRef.current?.endAudioTurn(),
    interrupt:    ()          => agentRef.current?.sendInterrupt(),
    startVoice, endVoice,
    addFeedback:  (fb: any)   => agentRef.current?.addFeedback(fb),
  };
}
```

```tsx
// VoiceButton.tsx — push-to-talk
function VoiceButton({ agent }) {
  const { isVoiceActive, startVoice, sendAudio, endAudioTurn } = agent;
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);

  const handleStart = async () => {
    if (!isVoiceActive) await startVoice();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      const reader = new FileReader();
      reader.onload = () => sendAudio((reader.result as string).split(',')[1]);
      reader.readAsDataURL(e.data);
    };
    recorder.start(250);
    mediaRef.current = recorder;
    setRecording(true);
  };

  const handleStop = () => {
    mediaRef.current?.stop();
    setRecording(false);
    endAudioTurn();
  };

  return (
    <button onMouseDown={handleStart} onMouseUp={handleStop}>
      {recording ? '🔴 Parlez...' : '🎤 Maintenir pour parler'}
    </button>
  );
}
```

### Svelte — stores avec voix

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { writable } from 'svelte/store';
  import { DomosAgent } from '@domos/agent';

  const agentState    = writable('disconnected');
  const lastResponse  = writable('');
  const isVoiceActive = writable(false);
  const transcript    = writable([]);

  let agent;

  onMount(() => {
    agent = new DomosAgent({
      endpoint: 'ws://localhost:3000/domos',
      apiKey: 'pk_dev_123',
      personality: { name: 'Maya', objective: 'Assistante terrain' },
      voice: { enabled: true, voiceName: 'Kore' },
    });
    agent.on({
      onStateChange:   (s)          => agentState.set(s),
      onAgentResponse: (text, done) => { if (done) lastResponse.set(text); },
      onTranscript:    (role, text) => transcript.update(t => [...t, { role, text }]),
      onAudioOutput:   (data, mime) => playAudio(data, mime),
    });
    agent.connect();
  });

  onDestroy(() => agent?.destroy());

  async function startVoice() {
    await agent.startVoiceSession();
    isVoiceActive.set(true);
  }

  function endVoice() {
    agent.endVoiceSession();
    isVoiceActive.set(false);
  }
</script>

<p>{$agentState === 'thinking' ? 'Réflexion...' : $lastResponse}</p>

{#if $isVoiceActive}
  <button on:click={endVoice}>📵 Raccrocher</button>
{:else}
  <button on:click={startVoice}>📞 Appeler l'assistant</button>
{/if}

<div class="transcript">
  {#each $transcript as line}
    <p class="msg {line.role}"><strong>{line.role}</strong> : {line.text}</p>
  {/each}
</div>
```

---

## 13. Côté serveur — override du systemPrompt

### Mode texte

Le serveur lit `__agentPrompt` depuis le payload `CONTEXT_UPDATE` :

```ts
// DomOSServer — handler CONTEXT_UPDATE
onContextUpdate(session, payload) {
  session.context     = payload.context;
  session.activeTools = payload.activeTools;

  if (payload.context?.__agentPrompt) {
    session.dynamicSystemPrompt = String(payload.context.__agentPrompt);
  }
}

// DomOSServer — handler USER_INPUT, appel LLM
const systemPrompt =
  session.dynamicSystemPrompt     // DomosAgent → prompt dynamique
  ?? this.config.llm.systemPrompt // Fallback → prompt statique du serveur
  ?? DEFAULT_PROMPTS.TEXT_AGENT();
```

### Mode Live

Le prompt est construit par `DomosAgent` et passé directement à `GoogleLiveAdapter.createSession()`. Le serveur n'intervient pas — c'est l'agent côté client qui pilote la session Live :

```ts
// Dans DomosAgent.startVoiceSession()
const voicePrompt = this.promptBuilder.buildVoicePrompt({ ... });

this._liveSession = await this._liveAdapter.createSession({
  systemPrompt: voicePrompt,           // ← prompt dynamique injecté ici
  tools: this.client.registeredTools,  // ← tools de la page courante
  voice: this.config.voice?.voiceName ?? 'Fenrir',
  onAudioOutput: ...,
  onToolCall: ...,
  onTranscript: ...,
  onTextOutput: ...,
});
```

Cette approche est **non-breaking** : sans `DomosAgent`, le serveur continue d'utiliser son `systemPrompt` statique.

---

## 14. Migration depuis DomOSClient

### Avant

```ts
import { DomOSClient } from '@domos/core';

const client = new DomOSClient({
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_dev_123',
});

client.on({
  onAgentResponse: (text, done) => setResponse(text),
  onStateChange:   (state)      => setState(state),
  onAudioOutput:   (data, mime) => playAudio(data, mime),
});

client.connect();
client.sendText('Bonjour');
client.sendAudioStream(pcmBase64);
client.sendAudioEnd();
```

### Après

```ts
import { DomosAgent } from '@domos/agent';

const agent = new DomosAgent({
  endpoint: 'ws://localhost:3000/domos',  // ← même
  apiKey: 'pk_dev_123',
  // + optionnel : personality, memory, voice
});

agent.on({
  onAgentResponse: (text, done) => setResponse(text),  // ← même
  onStateChange:   (state)      => setState(state),    // ← même
  onAudioOutput:   (data, mime) => playAudio(data, mime), // ← même
  onTranscript:    (role, text) => appendTranscript(role, text), // ← nouveau
});

agent.connect();
agent.sendText('Bonjour');

// Mode Live — maintenant géré par l'agent
await agent.startVoiceSession();
agent.sendAudioStream(pcmBase64);
agent.endAudioTurn();
```

**Différence de comportement visible** : l'agent construit un prompt dynamique et mémorise les interactions. Rien d'autre ne change côté API.

---

## 15. Référence API

### Configuration

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `endpoint` | `string` | — | URL WebSocket du serveur DomOS |
| `apiKey` | `string` | — | Clé API |
| `clientOptions` | `Partial<DomOSClientOptions>` | `{}` | Options DomOSClient |
| `personality.name` | `string` | `'DomOS'` | Nom de l'agent |
| `personality.role` | `string` | `'assistant'` | Rôle |
| `personality.objective` | `string` | — | Mission de l'agent |
| `personality.tone` | `string` | — | Style de communication |
| `personality.restrictions` | `string[]` | `[]` | Règles comportementales |
| `memory.session` | `boolean` | `true` | Mémoire de session |
| `memory.persistent` | `boolean` | `false` | Mémoire persistante |
| `memory.maxSessionHistory` | `number` | `5` | Max interactions dans le prompt texte |
| `voice.enabled` | `boolean` | `false` | Activer le mode Live |
| `voice.voiceName` | `string` | `'Fenrir'` | Voix Gemini |
| `voice.model` | `string` | `gemini-2.5-flash-...` | Modèle Gemini Live |
| `roleAdapter` | `(ctx) => Partial<AgentPersonality>` | — | Rôle dynamique |
| `onPromptBuilt` | `(prompt, mode, ctx) => string` | — | Hook prompt |

### Méthodes

| Méthode | Description |
|---|---|
| `connect()` | Connecter au serveur |
| `disconnect()` | Déconnecter |
| `destroy()` | Déconnecter + nettoyer |
| `on(handlers)` | Enregistrer les handlers |
| `sendText(text)` | Message texte (prompt auto-injecté) |
| `sendAudioStream(b64, mime?)` | Flux audio micro → Gemini Live |
| `endAudioTurn()` | Signaler fin de prise de parole |
| `sendInterrupt()` | Barge-in — couper l'agent |
| `startVoiceSession()` | Ouvrir une session Gemini Live |
| `endVoiceSession()` | Fermer la session Live |
| `restartVoiceSession()` | Fermer + rouvrir avec nouveau prompt |
| `registerTool(tool)` | Enregistrer un tool |
| `unregisterTool(name)` | Désinscrire un tool |
| `updateContext(data)` | Mettre à jour le Shadow Context |
| `getMemory()` | Snapshot mémoire session + persistante |
| `updatePreferences(prefs)` | Mettre à jour les préférences |
| `addFeedback(feedback)` | Ajouter un feedback |
| `clearSession()` | Vider la mémoire de session |
| `createObjective(desc, steps)` | Créer un objectif multi-étapes |
| `completeStep(objId, stepId)` | Marquer une étape accomplie |
| `getActiveObjectives()` | Objectifs actifs |
| `setPersonality(p)` | Changer la personnalité |

### Handlers

| Handler | Signature | Description |
|---|---|---|
| `onStateChange` | `(state: ClientState) => void` | Changement d'état |
| `onSessionId` | `(id: string) => void` | Session établie |
| `onAgentResponse` | `(text: string, done: boolean) => void` | Réponse texte |
| `onAudioOutput` | `(data: string, mime: string) => void` | Audio réponse (mode Live) |
| `onTranscript` | `(role: 'user'\|'agent', text: string) => void` | Transcription (mode Live) |
| `onVoiceStateEvent` | `(event: string, reason?: string) => void` | État vocal |
| `onToolCall` | `(name: string, args: Record<string, unknown>) => void` | Tool appelé |
| `onApprovalRequest` | `(request, resolve) => void` | Demande HITL |
| `onMemoryUpdated` | `(memory: AgentMemorySnapshot) => void` | Mémoire mise à jour |
| `onError` | `(err: Error) => void` | Erreur |

### Getters

| Getter | Type | Description |
|---|---|---|
| `state` | `ClientState` | État courant |
| `sessionId` | `string \| null` | ID de session |
| `isConnected` | `boolean` | Connexion active |
| `isVoiceActive` | `boolean` | Session Live ouverte |
| `currentPage` | `string` | Page courante |
| `client` | `DomOSClient` | Accès au client sous-jacent |

---

## Conclusion

`DomosAgent` transforme DomOS en une **plateforme d'intelligence agentique bimodale** — l'agent peut **écrire et parler**, avec une mémoire, une personnalité et une intention cohérentes dans les deux modes.

La clé de la conception est la **séparation nette** entre les deux prompts :

- Le **prompt texte** est riche, contextuel, mémorisé, reconstruit à chaque requête.
- Le **prompt vocal** est compact, conversationnel, injecté une seule fois à l'ouverture de la session Live.

Les deux partagent la même personnalité, les mêmes objectifs, le même feedback — seule la **forme** s'adapte selon que l'agent parle ou écrit.

> `DomOSClient` gère le **comment** — transport, protocole, sécurité, audio.
> `DomosAgent` gère le **quoi**, le **pourquoi** et le **comment parler** — mémoire, intention, personnalité, mode.
