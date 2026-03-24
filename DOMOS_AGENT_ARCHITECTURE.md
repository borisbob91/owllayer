# DomOS — Architecture Agent : Analyse & Plan d'implémentation

> **Date** : Mars 2026  
> **Scope** : `@domos/core`, `@domos/server`, `@domos/react`, `@domos/vue`, `@domos/svelte`  
> **Principe directeur** : Un seul agent par conversation — défini côté serveur — identifié par l'API key.

---

## 1. Constat : ce qui existe déjà

### 1.1 `DomOSClient` — le transport, complet

`packages/core/src/client/DomOSClient.ts` (~940 lignes) est **terminé**. Il gère :

- Connexion WebSocket / WebRTC avec reconnexion automatique
- Handshake ADTP (envoi de `HANDSHAKE_INIT` avec `apiKey`)
- Registre de tools avec gestion HITL (HIGH/CRITICAL → approbation)
- Shadow Context (`updateContext` / `setContext`)
- Virtual Lines (`lineToken`)
- Tous les modes audio (stream, end, interrupt)

**Le client n'a pas à connaître la configuration de l'agent.** Son rôle est le transport et la gestion des outils côté UI.

---

### 1.2 `DomosAgent` — le gestionnaire de mémoire, complet

`packages/core/src/agent/DomosAgent.ts` est **terminé**. Il gère :

- **Session memory** : historique user/assistant de la session courante
- **Persistent memory** : préférences, objectifs, historique cross-session
- **Feedback** : positive / negative / correction / suggestion
- Sauvegarde debounced (300ms) via `MemoryAdapter`
- Troncature automatique (100 entrées session, 500 historique)

Le `DomosAgent` est instancié côté **serveur** dans `DomOSServer` via `createSessionAgent()` et alimenté à chaque échange via `recordUserRequest()` / `recordAgentResponse()`.

---

### 1.3 `promptOverrides: Map<apiKey, SystemPrompt>` — déjà câblé

C'est le mécanisme central. Dans `DomOSServer`, les **3 chemins LLM** (texte, hybride, live) font systématiquement :

```ts
const systemPrompt = this.promptOverrides.get(session.apiKey) ?? this.llm.systemPrompt;
```

**Une API key = un agent = un prompt.** Ce principe est déjà implémenté.

---

### 1.4 `setPromptOverride(apiKey, prompt)` — API publique existante

```ts
server.setPromptOverride('pk_prod_shopify', {
  role: 'Tu es Alex, assistant shopping expert.',
  personality: 'Amical, concis, professionnel.',
  rules: ['Ne jamais supprimer de données sans confirmation'],
  language: 'fr',
});
```

Accepte `string | SystemPromptConfig`. Le `SystemPromptConfig` (dans `@domos/core/prompt/SystemPromptConfig.ts`) est un objet structuré compilé en prompt string via `compileSystemPrompt()`.

---

### 1.5 Admin API `/prompts` — CRUD en ligne déjà implémentée

`packages/server/src/admin/AdminAPI.ts` expose déjà :

| Endpoint | Description |
|---|---|
| `GET /admin/prompts` | Liste tous les overrides (apiKey → prompt) |
| `GET /admin/prompts/:apiKey` | Prompt d'une clé |
| `POST /admin/prompts` | Créer/modifier le prompt d'un agent par apiKey |
| `DELETE /admin/prompts/:apiKey` | Supprimer l'override |

Pour le cloud : depuis le dashboard admin, on configure le comportement de l'agent par API key, sans redéploiement.

---

### 1.6 `SystemPromptConfig` — structure existante dans core

```ts
// @domos/core — packages/core/src/prompt/SystemPromptConfig.ts
interface SystemPromptConfig {
  name?: string;         // "Alex", "Maya"
  language?: string;     // "fr", "en"
  role: string;          // "Tu es un assistant expert..."
  personality?: string;  // "Amical, concis, professionnel"
  capabilities?: string[];
  rules?: string[];
  context?: string | (() => string);
  toolInstructions?: string;
  responseFormat?: string;
  sections?: Record<string, string | string[]>;
}
```

