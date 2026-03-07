# DomOS — TODO & Sprints Restants

> Etat actuel du projet et tout ce qui reste a faire.

---

## Etat Actuel (Fait)

| Package | Description | Status |
|---|---|---|
| `@domos/core` | Protocole ADTP, DomOSClient, ToolRegistry, Shadow Context, HITL, Utils | ✅ Fait |
| `@domos/server` | DomOSServer, ADTPTransport, SessionManager, ToolRouter, Middleware, Memory | ✅ Fait |
| `@domos/react` | DomOSProvider, useAgentTool, useAgent, useAgentContext, useApproval, useVoiceMode, composants | ✅ Fait |
| `@domos/vue` | DomOSPlugin, useAgentTool, useAgent, useAgentContext, useVoiceMode, composants | ✅ Fait |
| `@domos/adapter-google` | GoogleAdapter (Gemini 2.0 Flash text + function calling) | ✅ Fait |
| `apps/demo` | App demo React e-commerce (Tailwind v3) | ✅ Fait |
| `apps/demo-server` | Serveur demo (DomOSServer + GoogleAdapter) | ✅ Fait |
| Documentation | README.md + docs/ (Getting Started, ADTP Protocol, HITL Security, Custom Adapter) | ✅ Fait |
| Renommages | Terminologie framework (ADTP, HITL, Shadow Context, Agentic UI) | ✅ Fait |
| DomOSClient | Client framework-agnostic dans core avec sync auto des tools | ✅ Fait |
| Tests unitaires | 52 tests (core: 31, server: 21) | ✅ Fait |

---

## Ce Qui Reste

### SPRINT 5 — SDK Svelte (`@domos/svelte`) ✅ FAIT

Le SDK Svelte est fait, avec stores, actions, composables, composants et DomOSWidget.

**Fichiers a creer :**

```
packages/svelte/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── stores/
    │   └── domos.store.ts            # Store Svelte (writable) avec DomOSClient
    ├── actions/
    │   ├── useAgentTool.ts           # Action Svelte (use:agentTool)
    │   └── useAgentContext.ts        # Action Svelte (use:agentContext)
    ├── composables/
    │   ├── createAgent.ts            # Equivalent de useAgent pour Svelte
    │   └── createVoiceMode.ts        # Equivalent de useVoiceMode
    └── components/
        ├── agentic-ui.Indicator.svelte
        └── hitl.ApprovalModal.svelte
```

**`package.json` :**

```json
{
  "name": "@domos/svelte",
  "version": "0.1.0",
  "description": "DomOS Svelte SDK - Stores et Actions pour UI Agentique",
  "type": "module",
  "svelte": "./dist/index.js",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --external svelte --external @domos/core --external zod",
    "dev": "tsup src/index.ts --format esm --dts --watch --external svelte --external @domos/core --external zod"
  },
  "peerDependencies": {
    "svelte": ">=4.0.0"
  },
  "dependencies": {
    "@domos/core": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsup": "^8.3.5",
    "typescript": "^5.7.2",
    "svelte": "^4.2.0"
  }
}
```

**`src/stores/domos.store.ts` :**

```ts
import { writable, derived, get } from 'svelte/store';
import {
  DomOSClient,
  type DomOSClientOptions,
  type ClientState,
  type ToolDeclaration,
} from '@domos/core';

// Store principal
export const domosClient = writable<DomOSClient | null>(null);
export const agentState = writable<ClientState>('disconnected');
export const sessionId = writable<string | null>(null);
export const lastResponse = writable<string | null>(null);

// Derived
export const isConnected = derived(agentState, ($s) => $s === 'connected' || $s === 'listening');
export const isThinking = derived(agentState, ($s) => $s === 'thinking');
export const isSpeaking = derived(agentState, ($s) => $s === 'speaking');

/**
 * Initialiser DomOS. A appeler une fois dans le layout racine.
 */
export function initDomOS(options: DomOSClientOptions) {
  const client = new DomOSClient(options);

  client.on({
    onStateChange: (state) => agentState.set(state),
    onSessionId: (id) => sessionId.set(id),
    onAgentResponse: (text, done) => {
      lastResponse.set(text);
      agentState.set(done ? 'connected' : 'speaking');
    },
  });

  domosClient.set(client);
  client.connect();

  return () => client.destroy();
}

/**
 * Envoyer un message texte.
 */
export function sendText(text: string) {
  const client = get(domosClient);
  if (client) {
    lastResponse.set(null);
    client.sendText(text);
  }
}

/**
 * Envoyer de l'audio.
 */
export function sendAudio(audioBase64: string, mimeType?: string) {
  const client = get(domosClient);
  client?.sendAudio(audioBase64, mimeType);
}
```

**`src/actions/useAgentTool.ts` :**

```ts
import { get } from 'svelte/store';
import { domosClient } from '../stores/domos.store.js';
import { type z } from 'zod';
import { zodToToolParameters, type ToolDeclaration } from '@domos/core';

interface AgentToolOptions<T = unknown> {
  name: string;
  description: string;
  schema?: z.ZodObject<any>;
  risk?: 'none' | 'low' | 'high' | 'critical';
  handler: (args: T) => Promise<unknown> | unknown;
}

/**
 * Action Svelte pour enregistrer un tool.
 *
 * @example
 * ```svelte
 * <div use:agentTool={{
 *   name: 'add_to_cart',
 *   description: 'Ajouter au panier',
 *   schema: z.object({ quantity: z.number() }),
 *   handler: async ({ quantity }) => cart.add(product, quantity),
 * }}>
 *   {product.name}
 * </div>
 * ```
 */
export function agentTool(node: HTMLElement, options: AgentToolOptions) {
  const client = get(domosClient);
  if (!client) return;

  const declaration: ToolDeclaration = {
    name: options.name,
    description: options.description,
    parameters: options.schema ? zodToToolParameters(options.schema) : undefined,
  };

  const handler = async (args: any) => {
    if (options.schema) {
      const parsed = options.schema.safeParse(args);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);
      return options.handler(parsed.data);
    }
    return options.handler(args);
  };

  const componentId = Math.random().toString(36).slice(2);
  client.registerTool({ declaration, handler, componentId });

  return {
    destroy() {
      client.unregisterTool(options.name);
    },
  };
}
```

