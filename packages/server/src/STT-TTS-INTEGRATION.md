# DomOSServer - STT/TTS Integration

## Vue d'ensemble

DomOSServer supporte maintenant **3 modes audio** différents :

| Mode | Description | Providers | Latence | Use Case |
|------|-------------|-----------|---------|----------|
| **Mode 1 : Live** | Audio natif bidirectionnel | Gemini Live, GPT-4o Realtime | Très faible | Conversation vocale temps réel |
| **Mode 2 : Hybride STT/TTS** | Pipeline Audio→STT→LLM texte→TTS→Audio | Whisper + OpenAI TTS, Google STT/TTS | Moyenne | LLM sans audio natif (Claude, GPT-4, etc.) |
| **Mode 3 : Texte** | Mode chat texte classique | Aucun | N/A | Chat textuel |

---

## Mode 1 : Live Audio (Existant)

Audio natif géré par le modèle LLM.

```typescript
import { DomOSServer } from '@domos/server';
import { GoogleLiveAdapter } from '@domos/adapter-google';

const server = new DomOSServer({
  llm: new GoogleAdapter({ apiKey: '...' }), // Mode texte fallback
  live: new GoogleLiveAdapter({ apiKey: '...' }), // Mode audio natif
  transport: { type: 'websocket', port: 3000 },
});
```

**Flux** :
```
Client Micro → Gemini Live (STT + LLM + TTS intégré) → Client Speakers
```

---

## Mode 2 : Hybride STT/TTS (NOUVEAU ✨)

Pipeline séparé pour les LLM sans support audio natif.

### Configuration

```typescript
import { DomOSServer } from '@domos/server';
import { AnthropicAdapter } from '@domos/adapter-anthropic';
import { WhisperSTT, OpenAITTS } from '@domos/adapter-openai';

const server = new DomOSServer({
  // LLM texte sans audio natif
  llm: new AnthropicAdapter({
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),

  // Pipeline STT/TTS
  stt: new WhisperSTT({
    apiKey: process.env.OPENAI_API_KEY!,
    language: 'fr', // optionnel
    responseFormat: 'verbose_json',
  }),

  tts: new OpenAITTS({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'tts-1', // ou 'tts-1-hd'
    voice: 'nova',
  }),

  transport: { type: 'websocket', port: 3000 },
  apiKeys: ['pk_demo_local'],
});

server.listen(() => {
  console.log('✅ DomOS with STT/TTS ready');
});
```

### Flux du Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                                │
│  Micro → PCM 16kHz → Base64 → WebSocket                     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴─────────── SERVER ─────────────────┐
│                                                              │
│  ÉTAPE 1 : STT (Whisper)                                    │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Audio base64 → Whisper API → Texte transcrit     │       │
│  │ Ex: "Bonjour, comment ça va ?"                  │       │
│  │ Temps: ~300-500ms                                │       │
│  └──────────────────────────────────────────────────┘       │
│                         │                                    │
│                         ↓                                    │
│  ÉTAPE 2 : LLM (Claude)                                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Texte user → Claude Sonnet → Texte réponse      │       │
│  │ Ex: "Bonjour ! Je vais très bien, merci."       │       │
│  │ Temps: ~500-1500ms                               │       │
│  └──────────────────────────────────────────────────┘       │
│                         │                                    │
│                         ↓                                    │
│  ÉTAPE 3 : TTS (OpenAI)                                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Texte agent → OpenAI TTS → Audio MP3 base64     │       │
│  │ Temps: ~300-500ms                                │       │
│  └──────────────────────────────────────────────────┘       │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────┴────────── CLIENT ──────────────────┐
│  WebSocket → Base64 → AudioContext → Speakers               │
└──────────────────────────────────────────────────────────────┘

Total latence: ~1100-2500ms (acceptable pour conversation vocale)
```

### Messages ADTP échangés

#### 1. Client → Server : USER_INPUT (audio)

```json
{
  "type": "USER_INPUT",
  "payload": {
    "modality": "audio",
    "content": "SGVsbG8gV29ybGQ=...", // Audio PCM base64
    "mimeType": "audio/pcm;rate=16000"
  }
}
```

#### 2. Server → Client : SYSTEM_EVENT (transcription - optionnel)

```json
{
  "type": "SYSTEM_EVENT",
  "payload": {
    "event": "transcription",
    "data": "Bonjour, comment ça va ?"
  }
}
```

#### 3. Server → Client : AGENT_RESPONSE (texte)

```json
{
  "type": "AGENT_RESPONSE",
  "payload": {
    "text": "Bonjour ! Je vais très bien, merci.",
    "done": true
  }
}
```

#### 4. Server → Client : AUDIO_STREAM (audio)

```json
{
  "type": "AUDIO_STREAM",
  "payload": {
    "data": "SUQzBAAAAAAAI1RTU0UAAAAPAAAD...", // Audio MP3 base64
    "mimeType": "audio/mpeg"
  }
}
```

---

## Gestion des erreurs

### Fallback automatique

Si STT/TTS échoue, le serveur envoie une réponse texte d'excuse :

```typescript
// En cas d'erreur STT/TTS
this.transport.send(
  session.connId,
  Messages.systemEvent('error', 'Audio processing error')
);