C'est **la** structure pour définir un agent côté serveur. Elle est compilée en prompt via `compileSystemPrompt()` et résolue via `resolveSystemPrompt()`.

---

## 2. Gaps identifiés — ce qui manque

### Gap 1 — `AgentConfig` typé inexistant dans `@domos/server`

Il n'existe pas de type `AgentConfig` dédié côté serveur. Actuellement `setPromptOverride` reçoit directement un `SystemPrompt` (string ou `SystemPromptConfig`). Pour le cloud, il faut un type intermédiaire qui permette de définir l'agent de façon structurée et d'en dériver le prompt automatiquement.

**À créer côté serveur uniquement. Jamais exposé au client.**

```ts
// packages/server/src/agent/agentConfig.types.ts
export interface AgentConfig {
  name?: string;
  role: string;
  personality?: string;
  language?: string;
  capabilities?: string[];
  rules?: string[];
  toolInstructions?: string;
  responseFormat?: string;
}
```

Et une méthode `setAgentConfig(apiKey, config)` sur `DomOSServer` qui compile le `AgentConfig` en `SystemPromptConfig` et l'applique comme override.

---

### Gap 2 — `userId` non transmis au `DomosAgent` serveur

Actuellement dans `DomOSServer.createSessionAgent()` :

```ts
// Actuellement — sans userId
void this.createSessionAgent(session.id, { sessionId: session.id })
```

L'`AgentIdentity` devrait inclure `userId: session.apiKey` pour que la mémoire soit retrouvée entre sessions du même client (cross-session persistence) :

```ts
// Fix
void this.createSessionAgent(session.id, {
  sessionId: session.id,
  userId: session.apiKey,   // ← clé de la mémoire persistante
})
```

Sans ça, la mémoire persistante (`preferences`, `objectives`, `history`) ne peut pas être reliée à un client entre deux connexions.

---

### Gap 3 — La mémoire session n'est pas injectée dans le prompt LLM

Le `DomosAgent` stocke l'historique mais `getMemorySnapshot()` n'est **jamais appelé** lors de la construction du prompt. La boucle "mémoire → comportement LLM" n'est pas fermée.

**Dans `handleTextInput` et les 2 autres chemins LLM :**

```ts
// Actuellement
const systemPrompt = this.promptOverrides.get(session.apiKey) ?? this.llm.systemPrompt;

// Après fix — injection de la mémoire session
const basePrompt  = this.promptOverrides.get(session.apiKey) ?? this.llm.systemPrompt;
const agent       = this.sessionAgents.get(session.id);
const systemPrompt = agent
  ? enrichPromptWithMemory(basePrompt, agent.getMemorySnapshot())
  : basePrompt;
```

La fonction `enrichPromptWithMemory` ajoute au prompt les N dernières interactions pertinentes et les préférences persistantes — côté serveur, jamais côté client.

---

### Gap 4 — Pas de `AgentConfig` persistable dans l'Admin API

L'Admin API `/prompts` stocke un `SystemPrompt` raw en mémoire. Pour le cloud, il faut que les configs agents soient persistées (en base / fichier) et reconstruites au redémarrage du serveur.

Le `MemoryManager` existe pour les mémoires de session. Un `AgentConfigStore` similaire devrait gérer les configs d'agents per-apiKey avec persistance.

---

### Gap 5 — Pas de registre de prompts par défaut (DEFAULT_PROMPTS)

Le `TODO.md` du projet l'identifie lui-même (Sprint 7B). Il n'existe pas de prompts par défaut réutilisables dans `@domos/server` :

```
packages/server/src/prompts/
  ├── defaultPrompts.ts    ← TEXT_AGENT, LIVE_AGENT, SHOPPING_AGENT
  └── promptRegistry.ts   ← registre nommé (get by name)
```