**`src/actions/useAgentContext.ts` :**

```ts
import { get } from 'svelte/store';
import { domosClient } from '../stores/domos.store.js';

/**
 * Action Svelte pour injecter du contexte.
 *
 * @example
 * ```svelte
 * <div use:agentContext={{ userId: user.id, page: 'profile' }}>
 *   ...
 * </div>
 * ```
 */
export function agentContext(node: HTMLElement, data: Record<string, unknown>) {
  const client = get(domosClient);
  client?.updateContext(data);

  return {
    update(newData: Record<string, unknown>) {
      client?.updateContext(newData);
    },
  };
}
```

**`src/composables/createVoiceMode.ts` :**

```ts
import { writable } from 'svelte/store';
import { sendAudio } from '../stores/domos.store.js';

export function createVoiceMode(sampleRate = 16000) {
  const isRecording = writable(false);
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    mediaStream = stream;
    audioContext = new AudioContext({ sampleRate });
    const source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const pcm = event.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      sendAudio(btoa(binary), `audio/pcm;rate=${sampleRate}`);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    isRecording.set(true);
  }

  function stopRecording() {
    processor?.disconnect();
    audioContext?.close();
    mediaStream?.getTracks().forEach((t) => t.stop());
    processor = null;
    audioContext = null;
    mediaStream = null;
    isRecording.set(false);
  }

  return { isRecording, startRecording, stopRecording };
}
```

**`src/components/agentic-ui.Indicator.svelte` :**

```svelte
<script lang="ts">
  import { agentState, isThinking, isSpeaking } from '../stores/domos.store.js';

  const labels: Record<string, string> = {
    disconnected: 'Deconnecte',
    connecting: 'Connexion...',
    connected: 'En ligne',
    listening: 'Ecoute',
    thinking: 'Reflexion...',
    speaking: 'Parle...',
    error: 'Erreur',
  };

  const colors: Record<string, string> = {
    disconnected: '#9ca3af',
    connecting: '#f59e0b',
    connected: '#22c55e',
    listening: '#3b82f6',
    thinking: '#f59e0b',
    speaking: '#8b5cf6',
    error: '#ef4444',
  };
</script>

<div class="domos-indicator">
  <span
    class="dot"
    class:pulse={$isThinking || $isSpeaking}
    style="background: {colors[$agentState] || '#9ca3af'}"
  />
  <span class="label">{labels[$agentState] || $agentState}</span>
</div>

<style>
  .domos-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 9999px;
    background: #f3f4f6;
    font-size: 12px;
    font-family: system-ui, sans-serif;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .pulse {
    animation: domos-pulse 1.5s infinite;
  }
  .label {
    color: #374151;
  }
  @keyframes domos-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
```

**`src/components/hitl.ApprovalModal.svelte` :**

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let toolName: string;
  export let message: string;
  export let risk: 'high' | 'critical' = 'high';
  export let args: Record<string, unknown> = {};

  const dispatch = createEventDispatcher<{ approve: void; deny: void }>();
  const riskLabel = risk === 'critical' ? 'CRITIQUE' : 'IMPORTANT';
  const riskColor = risk === 'critical' ? '#dc2626' : '#f59e0b';
</script>

