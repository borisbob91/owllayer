# Sprint 2 — LLM Capabilities, Adapter Anthropic, getCapabilities API

> **Objectif** : Ajouter l'interface `getCapabilities()` à tous les adapters, créer
> `@domos/adapter-anthropic`, exposer `/admin/capabilities` dans AdminAPI, et enrichir
> le schéma des voix/modèles pour que le dashboard puisse les lister dynamiquement.
> À la fin de ce sprint : `GET /admin/capabilities` retourne la liste des modèles,
> voix et providers disponibles.

---

## Prérequis

- Sprint 1 complet — standalone boot OK
- `@domos/adapter-google` build OK
- `@domos/adapter-openai` build OK

---

## Étape 2.1 — Nouveaux types Capabilities dans llm/types.ts

**Fichier** : `packages/server/src/llm/types.ts` (modifier)

**AVANT** : `LLMAdapter` et `LiveAdapter` sans introspection.

**APRÈS** : Ajouter ces types et modifier les interfaces existantes.

```ts
// ── Capabilities ─────────────────────────────────────

export interface LLMModel {
  id: string;                  // ex: 'gemini-2.5-flash'
  name: string;                // ex: 'Gemini 2.5 Flash'
  supportsAudio: boolean;      // true si mode live audio natif
  supportsTools: boolean;      // true si function calling
  supportsStreaming?: boolean;  // true si streaming text
  description?: string;
  maxTokens?: number;
}

export interface VoiceInfo {
  id: string;                  // ex: 'Fenrir'
  name: string;                // ex: 'Fenrir'
  language?: string;           // ex: 'multilingual'
  gender?: 'male' | 'female' | 'neutral';
  preview?: string;            // URL sample audio (optionnel, futur)
}

export interface LLMAdapterCapabilities {
  provider: string;            // 'google' | 'openai' | 'anthropic'
  providerName: string;        // 'Google Gemini' | 'OpenAI' | 'Anthropic'
  models: LLMModel[];
  voices?: VoiceInfo[];        // voix disponibles (Live/TTS)
  currentModel?: string;       // modèle actuellement configuré
  currentVoice?: string;       // voix actuellement configurée
}

// ── Modifier LLMAdapter (ajouter getCapabilities) ────

export interface LLMAdapter {
  readonly name: string;
  chat(request: LLMRequest): Promise<LLMResponse>;
  handleToolResult(callId: string, result: unknown): Promise<LLMResponse>;
  /** Optionnel — retourne les modèles/voix disponibles pour ce provider */
  getCapabilities?(): LLMAdapterCapabilities;
}

// ── Modifier LiveAdapter (ajouter getCapabilities) ───

export interface LiveAdapter {
  readonly name: string;
  systemPrompt?: SystemPrompt;
  createSession(config: LiveSessionConfig): Promise<LiveSession>;
  /** Optionnel — retourne les modèles/voix disponibles pour le mode live */
  getCapabilities?(): LLMAdapterCapabilities;
}
```

**Dépend de** : rien (modification pure de types)
**Impact** : backward compatible — `getCapabilities` est optionnel

---

## Étape 2.2 — Speech Capabilities (STT/TTS)

**Fichier** : `packages/server/src/speech/types.ts` (modifier)

**APRÈS** : Ajouter l'interface optionnelle dans STTService et TTSService.

```ts
// ── Ajouter à speech/types.ts ────────────────────────

export interface SpeechCapabilities {
  provider: string;           // 'google' | 'openai' | 'elevenlabs'
  providerName: string;
  voices?: VoiceInfo[];       // voix TTS disponibles
  languages?: string[];       // langues supportées
  models?: Array<{ id: string; name: string; description?: string }>;
  currentVoice?: string;
  currentLanguage?: string;
}

// Importer VoiceInfo depuis llm/types.ts
// Ou dupliquer — préférer réexport depuis un types commun

// Modifier les interfaces existantes (optionnel) :

export interface STTService {
  // ... méthodes existantes ...
  getCapabilities?(): SpeechCapabilities;
}

export interface TTSService {
  // ... méthodes existantes ...
  getCapabilities?(): SpeechCapabilities;
}
```

**Dépend de** : étape 2.1 (VoiceInfo type)

---

## Étape 2.3 — GoogleAdapter.getCapabilities()

**Fichier** : `packages/adapter-google/src/GoogleAdapter.ts` (modifier)

**APRÈS** : Ajouter la méthode à la classe existante.