---

## 3. Ce que le client fait — et ce qu'il ne fait pas

| Responsabilité | Côté |
|---|---|
| Définir le rôle / nom / ton de l'agent | **Serveur uniquement** |
| Construire le system prompt | **Serveur uniquement** |
| Injecter la mémoire dans le prompt | **Serveur uniquement** |
| Associer une config à une API key | **Serveur uniquement** (Admin API) |
| Envoyer l'API key (authentification) | **Client** — via header WS (déjà fait) |
| Enregistrer les tools UI | **Client** — via `registerTool` (déjà fait) |
| Envoyer le Shadow Context (page, données) | **Client** — via `CONTEXT_UPDATE` (déjà fait) |
| Afficher la mémoire (lecture seule) | **Client optionnel** — via `RemoteMemoryAdapter` |

**Aucun type `AgentConfig`, `SystemPromptConfig` ou `AgentPersonality` ne doit apparaître dans les SDK framework** (`@domos/react`, `@domos/vue`, `@domos/svelte`). Ces packages ne connaissent que `DomOSClient`.

---

## 4. Plan d'implémentation

### Étape 1 — `AgentConfig` + `setAgentConfig` dans `@domos/server`

**Fichier :** `packages/server/src/agent/agentConfig.types.ts`

```ts
export interface AgentConfig {
  name?: string;
  role: string;
  personality?: string;
  language?: string;
  capabilities?: string[];
  rules?: string[];
  toolInstructions?: string;
  responseFormat?: string;
}

export function agentConfigToSystemPrompt(config: AgentConfig): SystemPromptConfig {
  return {
    name:             config.name,
    role:             config.role,
    personality:      config.personality,
    language:         config.language,
    capabilities:     config.capabilities,
    rules:            config.rules,
    toolInstructions: config.toolInstructions,
    responseFormat:   config.responseFormat,
  };
}
```

**Méthode sur `DomOSServer` :**

```ts
setAgentConfig(apiKey: string, config: AgentConfig): void {
  const promptConfig = agentConfigToSystemPrompt(config);
  this.agentConfigs.set(apiKey, config);
  this.promptOverrides.set(apiKey, promptConfig);
}
```

**Utilisation :**

```ts
server.setAgentConfig('pk_prod_ecommerce', {
  name:         'Alex',
  role:         'Tu es Alex, assistant e-commerce expert.',
  personality:  'Amical, concis, orienté conversion.',
  language:     'fr',
  capabilities: ['Aider au choix de produit', 'Suivre une commande'],
  rules:        ['Ne jamais promettre de remboursement sans vérification'],
});
```

---

### Étape 2 — Fix `userId` dans `createSessionAgent`

**Fichier :** `packages/server/src/core/DomOSServer.ts`

```ts
// Avant
void this.createSessionAgent(session.id, { sessionId: session.id })

// Après
void this.createSessionAgent(session.id, { sessionId: session.id, userId: session.apiKey })
```

Un changement de 1 ligne. Impact : la mémoire persistante est désormais reliée à l'API key du client entre sessions.

---

### Étape 3 — Injecter la mémoire dans le prompt (les 3 chemins LLM)

**Fichier :** `packages/server/src/core/DomOSServer.ts`  
**Nouveau fichier :** `packages/server/src/agent/promptMemoryInjector.ts`