<div class="overlay">
  <div class="modal">
    <div class="header" style="border-color: {riskColor}">
      <span class="badge" style="background: {riskColor}">{riskLabel}</span>
      <h3>Approbation requise</h3>
    </div>
    <div class="body">
      <p>{message}</p>
      {#if Object.keys(args).length > 0}
        <div class="args">
          <p class="args-label">Parametres :</p>
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </div>
      {/if}
    </div>
    <div class="actions">
      <button class="btn-deny" on:click={() => dispatch('deny')}>Refuser</button>
      <button class="btn-approve" on:click={() => dispatch('approve')}>Approuver</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: system-ui, sans-serif;
  }
  .modal {
    background: white; border-radius: 12px;
    width: 420px; max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;
  }
  .header {
    padding: 16px 20px; border-bottom: 3px solid;
    display: flex; align-items: center; gap: 10px;
  }
  .badge {
    color: white; font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 4px;
  }
  h3 { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
  .body { padding: 20px; }
  .body p { color: #374151; font-size: 14px; margin: 0; }
  .args { margin-top: 12px; }
  .args-label { font-size: 12px; color: #6b7280; margin: 0 0 4px; }
  pre {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 8px 12px; font-size: 12px; overflow-x: auto; margin: 0;
  }
  .actions {
    padding: 12px 20px; background: #f9fafb;
    display: flex; justify-content: flex-end; gap: 8px;
  }
  .btn-deny, .btn-approve {
    padding: 8px 20px; border-radius: 8px;
    font-size: 14px; font-weight: 500; cursor: pointer; border: none;
  }
  .btn-deny { background: #e5e7eb; color: #374151; }
  .btn-deny:hover { background: #d1d5db; }
  .btn-approve { background: #0070c7; color: white; }
  .btn-approve:hover { background: #0059a1; }
</style>
```

**`src/index.ts` :**

```ts
// ============================================================
// @domos/svelte - DomOS Svelte SDK
// Stores, Actions, Composants pour UI Agentique
// ============================================================

// --- Stores ---
export {
  domosClient,
  agentState,
  sessionId,
  lastResponse,
  isConnected,
  isThinking,
  isSpeaking,
  initDomOS,
  sendText,
  sendAudio,
} from './stores/domos.store.js';

// --- Actions ---
export { agentTool } from './actions/useAgentTool.js';
export { agentContext } from './actions/useAgentContext.js';

// --- Composables ---
export { createVoiceMode } from './composables/createVoiceMode.js';

// --- Components ---
export { default as AgentIndicator } from './components/agentic-ui.Indicator.svelte';
export { default as ApprovalModal } from './components/hitl.ApprovalModal.svelte';
```

**Usage Svelte :**

```svelte
<!-- +layout.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { initDomOS } from '@domos/svelte';

  let cleanup;
  onMount(() => {
    cleanup = initDomOS({
      endpoint: 'ws://localhost:3000/domos',
      apiKey: 'pk_demo_local',
      debug: true,
    });
  });
  onDestroy(() => cleanup?.());
</script>

<slot />
```

```svelte
<!-- ProductCard.svelte -->
<script>
  import { agentTool } from '@domos/svelte';
  import { z } from 'zod';

  export let product;

  const toolOptions = {
    name: `add_to_cart_${product.id}`,
    description: `Ajouter "${product.name}" au panier (${product.price} EUR)`,
    schema: z.object({ quantity: z.number().min(1).max(10) }),
    risk: 'low',
    handler: async ({ quantity }) => {
      cart.add(product, quantity);
      return `${quantity}x ${product.name} ajoute`;
    },
  };
</script>

<div use:agentTool={toolOptions}>
  <h3>{product.name}</h3>
  <p>{product.price} EUR</p>
</div>
```

---

### SPRINT 6 — Adaptateurs LLM supplementaires

**`@domos/adapter-openai`** — OpenAI GPT-4o / GPT-4o-mini

```
packages/adapter-openai/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── OpenAIAdapter.ts          # BaseLLMAdapter + openai SDK
    └── toolConverter.ts          # DomOS tools → OpenAI function format
```

```json
{
  "name": "@domos/adapter-openai",
  "version": "0.1.0",
  "dependencies": {
    "@domos/core": "workspace:*",
    "@domos/server": "workspace:*",
    "openai": "^4.73.0"
  }
}
```

**`@domos/adapter-anthropic`** — Claude Sonnet / Opus

```
packages/adapter-anthropic/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── AnthropicAdapter.ts       # BaseLLMAdapter + @anthropic-ai/sdk
    └── toolConverter.ts          # DomOS tools → Anthropic tool_use format
```

```json
{
  "name": "@domos/adapter-anthropic",
  "version": "0.1.0",
  "dependencies": {
    "@domos/core": "workspace:*",
    "@domos/server": "workspace:*",
    "@anthropic-ai/sdk": "^0.34.0"
  }
}
```

Le code de reference pour ces deux adaptateurs est dans `docs/CUSTOM_ADAPTER.md`.

---

### SPRINT 7 — Mode Live Audio (Gemini Live) + System Prompts

#### Pourquoi Gemini Live n'est PAS supporte actuellement dans DomOS

Le `GoogleAdapter` actuel utilise **`generateContent()`** — l'API texte classique de Gemini.
C'est un mode **requete/reponse** : le client envoie un message, le serveur appelle Gemini, attend la reponse complete, et la renvoie.

```
Mode actuel (GoogleAdapter) :
Client → "Bonjour" → Serveur → generateContent() → Gemini → reponse texte → Client
                              (requete HTTP classique, pas de streaming)
```

**Le projet VoiceAgent X existant** utilise un mode completement different : **`ai.live.connect()`** — une **session WebSocket persistante** avec Gemini qui permet :

1. **Audio natif bidirectionnel** — le client envoie du PCM 16kHz, Gemini repond en audio natif (pas de STT/TTS externe)
2. **Streaming continu** — pas de requete/reponse, c'est un flux continu
3. **Function calling en temps reel** — Gemini peut appeler des tools pendant qu'il parle
4. **Transcription automatique** — input et output audio sont transcrits en texte

```
Mode Live (ce qu'on veut) :
Client ←──── WebSocket bidirectionnel ────→ Serveur ←──── ai.live.connect() ────→ Gemini Live
        audio PCM in/out                            audio PCM in/out
        tool calls/results                          function calls/responses
        transcriptions                              transcriptions
```

#### Ce qui est different architecturalement

| Aspect | Mode actuel (`GoogleAdapter`) | Mode Live (`GoogleLiveAdapter`) |
|---|---|---|
| **API Gemini** | `generateContent()` (HTTP) | `ai.live.connect()` (WebSocket persistant) |
| **Modele** | `gemini-2.0-flash` | `gemini-2.5-flash-native-audio-preview` |
| **Input** | Texte uniquement | Audio PCM + Texte |
| **Output** | Texte uniquement | Audio natif + Texte (transcription) |
| **Session** | Sans etat (stateless) | Session persistante (stateful) |
| **Interface** | `LLMAdapter.chat()` | **Nouvelle interface** `LiveAdapter` avec callbacks |
| **Tool calling** | Synchrone (call → result → reponse) | Asynchrone (call pendant le stream audio) |
| **Conversation** | Geree par `ConversationBuffer` | Geree par Gemini Live (memoire interne) |

**Le probleme fondamental :** L'interface `LLMAdapter` actuelle est synchrone (`chat() → Promise<LLMResponse>`). Gemini Live est **asynchrone et event-driven** (callbacks `onmessage`, `ontoolcall`). Il faut une nouvelle interface.

#### Ce qui existe deja dans VoiceAgent X (a porter)

**Fichier de reference : `server/websocket/liveProxy.js`**

```js
// Connexion a Gemini Live — la partie cruciale
geminiSession = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: ['AUDIO'],
    inputAudioTranscription: { model: 'google-default' },
    outputAudioTranscription: { model: 'google-default' },
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }
    },
    systemInstruction: SYSTEM_PROMPTS.SHOPPING_AGENT('fr'),
    tools: [{ functionDeclarations: SHOPPING_TOOLS }]
  },
  callbacks: {
    onopen: () => { /* session ouverte */ },
    onmessage: (msg) => {
      // Audio ou texte de Gemini → renvoyer au client
      if (msg.serverContent) ws.send(JSON.stringify({ type: 'serverContent', content: msg.serverContent }));
      // Gemini veut appeler un tool
      if (msg.toolCall) ws.send(JSON.stringify({ type: 'toolCall', toolCall: msg.toolCall }));
    },
    onclose: () => { /* session fermee */ },
    onerror: (err) => { /* erreur */ }
  }
});
```

**Envoi audio du client → Gemini :**
```js
// Binary = audio PCM du micro
await geminiSession.sendRealtimeInput({
  media: { mimeType: 'audio/pcm;rate=16000', data: base64Audio }
});
```

**Envoi texte du client → Gemini :**
```js
await geminiSession.sendRealtimeInput({
  content: [{ role: 'user', parts: [{ text: parsed.text }] }]
});
```

**Reponse tool du client → Gemini :**
```js
await geminiSession.sendToolResponse({
  functionResponses: parsed.functionResponses
});
```

#### System Prompt manquant dans DomOS

Le `apps/demo-server/` a un system prompt basique. Voici le system prompt complet a utiliser, inspire de VoiceAgent X :

```ts
// A ajouter dans apps/demo-server/src/server.ts ou dans un fichier dedie

export const DOMOS_SYSTEM_PROMPT = (lang: string = 'fr') => `
Tu es l'Assistant Intelligent de la boutique DomOS.
Date : ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}

CAPACITES :
Tu as le controle de l'interface utilisateur via des outils (tools).
Les outils disponibles changent selon la page ou se trouve l'utilisateur.
Tu recois un CONTEXTE qui t'indique la page actuelle, les produits visibles, le panier, etc.

REGLES DE CONVERSATION :
1. Sois proactif mais concis (max 2-3 phrases).
2. Quand tu utilises un outil, confirme l'action a l'utilisateur.
3. Si l'utilisateur demande quelque chose et que tu as le tool pour le faire, utilise-le directement.
4. Ne propose pas d'actions pour lesquelles tu n'as pas de tool disponible.
5. Reponds dans la langue de l'utilisateur.

REGLES DE SECURITE :
- Les actions a risque (clear_cart, confirm_order) declenchent une demande d'approbation.
- Ne tente pas de contourner la securite HITL.
- Si l'utilisateur refuse une action, accepte sans insister.

CONTEXTE DYNAMIQUE :
Le systeme t'envoie automatiquement :
- La page actuelle (URL)
- Les outils disponibles sur cette page
- Les donnees contextuelles (produits, panier, utilisateur)
Utilise ces informations pour etre pertinent.
`;
```

#### Plan d'implementation SPRINT 7

**Etape 1 — Nouvelle interface `LiveAdapter`**

```
packages/server/src/llm/types.ts
```

```ts
// Ajouter a cote de LLMAdapter :

/**
 * Interface pour les adaptateurs LLM en mode streaming/live.
 * Contrairement a LLMAdapter (requete/reponse), LiveAdapter est event-driven.
 */
export interface LiveAdapter {
  readonly name: string;

  /** Creer une session live */
  createSession(config: LiveSessionConfig): Promise<LiveSession>;
}

export interface LiveSessionConfig {
  systemPrompt: string;
  tools: ToolDeclaration[];
  voice?: string;
  language?: string;
  onAudioOutput?: (audioBase64: string) => void;
  onTextOutput?: (text: string, done: boolean) => void;
  onToolCall?: (toolCall: LLMToolCall) => void;
  onTranscript?: (role: 'user' | 'agent', text: string) => void;
  onError?: (error: Error) => void;
}

export interface LiveSession {
  /** Envoyer de l'audio PCM (base64) */
  sendAudio(audioBase64: string, mimeType?: string): Promise<void>;

  /** Envoyer du texte */
  sendText(text: string): Promise<void>;

  /** Envoyer le resultat d'un tool */
  sendToolResponse(callId: string, result: unknown): Promise<void>;

  /** Fermer la session */
  close(): void;

  /** La session est-elle active ? */
  readonly isActive: boolean;
}
```

**Etape 2 — `GoogleLiveAdapter`**

```
packages/adapter-google/src/GoogleLiveAdapter.ts
```

```ts
import { GoogleGenAI } from '@google/genai';
import type { LiveAdapter, LiveSession, LiveSessionConfig } from '@domos/server';
import { toGeminiFunctionDeclarations } from './toolConverter.js';

export interface GoogleLiveOptions {
  apiKey: string;
  model?: string;  // defaut: 'gemini-2.5-flash-native-audio-preview'
  voice?: string;   // defaut: 'Fenrir'
}

export class GoogleLiveAdapter implements LiveAdapter {
  readonly name = 'google-gemini-live';
  private client: GoogleGenAI;
  private model: string;
  private defaultVoice: string;

  constructor(options: GoogleLiveOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.model = options.model || 'gemini-2.5-flash-native-audio-preview';
    this.defaultVoice = options.voice || 'Fenrir';
  }

  async createSession(config: LiveSessionConfig): Promise<LiveSession> {
    const tools = config.tools.length > 0
      ? [{ functionDeclarations: toGeminiFunctionDeclarations(config.tools) }]
      : undefined;

    const geminiSession = await this.client.live.connect({
      model: this.model,
      config: {
        responseModalities: ['AUDIO'],
        inputAudioTranscription: { model: 'google-default' },
        outputAudioTranscription: { model: 'google-default' },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.voice || this.defaultVoice }
          }
        },
        systemInstruction: config.systemPrompt,
        tools,
      },
      callbacks: {
        onopen: () => { /* ready */ },
        onmessage: (msg) => {
          // Audio output de Gemini
          if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData) {
                config.onAudioOutput?.(part.inlineData.data);
              }
              if (part.text) {
                config.onTextOutput?.(part.text, false);
              }
            }
          }

          // Transcriptions
          if (msg.serverContent?.inputTranscription?.text) {
            config.onTranscript?.('user', msg.serverContent.inputTranscription.text);
          }
          if (msg.serverContent?.outputTranscription?.text) {
            config.onTranscript?.('agent', msg.serverContent.outputTranscription.text);
          }

          // Turn complete
          if (msg.serverContent?.turnComplete) {
            config.onTextOutput?.('', true);
          }

          // Tool calls
          if (msg.toolCall) {
            for (const fc of msg.toolCall.functionCalls || []) {
              config.onToolCall?.({
                callId: fc.id || fc.name,
                name: fc.name,
                args: fc.args || {},
              });
            }
          }
        },
        onerror: (err) => config.onError?.(new Error(String(err))),
        onclose: () => { /* cleanup */ },
      },
    });

    // Retourner un objet LiveSession
    return {
      async sendAudio(audioBase64: string, mimeType = 'audio/pcm;rate=16000') {
        await geminiSession.sendRealtimeInput({
          media: { mimeType, data: audioBase64 },
        });
      },

      async sendText(text: string) {
        await geminiSession.sendRealtimeInput({
          content: [{ role: 'user', parts: [{ text }] }],
        });
      },

      async sendToolResponse(callId: string, result: unknown) {
        await geminiSession.sendToolResponse({
          functionResponses: [{
            id: callId,
            name: callId,
            response: result,
          }],
        });
      },

      close() {
        geminiSession.close();
      },

      get isActive() {
        return true; // TODO: tracker l'etat
      },
    };
  }
}
```

**Etape 3 — Modifier DomOSServer pour supporter le mode Live**

Le `DomOSServer` doit :
1. Detecter si l'adapter est un `LLMAdapter` (texte) ou `LiveAdapter` (live audio)
2. En mode Live : creer une `LiveSession` par connexion client
3. Router l'audio bidirectionnel : Client ↔ DomOSServer ↔ Gemini Live
4. Router les tool calls : Gemini → DomOSServer → Client → result → DomOSServer → Gemini

```ts
// Dans DomOSServerOptions, ajouter :
export interface DomOSServerOptions {
  llm: LLMAdapter;
  live?: LiveAdapter;        // ← NOUVEAU : adaptateur live optionnel
  // ... reste identique
}
```

```ts
// Dans DomOSServer, ajouter le mode live :
private async handleUserInput(session, payload) {
  if (payload.modality === 'audio' && this.liveAdapter) {
    // Mode Live — creer ou reutiliser la session live
    if (!session.liveSession) {
      session.liveSession = await this.liveAdapter.createSession({
        systemPrompt: this.llm.systemPrompt,
        tools: session.toolRegistry.getDeclarations(),
        onAudioOutput: (audio) => {
          // Envoyer l'audio au client via un nouveau message AUDIO_STREAM
          this.transport.send(session.connId, Messages.audioStream(audio));
        },
        onToolCall: (toolCall) => {
          // Meme flow que le mode texte
          this.transport.send(session.connId, Messages.toolCall(toolCall));
        },
        onTranscript: (role, text) => {
          // Optionnel : envoyer les transcriptions
          if (role === 'agent') {
            this.transport.send(session.connId, Messages.agentResponse(text, true));
          }
        },
      });
    }

    // Envoyer l'audio a Gemini Live
    await session.liveSession.sendAudio(payload.content, payload.mimeType);
  } else {
    // Mode texte classique (existant)
    // ... code actuel inchange
  }
}
```

**Etape 4 — Nouveau message ADTP : `AUDIO_STREAM`**

```ts
// Dans adtp.types.ts, ajouter :
export enum MessageType {
  // ... existants
  AUDIO_STREAM = 'AUDIO_STREAM',  // Serveur → Client (reponse audio de l'agent)
}