// Réponse texte de fallback
const fallbackText = "Désolé, j'ai rencontré un problème avec le traitement audio.";
this.transport.send(
  session.connId,
  Messages.agentResponse(fallbackText, true)
);
```

### Cas d'erreur courants

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Audio input not supported` | Aucun Live/STT/TTS configuré | Ajouter `stt` et `tts` dans options |
| `Empty transcription` | Audio vide ou bruit uniquement | Valider l'audio côté client avant envoi |
| `Text too long` | Texte LLM > 5000 caractères | Chunker la réponse en plusieurs TTS |
| `API key invalid` | Clé STT/TTS incorrecte | Vérifier `.env` |

---

## Logging & Monitoring

Le serveur log automatiquement les performances du pipeline :

```
[DomOS:Server][INFO] [Hybrid] STT transcribing audio (24576 bytes)
[DomOS:Server][INFO] [Hybrid] STT complete (342ms): "Bonjour, comment ça va ?"
[DomOS:Server][INFO] [Hybrid] LLM processing text
[DomOS:Server][INFO] [Hybrid] LLM complete (1250ms)
[DomOS:Server][INFO] [Hybrid] TTS synthesizing (35 chars)
[DomOS:Server][INFO] [Hybrid] TTS complete (421ms, 12800 bytes)
[DomOS:Server][INFO] [Hybrid] Pipeline complete: STT=342ms, LLM=1250ms, TTS=421ms, Total=2013ms
```

### Métriques exposées

```typescript
// Dans AdminAPI (si activé)
{
  "session": {
    "id": "sess_...",
    "audioMode": "hybrid", // "live" | "hybrid" | "text"
    "lastPipelineLatency": {
      "stt": 342,
      "llm": 1250,
      "tts": 421,
      "total": 2013
    }
  }
}
```

---

## Comparaison des modes

| Aspect | Mode Live | Mode Hybride | Mode Texte |
|--------|-----------|--------------|------------|
| **Latence** | 200-500ms | 1000-2500ms | 500-1500ms |
| **Qualité STT** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | N/A |
| **Qualité TTS** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | N/A |
| **Coût** | ~$0.02/min | ~$0.036/conv | ~$0.003/conv |
| **LLM supportés** | Gemini Live, GPT-4o Realtime | Tous (Claude, GPT-4, etc.) | Tous |
| **Interruptions** | ✅ Natif | ❌ Non supporté | N/A |
| **Tool calling** | ✅ Pendant stream | ✅ Séquentiel | ✅ |

---

## Exemple complet : Demo Server

```typescript
// apps/demo-server/src/server.ts
import { DomOSServer } from '@domos/server';
import { AnthropicAdapter } from '@domos/adapter-anthropic';
import { WhisperSTT, OpenAITTS } from '@domos/adapter-openai';

// Mode Hybride : Claude + Whisper + OpenAI TTS
const server = new DomOSServer({
  llm: new AnthropicAdapter({
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    systemPrompt: `Tu es un assistant vocal. Réponds de manière concise (max 2-3 phrases).`,
  }),

  stt: new WhisperSTT({
    apiKey: process.env.OPENAI_API_KEY!,
    language: 'fr',
    responseFormat: 'verbose_json',
    debug: true,
  }),

  tts: new OpenAITTS({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'tts-1', // Rapide, bonne qualité
    voice: 'nova', // Voix féminine moderne
    format: 'mp3',
    debug: true,
  }),

  transport: { type: 'websocket', port: 3000 },
  apiKeys: ['pk_demo_local'],
  admin: true,
});

// Ajouter un tool serveur (optionnel)
server.tool('get_weather', async ({ city }) => {
  return `Il fait 22°C à ${city}`;
});

server.listen(() => {
  console.log('✅ DomOS Server with STT/TTS ready on port 3000');
  console.log('📊 Admin dashboard: http://localhost:3000/admin');
});
```

---

## Environnement (.env)

```env
# LLM
ANTHROPIC_API_KEY=sk-ant-...

# STT/TTS (si mode hybride)
OPENAI_API_KEY=sk-...

# Google (si mode live ou Google STT/TTS)
GOOGLE_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json

# DomOS
DOMOS_API_KEY=pk_demo_local
PORT=3000
```

---

## Tests

```bash
# Tester le serveur avec STT/TTS
cd apps/demo-server
pnpm dev

# Dans un autre terminal, tester avec le client
cd apps/demo
pnpm dev
```

---

## Prochaines étapes

- [ ] Sortir `ElevenLabsTTS` dans un adapter dedie
- [ ] Support chunking pour textes longs (> 4096 chars)
- [ ] Support streaming TTS (pour latence encore plus faible)
- [ ] Détection automatique de la langue (si non spécifiée)

---

✅ **L'intégration STT/TTS est maintenant complète dans DomOSServer !**