```ts
// promptMemoryInjector.ts
import { resolveSystemPrompt } from '@domos/core';
import type { AgentMemorySnapshot, SystemPrompt } from '@domos/core';

const MAX_HISTORY = 5; // derniers N échanges injectés

export function enrichPromptWithMemory(
  base: SystemPrompt | undefined,
  snapshot: AgentMemorySnapshot,
): string {
  const resolved = resolveSystemPrompt(base ?? '');

  const recent = snapshot.session
    .slice(-MAX_HISTORY * 2)
    .map((e) => `[${e.role === 'user' ? 'Utilisateur' : 'Agent'}]: ${e.content}`)
    .join('\n');

  const prefs = Object.keys(snapshot.persistent.preferences).length > 0
    ? `Préférences: ${JSON.stringify(snapshot.persistent.preferences)}`
    : null;

  const memory: string[] = [];
  if (prefs) memory.push(prefs);
  if (recent) memory.push(`Historique récent:\n${recent}`);

  if (memory.length === 0) return resolved;

  return `${resolved}\n\n[MÉMOIRE]\n${memory.join('\n\n')}`;
}
```

**Dans les 3 chemins de `DomOSServer` :**

```ts
// handleTextInput, handleHybridAudio, handleLiveAudio
const base     = this.promptOverrides.get(session.apiKey) ?? this.llm.systemPrompt;
const agent    = this.sessionAgents.get(session.id);
const resolved = agent
  ? enrichPromptWithMemory(base, agent.getMemorySnapshot())
  : resolveSystemPrompt(base ?? '');
// utiliser `resolved` (string) à la place de systemPrompt
```

---

### Étape 4 — DEFAULT_PROMPTS dans `@domos/server`

**Fichier :** `packages/server/src/prompts/defaultPrompts.ts`

```ts
import type { AgentConfig } from '../agent/agentConfig.types.js';

export const DEFAULT_AGENT_CONFIGS = {
  TEXT_AGENT: (language = 'fr'): AgentConfig => ({
    role: "Tu es DomOS, un assistant intelligent pour application web.",
    personality: "Utile, précis, concis.",
    language,
    rules: ["Confirme chaque action avant de l'exécuter"],
  }),

  LIVE_AGENT: (language = 'fr'): AgentConfig => ({
    role: "Tu es DomOS, un assistant vocal intelligent.",
    personality: "Naturel, conversationnel. Réponses courtes (1-2 phrases).",
    language,
    rules: ["Pas de markdown. Tu parles, tu n'écris pas."],
  }),

  SHOPPING_AGENT: (language = 'fr'): AgentConfig => ({
    name: "Alex",
    role: "Tu es Alex, un assistant shopping expert pour e-commerce.",
    personality: "Amical, orienté conversion, rassurant.",
    language,
    capabilities: ["Recherche produit", "Suivi commande", "Aide au choix"],
    rules: ["Ne jamais promettre de prix sans vérification en temps réel"],
  }),
};
```

---

### Étape 5 — Étendre l'Admin API `/agent-configs`

Ajouter dans `AdminAPI.ts` des endpoints dédiés à la gestion des `AgentConfig` :

| Endpoint | Description |
|---|---|
| `GET /admin/agent-configs` | Liste toutes les configs d'agents |
| `GET /admin/agent-configs/:apiKey` | Config d'un agent |
| `POST /admin/agent-configs` | Créer/modifier la config d'un agent par apiKey |
| `DELETE /admin/agent-configs/:apiKey` | Supprimer |

Ces endpoints appellent `setAgentConfig` sur le server, qui compile et stocke le prompt override correspondant. Le tout reste strictement côté serveur.

---

## 5. Ce qu'on ne fait pas

| Idée | Décision |
|---|---|
| `AgentConfig` dans `@domos/core` côté client | ❌ Inutile et dangereux — reste server-only |
| `agentConfig` option sur `DomOSProvider` / `DomOSPlugin` | ❌ Non — le client ne configure pas l'agent |
| Nouveau package `@domos/agent` wrappant `DomOSClient` | ❌ Inutile — wrapper sur wrapper sur wrapper |
| `AgentPromptBuilder` côté client | ❌ Violation de principe — le prompt est construit serveur |
| Multi-agents / coordinateur | ❌ Hors scope — un seul agent par conversation |
| `startVoiceSession()` dans un wrapper agent client | ❌ Déjà dans `DomOSClient` |
| Exposer `SystemPromptConfig` dans les SDK framework | ❌ Les SDK ne connaissent que `DomOSClient` |