export interface AudioStreamPayload {
  /** Audio PCM en base64 */
  data: string;
  /** MIME type (ex: 'audio/pcm;rate=24000') */
  mimeType: string;
}
```

```ts
// Dans adtp.serializer.ts, ajouter dans Messages :
audioStream(audioBase64: string, mimeType = 'audio/pcm;rate=24000'): ADTPMessage {
  return createMessage(MessageType.AUDIO_STREAM, { data: audioBase64, mimeType });
}
```

**Etape 5 — Client : jouer l'audio recu**

```ts
// Dans DomOSClient, ajouter le handler AUDIO_STREAM :
case MessageType.AUDIO_STREAM: {
  const payload = message.payload as AudioStreamPayload;
  this.handlers.onAudioOutput?.(payload.data, payload.mimeType);
  break;
}
```

```ts
// Dans ClientEventHandlers, ajouter :
onAudioOutput?: (audioBase64: string, mimeType: string) => void;
```

Les SDKs React/Vue/Svelte devront ensuite jouer cet audio via l'API Web Audio.

#### Diagramme du mode Live complet

```
┌──────────────────────────────────────────────────────────────────┐
│                        Navigateur                                 │
│                                                                   │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────┐  │
│  │ useAgentTool │     │ useVoiceMode │     │   AudioPlayer    │  │
│  │ (tools)      │     │ (micro PCM)  │     │ (haut-parleur)   │  │
│  └──────┬───────┘     └──────┬───────┘     └────────▲─────────┘  │
│         │                    │                       │            │
│  ┌──────┴────────────────────┴───────────────────────┴──────────┐│
│  │                    DomOSClient                                ││
│  │                                                               ││
│  │  CONTEXT_UPDATE ──→  tools sync                               ││
│  │  USER_INPUT (audio) ──→  PCM base64 micro                    ││
│  │  TOOL_RESULT ──→  resultat tool                               ││
│  │  ←── AUDIO_STREAM  ──  audio reponse agent                   ││
│  │  ←── TOOL_CALL      ──  demande d'execution                  ││
│  │  ←── AGENT_RESPONSE ──  transcription texte                  ││
│  └──────────────────────────┬────────────────────────────────────┘│
│                             │ WebSocket ADTP                      │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
┌─────────────────────────────┼─────────────────────────────────────┐
│                      DomOSServer                                   │
│                             │                                      │
│  ┌──────────────────────────┴────────────────────────────────┐    │
│  │              ADTPTransport (WebSocket)                      │    │
│  │  audio PCM (binary) + JSON messages                        │    │
│  └──────────────────────────┬────────────────────────────────┘    │
│                             │                                      │
│  ┌──────────────────────────┴────────────────────────────────┐    │
│  │              SessionManager                                │    │
│  │                                                            │    │
│  │  if (audio && liveAdapter) → mode LIVE                     │    │
│  │  if (text)                 → mode TEXTE (existant)         │    │
│  └──────────────────────────┬────────────────────────────────┘    │
│                             │                                      │
│  ┌──────────────────────────┴────────────────────────────────┐    │
│  │        GoogleLiveAdapter.createSession()                   │    │
│  │                                                            │    │
│  │  ┌─── ai.live.connect() ────────────────┐                 │    │
│  │  │                                       │                 │    │
│  │  │  sendRealtimeInput({ media: PCM })    │  ← audio in    │    │
│  │  │  sendRealtimeInput({ text })          │  ← texte in    │    │
│  │  │  sendToolResponse({ results })        │  ← tool result │    │
│  │  │                                       │                 │    │
│  │  │  onmessage → serverContent.audio      │  → audio out   │    │
│  │  │  onmessage → toolCall                 │  → tool call   │    │
│  │  │  onmessage → transcription            │  → texte       │    │
│  │  │                                       │                 │    │
│  │  └──── WebSocket Gemini Live ────────────┘                 │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  Modele : gemini-2.5-flash-native-audio-preview                   │
│  Voix  : Fenrir (ou configurable)                                 │
│  Audio : PCM 16kHz in / PCM 24kHz out                             │
│  Tools : function calling natif pendant le stream                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