```ts
import type { LLMAdapterCapabilities } from '@domos/server';

export class GoogleAdapter extends BaseLLMAdapter {
  // ... code existant inchangé ...

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: 'google',
      providerName: 'Google Gemini',
      currentModel: this.model,
      models: [
        { id: 'gemini-2.5-flash',  name: 'Gemini 2.5 Flash',  supportsAudio: false, supportsTools: true, description: 'Rapide, bon rapport qualité/prix' },
        { id: 'gemini-2.5-pro',    name: 'Gemini 2.5 Pro',    supportsAudio: false, supportsTools: true, description: 'Haute qualité, raisonnement avancé' },
        { id: 'gemini-2.0-flash',  name: 'Gemini 2.0 Flash',  supportsAudio: false, supportsTools: true, description: 'Version précédente stable' },
        { id: 'gemini-1.5-pro',    name: 'Gemini 1.5 Pro',    supportsAudio: false, supportsTools: true, description: 'Context window 1M tokens' },
      ],
    };
  }
}
```

---

## Étape 2.4 — GoogleLiveAdapter.getCapabilities()

**Fichier** : `packages/adapter-google/src/GoogleLiveAdapter.ts` (modifier)

```ts
import type { LLMAdapterCapabilities, VoiceInfo } from '@domos/server';

const GEMINI_LIVE_VOICES: VoiceInfo[] = [
  { id: 'Fenrir',  name: 'Fenrir',  gender: 'male',    language: 'multilingual' },
  { id: 'Puck',    name: 'Puck',    gender: 'male',    language: 'multilingual' },
  { id: 'Kore',    name: 'Kore',    gender: 'female',  language: 'multilingual' },
  { id: 'Charon',  name: 'Charon',  gender: 'male',    language: 'multilingual' },
  { id: 'Aoede',   name: 'Aoede',   gender: 'female',  language: 'multilingual' },
  { id: 'Zephyr',  name: 'Zephyr',  gender: 'neutral', language: 'multilingual' },
  { id: 'Orbit',   name: 'Orbit',   gender: 'neutral', language: 'multilingual' },
  { id: 'Vega',    name: 'Vega',    gender: 'female',  language: 'multilingual' },
  { id: 'Sirius',  name: 'Sirius',  gender: 'male',    language: 'multilingual' },
];

export class GoogleLiveAdapter implements LiveAdapter {
  // ... code existant inchangé ...

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: 'google',
      providerName: 'Google Gemini Live',
      currentModel: this.model,
      currentVoice: this.defaultVoice,
      models: [
        { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Flash Live (Dec 2025)',  supportsAudio: true, supportsTools: true },
        { id: 'gemini-2.5-flash-native-audio-preview',         name: 'Gemini 2.5 Flash Live (Preview)',   supportsAudio: true, supportsTools: true },
      ],
      voices: GEMINI_LIVE_VOICES,
    };
  }
}
```

---

## Étape 2.5 — OpenAIAdapter.getCapabilities()

**Fichier** : `packages/adapter-openai/src/` (modifier les adapters existants)

**Exploration nécessaire** : lire le contenu actuel de `packages/adapter-openai/src/` pour savoir ce qui existe déjà.

```ts
// À ajouter dans la classe OpenAIAdapter existante

getCapabilities(): LLMAdapterCapabilities {
  return {
    provider: 'openai',
    providerName: 'OpenAI',
    currentModel: this.model,
    models: [
      { id: 'gpt-4o',        name: 'GPT-4o',        supportsAudio: false, supportsTools: true, description: 'Flagship multimodal' },
      { id: 'gpt-4o-mini',   name: 'GPT-4o Mini',   supportsAudio: false, supportsTools: true, description: 'Rapide et économique' },
      { id: 'gpt-4-turbo',   name: 'GPT-4 Turbo',   supportsAudio: false, supportsTools: true, description: 'Vision + 128k context' },
      { id: 'o1',            name: 'o1',             supportsAudio: false, supportsTools: true, description: 'Raisonnement avancé' },
      { id: 'o3-mini',       name: 'o3-mini',        supportsAudio: false, supportsTools: true, description: 'Raisonnement économique' },
    ],
  };
}
```