---

## 6. Architecture finale — vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CÔTÉ SERVEUR                                │
│                                                                      │
│   Admin API (/agent-configs /prompts)                                │
│       │                                                              │
│       ▼                                                              │
│   DomOSServer                                                        │
│   ├── agentConfigs: Map<apiKey, AgentConfig>                         │
│   ├── promptOverrides: Map<apiKey, SystemPromptConfig> ──────────┐  │
│   ├── sessionAgents: Map<sessionId, DomosAgent>          prompt  │  │
│   │       └── DomosAgent (mémoire session + persistante)    ▼    │  │
│   │                                                   LLM.chat() │  │
│   └── createSessionAgent(id, { sessionId, userId: apiKey })      │  │
│                                                                      │
│   Résolution du prompt :                                             │
│   promptOverrides.get(apiKey) → enrichPromptWithMemory() → LLM      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ WebSocket (apiKey dans header)
                               │
┌──────────────────────────────────────────────────────────────────────┐
│                          CÔTÉ CLIENT                                 │
│                                                                      │
│   DomOSClient                                                        │
│   ├── Envoie apiKey → authentification (déjà fait)                  │
│   ├── registerTool() → tools UI                                      │
│   ├── updateContext() → Shadow Context (page, données)               │
│   └── sendText() / sendAudioStream() → messages utilisateur          │
│                                                                      │
│   @domos/react / @domos/vue / @domos/svelte                          │
│   └── Wrappent DomOSClient uniquement — zero connaissance agent       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. Résumé des actions

| # | Action | Fichier(s) | Complexité |
|---|---|---|---|
| 1 | Créer `AgentConfig` + `agentConfigToSystemPrompt` | `server/src/agent/agentConfig.types.ts` | Faible |
| 2 | Ajouter `setAgentConfig()` sur `DomOSServer` | `server/src/core/DomOSServer.ts` | Faible |
| 3 | Fix `userId: session.apiKey` dans `createSessionAgent` | `server/src/core/DomOSServer.ts` | Trivial (1 ligne) |
| 4 | Créer `enrichPromptWithMemory` | `server/src/agent/promptMemoryInjector.ts` | Moyenne |
| 5 | Câbler l'injection mémoire dans les 3 chemins LLM | `server/src/core/DomOSServer.ts` | Moyenne |
| 6 | Créer `DEFAULT_AGENT_CONFIGS` | `server/src/prompts/defaultPrompts.ts` | Faible |
| 7 | Étendre Admin API `/agent-configs` | `server/src/admin/AdminAPI.ts` | Moyenne |

**Aucun changement dans `@domos/core`, `@domos/react`, `@domos/vue`, `@domos/svelte`.**  
Tout se passe dans `@domos/server`.

---

## 8. Usage final (vision cloud)

```ts
// Sur le cloud server DomOS
const server = new DomOSServer({ llm, admin: { username, password } });

// Configurer un agent par API key — depuis le dashboard ou le code
server.setAgentConfig('pk_prod_shopify_fr', {
  name:         'Alex',
  role:         'Tu es Alex, un expert e-commerce Shopify.',
  personality:  'Amical, rassurant, orienté conversion.',
  language:     'fr',
  capabilities: ['Conseiller des produits', 'Suivre une commande', 'Gérer le panier'],
  rules:        [
    'Confirme chaque action panier avant exécution',
    'Ne supprime jamais une commande sans confirmation',
  ],
});

// Le client Shopify se connecte avec sa key — l'agent est automatiquement résolu
// const client = new DomOSClient({ endpoint, apiKey: 'pk_prod_shopify_fr' });
// → Le serveur retrouve la config Alex, construit le prompt, injecte la mémoire
// → Le client ne sait rien de tout ça
```