#### Reference : Code VoiceAgent X existant

Les fichiers de reference dans l'ancien projet :

| Fichier | Contenu | Ce qu'il faut porter |
|---|---|---|
| `server/websocket/liveProxy.js` | Proxy WebSocket ↔ Gemini Live | Logique `ai.live.connect()`, callbacks, audio routing |
| `server/services/geminiClient.js` | Singleton `GoogleGenAI` | Deja fait dans `GoogleAdapter` |
| `server/services/promptRegistry.js` | System prompts (SHOPPING_AGENT, CEO_AGENT) | Porter dans DomOS comme config |
| `server/services/toolDefinitions.js` | 7 tools backend (navigate, search, add_to_cart...) | Deja fait en partie dans la demo |
| `services/agentTools.ts` | 14 tools frontend (navigation UI, cart, checkout) | Modele pour `useAgentTool` |
| `server/services/monitorService.js` | Monitoring (connexions, duree audio) | Sprint 9 (Dashboard) |
| `server/services/usageStore.js` | Usage billing (audio duration, tokens) | Sprint 9 |

#### Protocole audio VoiceAgent X (a reproduire)

```
Client → Serveur :
  - Binary frame (Buffer) → audio PCM 16kHz du micro
  - JSON { type: 'text', text: '...' } → message texte
  - JSON { type: 'toolResponse', functionResponses: [...] } → resultat tool

Serveur → Client :
  - JSON { type: 'serverContent', content: { ... } } → audio + texte Gemini
  - JSON { type: 'toolCall', toolCall: { ... } } → demande d'execution tool
  - JSON { type: 'status', status: 'connected' } → status
  - JSON { type: 'error', message: '...' } → erreur
```