Si un `OpenAILiveAdapter` existe :
```ts
const OPENAI_REALTIME_VOICES: VoiceInfo[] = [
  { id: 'alloy',   name: 'Alloy',   gender: 'neutral', language: 'multilingual' },
  { id: 'echo',    name: 'Echo',    gender: 'male',    language: 'multilingual' },
  { id: 'fable',   name: 'Fable',   gender: 'male',    language: 'multilingual' },
  { id: 'onyx',    name: 'Onyx',    gender: 'male',    language: 'multilingual' },
  { id: 'nova',    name: 'Nova',    gender: 'female',  language: 'multilingual' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female',  language: 'multilingual' },
  { id: 'ash',     name: 'Ash',     gender: 'male',    language: 'multilingual' },
  { id: 'coral',   name: 'Coral',   gender: 'female',  language: 'multilingual' },
  { id: 'sage',    name: 'Sage',    gender: 'neutral', language: 'multilingual' },
];
```

---

## Étape 2.6 — Créer @domos/adapter-anthropic (stub fonctionnel)

**Nouveau package** : `packages/adapter-anthropic/`

### Structure :
```
packages/adapter-anthropic/
  src/
    index.ts
    AnthropicAdapter.ts
  package.json
  tsconfig.json
```

### `package.json` :
```json
{
  "name": "@domos/adapter-anthropic",
  "version": "0.1.0",
  "description": "DomOS Adapter - Anthropic Claude",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@domos/core": "workspace:*",
    "@domos/server": "workspace:*",
    "@anthropic-ai/sdk": "^0.30.0"
  },
  "devDependencies": {
    "tsup": "^8.0",
    "typescript": "^5.5"
  },
  "files": ["dist"],
  "license": "MIT"
}
```

### `tsconfig.json` :
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### `src/AnthropicAdapter.ts` :
```ts
import Anthropic from '@anthropic-ai/sdk';
import { createLogger, type SystemPrompt, generateId } from '@domos/core';
import { BaseLLMAdapter } from '@domos/server';
import type { LLMRequest, LLMResponse, LLMAdapterCapabilities } from '@domos/server';

const log = createLogger('DomOS:AnthropicAdapter');

export interface AnthropicAdapterOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: SystemPrompt;
}

export class AnthropicAdapter extends BaseLLMAdapter {
  readonly name = 'anthropic-claude';
  private client: Anthropic;
  private model: string;

  constructor(options: AnthropicAdapterOptions) {
    super(options.systemPrompt);
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model || 'claude-sonnet-4-20250514';
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const systemPrompt = this.buildSystemPrompt(request);

    // Convertir messages DomOS → format Anthropic
    const messages = request.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));

    // Convertir tools DomOS → format Anthropic
    const tools = request.tools.map(tool => ({
      name: tool.name,
      description: tool.description || '',
      input_schema: tool.parameters || { type: 'object' as const, properties: {} },
    }));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        ...(tools.length > 0 ? { tools } : {}),
      });

      return this.parseResponse(response);
    } catch (err) {
      log.error('Anthropic API error:', String(err));
      throw err;
    }
  }

  async handleToolResult(callId: string, result: unknown): Promise<LLMResponse> {
    // Anthropic gère les tool results via la conversation :
    // Le serveur DomOS reconstruit les messages avec le tool_result
    // Cette méthode est un fallback — dans la pratique, DomOSServer
    // reconstitue la conversation complète et rappelle chat()
    return { text: JSON.stringify(result) };
  }

  getCapabilities(): LLMAdapterCapabilities {
    return {
      provider: 'anthropic',
      providerName: 'Anthropic Claude',
      currentModel: this.model,
      models: [
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4',   supportsAudio: false, supportsTools: true, description: 'Meilleur rapport qualité/prix' },
        { id: 'claude-opus-4-20250514',   name: 'Claude Opus 4',     supportsAudio: false, supportsTools: true, description: 'Flagship, raisonnement complexe' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', supportsAudio: false, supportsTools: true, description: 'Ultra-rapide, économique' },
      ],
    };
  }

  private parseResponse(response: any): LLMResponse {
    const result: LLMResponse = {};

    for (const block of response.content) {
      if (block.type === 'text') {
        result.text = (result.text || '') + block.text;
      }
      if (block.type === 'tool_use') {
        if (!result.toolCalls) result.toolCalls = [];
        result.toolCalls.push({
          callId: block.id || `call_${generateId().slice(0, 8)}`,
          name: block.name,
          args: block.input || {},
        });
      }
    }

    if (response.usage) {
      result.usage = {
        inputTokens: response.usage.input_tokens || 0,
        outputTokens: response.usage.output_tokens || 0,
      };
    }

    return result;
  }
}
```