Dans DomOS, tout ca passe par le protocole ADTP (pas de protocol custom).

---

### SPRINT 7C — STT/TTS Fallback (MANQUANT - Critique)

## **📋 Gap Analysis : STT/TTS pour modèles non-Live**

### **✅ Ce qui existe**
- **Mode Live** : Gemini Live (`ai.live.connect()`) + OpenAI Realtime → Audio natif ✅
- **Mode Texte** : Claude, GPT-4 standard → Texte seulement ✅

### **❌ Ce qui MANQUE**
Pour les modèles **sans support audio natif** (Claude, GPT-4 standard, LLaMA, etc.), il manque :

1. **Service STT** (Speech-to-Text)
   - Convertir l'audio client → texte pour envoyer au LLM
   - Options : Whisper OpenAI, Google Speech-to-Text, Azure Speech

2. **Service TTS** (Text-to-Speech)  
   - Convertir la réponse texte du LLM → audio pour renvoyer au client
   - Options : OpenAI TTS, ElevenLabs, Google TTS, Azure TTS

3. **Pipeline hybride dans DomOSServer**
   ```
   Client Audio → STT → LLM (texte) → TTS → Client Audio
   ```

### **📐 Architecture manquante**

```typescript
// Ce qui devrait exister :
packages/server/src/
├── speech/
│   ├── types.ts              // Interfaces STT/TTS
│   ├── STTService.ts         // Interface commune STT
│   ├── TTSService.ts         // Interface commune TTS
│   ├── providers/
│   │   ├── WhisperSTT.ts     // OpenAI Whisper
│   │   ├── GoogleSTT.ts      // Google Speech-to-Text
│   │   ├── OpenAITTS.ts      // OpenAI TTS
│   │   ├── ElevenLabsTTS.ts  // ElevenLabs
│   │   └── GoogleTTS.ts      // Google TTS
```

### **🔧 Solution proposée**

**Fichiers a creer :**

```
packages/server/
└── src/
    └── speech/
        ├── types.ts
        ├── STTService.ts
        ├── TTSService.ts
        └── providers/
            ├── WhisperSTT.ts
            ├── OpenAITTS.ts
            ├── GoogleSTT.ts
            ├── GoogleTTS.ts
            └── ElevenLabsTTS.ts
```

**`speech/types.ts` :**

```ts
export interface STTService {
  readonly name: string;
  transcribe(audioBase64: string, mimeType: string): Promise<string>;
}

export interface TTSService {
  readonly name: string;
  synthesize(text: string, voice?: string): Promise<{ audioBase64: string; mimeType: string }>;
}
```

**`speech/STTService.ts` :**

```ts
export abstract class BaseSTTService implements STTService {
  abstract readonly name: string;
  abstract transcribe(audioBase64: string, mimeType: string): Promise<string>;
}
```

**`speech/TTSService.ts` :**

```ts
export abstract class BaseTTSService implements TTSService {
  abstract readonly name: string;
  abstract synthesize(text: string, voice?: string): Promise<{ audioBase64: string; mimeType: string }>;
}
```

**`speech/providers/WhisperSTT.ts` :**

```ts
import OpenAI from 'openai';
import { BaseSTTService } from '../STTService.js';

export class WhisperSTT extends BaseSTTService {
  readonly name = 'openai-whisper';
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioBase64: string, mimeType: string): Promise<string> {
    // Convertir base64 → Buffer
    const buffer = Buffer.from(audioBase64, 'base64');
    const file = new File([buffer], 'audio.wav', { type: mimeType });
    
    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    
    return transcription.text;
  }
}
```

**`speech/providers/OpenAITTS.ts` :**

```ts
import OpenAI from 'openai';
import { BaseTTSService } from '../TTSService.js';

export class OpenAITTS extends BaseTTSService {
  readonly name = 'openai-tts';
  private client: OpenAI;
  private defaultVoice: string;

  constructor(apiKey: string, voice = 'alloy') {
    super();
    this.client = new OpenAI({ apiKey });
    this.defaultVoice = voice;
  }

  async synthesize(text: string, voice?: string): Promise<{ audioBase64: string; mimeType: string }> {
    const mp3 = await this.client.audio.speech.create({
      model: 'tts-1',
      voice: (voice || this.defaultVoice) as any,
      input: text,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return {
      audioBase64: buffer.toString('base64'),
      mimeType: 'audio/mpeg',
    };
  }
}
```

**Modifier DomOSServer pour supporter STT/TTS :**

```ts
// Dans DomOSServerOptions :
export interface DomOSServerOptions {
  llm: LLMAdapter;
  live?: LiveAdapter;
  stt?: STTService;    // ← NOUVEAU
  tts?: TTSService;    // ← NOUVEAU
  // ... reste
}

// Dans handleUserInput() :
private async handleUserInput(session, payload) {
  if (payload.modality === 'audio') {
    if (this.liveAdapter) {
      // Mode Live (audio natif)
      await session.liveSession.sendAudio(payload.content, payload.mimeType);
    } else if (this.stt && this.tts) {
      // Mode hybride : STT → LLM texte → TTS
      const text = await this.stt.transcribe(payload.content, payload.mimeType);
      
      // Envoyer texte au LLM classique
      const response = await this.processTextInput(session, text);
      
      // Convertir reponse en audio
      const audio = await this.tts.synthesize(response);
      
      // Envoyer audio au client
      this.transport.send(session.connId, Messages.audioStream(audio.audioBase64, audio.mimeType));
    } else {
      throw new Error('Audio input requires either LiveAdapter or STT/TTS services');
    }
  } else {
    // Mode texte classique
    await this.processTextInput(session, payload.content);
  }
}
```

**Usage dans `apps/demo-server/` :**

```ts
import { WhisperSTT, OpenAITTS } from '@domos/server';

const server = new DomOSServer({
  llm: new AnthropicAdapter({
    model: 'claude-3-5-sonnet',
    apiKey: ANTHROPIC_API_KEY,
  }),
  stt: new WhisperSTT(OPENAI_API_KEY),
  tts: new OpenAITTS(OPENAI_API_KEY, 'nova'),
});
```

### **Diagramme : 3 modes audio possibles**

```
┌─────────────────────────────────────────────────────────────────┐
│ MODE 1 : Live Audio (Gemini Live, GPT-4o Realtime)             │
│                                                                 │
│ Client Audio → LiveAdapter → Gemini/OpenAI Live → Audio natif  │
│ (pas de STT/TTS, tout est géré par le modèle)                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MODE 2 : Hybride STT/TTS (Claude, GPT-4 standard, LLaMA)       │
│                                                                 │
│ Client Audio → STT (Whisper) → LLM texte → TTS (OpenAI TTS)    │
│              → Audio Client                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MODE 3 : Texte pur (pas d'audio)                               │
│                                                                 │
│ Client Texte → LLM texte → Texte Client                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### SPRINT 7B — System Prompts Manquants

Le `apps/demo-server/` a un prompt basique inline. Il manque :

1. **Un registre de prompts** comme dans VoiceAgent X (`promptRegistry.js`)
2. **Le prompt ne recoit pas le Shadow Context** correctement
3. **Pas de prompt pour le mode Live** (voix, ton, brevete)

**Fichiers a creer :**

```
packages/server/src/prompts/
├── types.ts                    # Interface PromptTemplate
├── promptRegistry.ts           # Registre de prompts par nom
└── defaultPrompts.ts           # Prompts par defaut DomOS
```

**`defaultPrompts.ts` :**

```ts
export const DEFAULT_PROMPTS = {
  /**
   * Prompt texte generique (mode chat).
   */
  TEXT_AGENT: (lang = 'fr') => `
Tu es un assistant intelligent integre dans une application web via DomOS.
Date : ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}

CAPACITES :
- Tu as acces a des outils (tools) qui te permettent d'agir sur l'interface.
- Les outils changent selon la page ou se trouve l'utilisateur.
- Tu recois un CONTEXTE avec la page, les donnees et le panier.

REGLES :
1. Sois concis (max 2-3 phrases).
2. Quand tu utilises un outil, confirme l'action.
3. N'invente pas de donnees. Utilise les outils pour obtenir l'info.
4. Si un outil n'est pas disponible, dis-le.
5. Reponds dans la langue de l'utilisateur.

SECURITE HITL :
- Les actions a risque declenchent une demande d'approbation.
- Si l'utilisateur refuse, accepte sans insister.
  `,

  /**
   * Prompt audio/live (mode vocal).
   * Plus court et conversationnel pour la voix.
   */
  LIVE_AGENT: (lang = 'fr') => `
Tu es un assistant vocal integre dans une application web.
Date : ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}

REGLES VOCALES :
1. Reponds en MAX 1-2 phrases courtes (c'est de la voix, pas du texte).
2. Sois naturel et conversationnel.
3. Utilise les outils quand necessaire, confirme brievement.
4. Pas de listes, pas de markdown, pas de formatage.
5. Si tu navigues, dis "Je vous emmene sur la page..." AVANT d'appeler l'outil.

OUTILS :
Tu as acces aux outils affiches sur la page actuelle.
Utilise-les directement quand le client le demande.
  `,

  /**
   * Prompt e-commerce (demo).
   */
  SHOPPING_AGENT: (lang = 'fr') => `
Tu es l'Assistant Shopping de la boutique.
Date : ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}

CAPACITES DE NAVIGATION :
Tu as le pouvoir de controler le navigateur de l'utilisateur.
- Si l'utilisateur veut voir un produit, utilise l'outil navigate ou search.
- Si l'utilisateur change de page, ta memoire persiste.

REGLES :
1. Sois proactif mais concis (max 2 phrases).
2. Quand tu navigues, dis "Je vous emmene sur la page..." AVANT.
3. Utilise les outils pour chercher, filtrer, ajouter au panier.
4. Confirme chaque action.
5. Les actions de paiement et suppression necessitent l'approbation.
  `,
};
```

**Usage dans `apps/demo-server/` :**

```ts
import { DEFAULT_PROMPTS } from '@domos/server';