### `src/index.ts` :
```ts
export { AnthropicAdapter } from './AnthropicAdapter.js';
export type { AnthropicAdapterOptions } from './AnthropicAdapter.js';
```

**Dépend de** : `@domos/server` (BaseLLMAdapter, types), `@anthropic-ai/sdk`
**Critère de validation** : `pnpm --filter @domos/adapter-anthropic build` ✅

---

## Étape 2.7 — Mettre à jour la factory adapter (Sprint 1 étape 1.4)

**Fichier** : `packages/server/src/standalone/adapters/factory.ts` (modifier)

**AVANT** : `case 'anthropic': throw new Error('non implémenté')`

**APRÈS** :
```ts
case 'anthropic': {
  const apiKey = requireEnv('ANTHROPIC_API_KEY');
  const { AnthropicAdapter } = await import('@domos/adapter-anthropic');
  return new AnthropicAdapter({ apiKey, model: model ?? 'claude-sonnet-4-20250514' });
}
```

**Ajouter** dans `packages/server/package.json` build :
```
--external @domos/adapter-anthropic
```

---

## Étape 2.8 — Speech providers: getCapabilities()

### GoogleSTT :
```ts
getCapabilities(): SpeechCapabilities {
  return {
    provider: 'google',
    providerName: 'Google Cloud STT',
    currentLanguage: this.defaultLanguage,
    languages: ['fr-FR', 'en-US', 'en-GB', 'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN'],
    models: [
      { id: 'latest_long',  name: 'Long Audio',     description: 'Audio > 1 min' },
      { id: 'latest_short', name: 'Short Audio',     description: 'Audio < 1 min, commandes' },
      { id: 'telephony',    name: 'Telephony',       description: 'Optimisé téléphonie 8kHz' },
    ],
  };
}
```

### GoogleTTS :
```ts
getCapabilities(): SpeechCapabilities {
  return {
    provider: 'google',
    providerName: 'Google Cloud TTS',
    currentVoice: this.voice,
    currentLanguage: this.defaultLanguage,
    voices: [
      { id: 'fr-FR-Neural2-A', name: 'Neural2-A (FR)', gender: 'female', language: 'fr-FR' },
      { id: 'fr-FR-Neural2-B', name: 'Neural2-B (FR)', gender: 'male',   language: 'fr-FR' },
      { id: 'fr-FR-Neural2-C', name: 'Neural2-C (FR)', gender: 'female', language: 'fr-FR' },
      { id: 'fr-FR-Neural2-D', name: 'Neural2-D (FR)', gender: 'male',   language: 'fr-FR' },
      { id: 'en-US-Neural2-A', name: 'Neural2-A (EN)', gender: 'male',   language: 'en-US' },
      { id: 'en-US-Neural2-C', name: 'Neural2-C (EN)', gender: 'female', language: 'en-US' },
    ],
  };
}
```

### OpenAITTS :
```ts
getCapabilities(): SpeechCapabilities {
  return {
    provider: 'openai',
    providerName: 'OpenAI TTS',
    currentVoice: this.voice,
    voices: [
      { id: 'alloy',   name: 'Alloy',   gender: 'neutral', language: 'multilingual' },
      { id: 'echo',    name: 'Echo',     gender: 'male',    language: 'multilingual' },
      { id: 'fable',   name: 'Fable',    gender: 'male',    language: 'multilingual' },
      { id: 'onyx',    name: 'Onyx',     gender: 'male',    language: 'multilingual' },
      { id: 'nova',    name: 'Nova',     gender: 'female',  language: 'multilingual' },
      { id: 'shimmer', name: 'Shimmer',  gender: 'female',  language: 'multilingual' },
    ],
    models: [
      { id: 'tts-1',    name: 'TTS-1',    description: 'Rapide, faible latence' },
      { id: 'tts-1-hd', name: 'TTS-1 HD', description: 'Haute qualité' },
    ],
  };
}
```

### ElevenLabsTTS :
```ts
getCapabilities(): SpeechCapabilities {
  return {
    provider: 'elevenlabs',
    providerName: 'ElevenLabs',
    currentVoice: this.voice,
    models: [
      { id: 'eleven_multilingual_v2', name: 'Multilingual v2',   description: '29 langues, haute qualité' },
      { id: 'eleven_turbo_v2_5',      name: 'Turbo v2.5',        description: 'Faible latence' },
    ],
    // Note : les voix ElevenLabs sont custom — on ne peut pas les lister statiquement
    // Futur : appeler l'API ElevenLabs GET /v1/voices pour les lister dynamiquement
  };
}
```