const server = new DomOSServer({
  llm: new GoogleAdapter({
    model: 'gemini-2.0-flash',
    apiKey: GOOGLE_API_KEY,
    systemPrompt: DEFAULT_PROMPTS.SHOPPING_AGENT('fr'),
  }),
  // Mode live optionnel
  live: new GoogleLiveAdapter({
    apiKey: GOOGLE_API_KEY,
    voice: 'Fenrir',
    systemPrompt: DEFAULT_PROMPTS.LIVE_AGENT('fr'),
  }),
});
```

---

### SPRINT 8 — Persistance & Production

**MongoDB pour les sessions :**

```
packages/server/
└── src/
    ├── persistence/
    │   ├── types.ts               # Interface SessionStore
    │   ├── MemoryStore.ts         # Defaut actuel (en memoire)
    │   └── MongoStore.ts          # MongoDB adapter
    └── core/
        └── SessionManager.ts      # Modifier pour utiliser SessionStore
```

**Redis pour le rate limiting :**

```
packages/server/
└── src/
    └── middleware/
        └── rateLimit.ts           # Ajouter RedisRateLimiter en option
```

**Variables d'environnement production :**

```env
DOMOS_SESSION_STORE=mongodb        # memory | mongodb | redis
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
```

---

### SPRINT 9 — Dashboard Admin

Dashboard web pour monitorer les sessions, tools et metrics en temps reel.

```
apps/dashboard/
├── package.json                   # Vite + React + Tailwind + Recharts
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   ├── SessionsPage.tsx       # Liste des sessions actives
│   │   ├── SessionDetailPage.tsx  # Detail : conversation + tools + graph
│   │   ├── ToolsPage.tsx          # Registry global : tous les tools enregistres
│   │   └── MetricsPage.tsx        # Graphiques : latence, tokens, erreurs
│   └── components/
│       ├── SessionCard.tsx
│       ├── ToolCallTimeline.tsx
│       └── MetricsChart.tsx

packages/server/
└── src/
    └── admin/
        ├── AdminAPI.ts            # API REST pour le dashboard
        └── adminRoutes.ts         # GET /admin/sessions, /admin/tools, /admin/metrics
```

---

### SPRINT 10 — Tests E2E & CI/CD & Publish npm

**Tests E2E :**

```
tests/
├── e2e/
│   ├── playwright.config.ts
│   ├── chat.spec.ts               # Test chat texte
│   ├── tools.spec.ts              # Test useAgentTool + execution
│   ├── hitl.spec.ts               # Test approbation modal
│   ├── navigation.spec.ts         # Test tools ephemeres (mount/unmount)
│   └── voice.spec.ts              # Test mode vocal
└── integration/
    ├── server-client.test.ts      # Test DomOSServer + DomOSClient ensemble
    └── tool-sync.test.ts          # Test sync tools client → serveur
```

**CI/CD (GitHub Actions) :**

```
.github/
└── workflows/
    ├── ci.yml                     # pnpm install → build → test → lint
    ├── release.yml                # Changesets → version → publish npm
    └── e2e.yml                    # Playwright tests
```

**Publish npm (Changesets) :**

```bash
pnpm add -Dw @changesets/cli @changesets/changelog-github
pnpm changeset init
```

```
.changeset/
└── config.json
```

---

### SPRINT 11 — `pnpm install` + Build + Fix

Avant toute chose, le projet doit compiler. Ce sprint consiste a :

1. `pnpm install` a la racine du monorepo
2. `pnpm build` — corriger les erreurs TypeScript
3. `pnpm test` — verifier les 52 tests
4. Corriger les imports casses si necessaire
5. Verifier que la demo tourne (`demo-server` + `demo`)

---

## Checklist Globale

Donnez le code du sprint pour que je l'implemente.

### Framework Core

- [x] `SPRINT-1` — `@domos/core` (protocole ADTP, ToolRegistry, Shadow Context, HITL, utils, 31 tests)
- [x] `SPRINT-2` — `@domos/server` (DomOSServer, transport, sessions, middleware, LLM, memory, 21 tests)
- [x] `SPRINT-2B` — `@domos/adapter-google` (GoogleAdapter Gemini text + function calling)
- [x] `SPRINT-3` — `@domos/react` (DomOSProvider, hooks, composants, voice)
- [x] `SPRINT-4` — `apps/demo` + `apps/demo-server` (e-commerce React + Tailwind v3 + serveur)
- [x] `SPRINT-4B` — `@domos/vue` (DomOSPlugin, composables, composants Vue 3)
- [x] `SPRINT-4C` — `DomOSClient` dans core + sync auto tools client → serveur
- [x] `SPRINT-4D` — Documentation GitHub (README.md + docs/)

### SDKs Manquants

- [ ] `SPRINT-5` — `@domos/svelte` (stores, actions `use:agentTool`, composants Svelte)

### Adaptateurs LLM

- [ ] `SPRINT-6A` — `@domos/adapter-openai` (GPT-4o, function calling)
- [ ] `SPRINT-6B` — `@domos/adapter-anthropic` (Claude, tool_use)

### Features Avancees

- [ ] `SPRINT-7A` — Mode Live Audio : interface `LiveAdapter` + `GoogleLiveAdapter` + `AUDIO_STREAM`
- [ ] `SPRINT-7B` — System Prompts : registre de prompts (TEXT_AGENT, LIVE_AGENT, SHOPPING_AGENT)
- [ ] `SPRINT-7C` — STT/TTS Fallback : WhisperSTT, OpenAITTS, GoogleSTT/TTS, ElevenLabsTTS (pour modèles sans audio natif)
- [ ] `SPRINT-8A` — Persistance MongoDB (SessionStore)
- [ ] `SPRINT-8B` — Redis Rate Limiting
- [ ] `SPRINT-9` — Dashboard Admin (monitoring sessions/tools/metrics)

### Production & Qualite

- [ ] `SPRINT-10A` — Tests E2E (Playwright)
- [ ] `SPRINT-10B` — Tests Integration (server + client ensemble)
- [ ] `SPRINT-10C` — CI/CD GitHub Actions (build, test, lint)
- [ ] `SPRINT-10D` — Publish npm (Changesets)

### Validation

- [ ] `SPRINT-11` — `pnpm install` + `pnpm build` + `pnpm test` + fix erreurs

---

## Pour implementer un sprint

Donnez-moi le code :

```
SPRINT-5
```

Et je l'implemente entierement (fichiers, code, tests).

Vous pouvez aussi combiner :

```
SPRINT-5 + SPRINT-6A
```

Ou tout lancer d'un coup :

```
SPRINT-5 + SPRINT-6A + SPRINT-6B + SPRINT-11
```