---

## Étape 2.9 — AdminAPI: endpoint GET /admin/capabilities

**Fichier** : `packages/server/src/admin/AdminAPI.ts` (modifier)

### Nouvelle méthode :
```ts
private handleGetCapabilities(req: IncomingMessage, res: ServerResponse): boolean {
  const llmCaps  = this.deps.llmAdapter?.getCapabilities?.()  ?? null;
  const liveCaps = this.deps.liveAdapter?.getCapabilities?.() ?? null;
  const sttCaps  = this.deps.sttService?.getCapabilities?.()  ?? null;
  const ttsCaps  = this.deps.ttsService?.getCapabilities?.()  ?? null;

  this.sendJSON(res, {
    llm:  llmCaps,
    live: liveCaps,
    stt:  sttCaps,
    tts:  ttsCaps,
    server: {
      version: '0.1.0',
      mode: 'standalone',
      uptime: process.uptime(),
    },
  });
  return true;
}
```

### Route handler (ajouter dans le routeur) :
```ts
// Dans le switch/if de routage des requêtes admin :
if (method === 'GET' && pathname === `${this.basePath}/capabilities`) {
  return this.handleGetCapabilities(req, res);
}
```

### Modifier `AdminAPIDeps` pour recevoir les adapters :
```ts
export interface AdminAPIDeps {
  // ... existants ...
  llmAdapter?: LLMAdapter;
  liveAdapter?: LiveAdapter;
  sttService?: STTService;
  ttsService?: TTSService;
}
```

### Modifier DomOSServer pour passer les adapters à AdminAPI :
```ts
// Dans DomOSServer constructor, lors de la création de AdminAPI :
this.adminAPI = new AdminAPI({
  // ... existants ...
  llmAdapter: this.llm,
  liveAdapter: this.live,
  sttService: this.stt,
  ttsService: this.tts,
});
```

---

## Étape 2.10 — Export des nouveaux types dans packages/server/src/index.ts

```ts
// Ajouter aux exports existants :
export type {
  LLMAdapterCapabilities,
  LLMModel,
  VoiceInfo,
} from './llm/types.js';

export type {
  SpeechCapabilities,
} from './speech/types.js';
```

---

## Résumé Sprint 2

| # | Fichier/Package | Action | Livrable |
|---|-----------------|--------|----------|
| 2.1 | `llm/types.ts` | Modifier | Types Capabilities + LLMModel + VoiceInfo |
| 2.2 | `speech/types.ts` | Modifier | SpeechCapabilities interface |
| 2.3 | `adapter-google/GoogleAdapter.ts` | Modifier | getCapabilities() Google text |
| 2.4 | `adapter-google/GoogleLiveAdapter.ts` | Modifier | getCapabilities() + voix Gemini Live |
| 2.5 | `adapter-openai/` | Modifier | getCapabilities() OpenAI + voix Realtime |
| 2.6 | `packages/adapter-anthropic/` | **Créer** | Nouveau package complet |
| 2.7 | `standalone/adapters/factory.ts` | Modifier | Support anthropic dans factory |
| 2.8 | `speech/providers/*.ts` | Modifier | getCapabilities() pour chaque provider |
| 2.9 | `admin/AdminAPI.ts` + `core/DomOSServer.ts` | Modifier | Endpoint `/admin/capabilities` |
| 2.10 | `src/index.ts` | Modifier | Export nouveaux types |

**Critère de fin de sprint** :
```bash
# Démarrer le serveur standalone avec Google
curl http://localhost:3000/admin/capabilities -H "Cookie: session=..."
# Retourne :
# {
#   "llm": { "provider": "google", "models": [...], "currentModel": "gemini-2.5-flash" },
#   "live": { "provider": "google", "voices": [...], "currentVoice": "Fenrir" },
#   "stt": { "provider": "google", "languages": [...] },
#   "tts": { "provider": "google", "voices": [...] },
#   "server": { "version": "0.1.0", "mode": "standalone" }
# }

# Build de tous les adapters
pnpm --filter @domos/adapter-anthropic build  # ✅
pnpm --filter @domos/adapter-google build     # ✅
pnpm --filter @domos/adapter-openai build     # ✅
```
