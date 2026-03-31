# Speech Services - OpenAI Providers

## WhisperSTT (Speech-to-Text)

Provider STT utilisant OpenAI Whisper, le modèle de reconnaissance vocale open-source d'OpenAI.

### Features

- ✅ **Ultra-précis** : Meilleur modèle STT du marché
- ✅ **99 langues** : Détection automatique de la langue
- ✅ **Multi-formats** : PCM, WAV, MP3, M4A, FLAC, OGG, WebM
- ✅ **Robuste au bruit** : Fonctionne même avec bruit de fond
- ✅ **Prix compétitif** : $0.006 / minute d'audio

### Usage

```typescript
import { WhisperSTT } from '@domos/adapter-openai';

const whisper = new WhisperSTT({
  apiKey: process.env.OPENAI_API_KEY!,
  language: 'fr', // optionnel, auto-détection si non spécifié
  responseFormat: 'verbose_json', // pour avoir la confiance
});

const result = await whisper.transcribe({
  audioBase64: base64Audio,
  mimeType: 'audio/pcm;rate=16000',
});

console.log(result.text); // Texte transcrit
console.log(result.confidence); // Score de confiance (0-1)
console.log(result.detectedLanguage); // Langue détectée
```

### Formats supportés

| Format | Extension | Support |
|--------|-----------|---------|
| PCM | `.pcm` | ✅ (converti en WAV automatiquement) |
| WAV | `.wav` | ✅ |
| MP3 | `.mp3` | ✅ |
| M4A | `.m4a` | ✅ |
| FLAC | `.flac` | ✅ |
| OGG | `.ogg` | ✅ |
| WebM | `.webm` | ✅ |

### Conversion PCM → WAV

Le provider convertit automatiquement le PCM brut en fichier WAV avec header pour l'API Whisper :

```typescript
// PCM brut (pas de header)
const pcmBase64 = captureFromMicrophone();

// Automatiquement converti en WAV
const result = await whisper.transcribe({
  audioBase64: pcmBase64,
  mimeType: 'audio/pcm;rate=16000', // Le sample rate est extrait
});
```

---

## OpenAITTS (Text-to-Speech)

Provider TTS utilisant l'API Text-to-Speech d'OpenAI.

### Features

- ✅ **6 voix naturelles** : alloy, echo, fable, onyx, nova, shimmer
- ✅ **Multilingue** : Détection automatique de la langue
- ✅ **2 modèles** : `tts-1` (rapide) et `tts-1-hd` (haute qualité)
- ✅ **Latence faible** : ~300ms pour tts-1
- ✅ **Contrôle vitesse** : 0.25x à 4.0x
- ✅ **Multi-formats** : MP3, Opus, AAC, FLAC, WAV, PCM

### Usage

```typescript
import { OpenAITTS } from '@domos/adapter-openai';

const tts = new OpenAITTS({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'tts-1', // ou 'tts-1-hd'
  voice: 'nova', // voix féminine moderne
  format: 'mp3',
});

const result = await tts.synthesize({
  text: 'Bonjour, comment puis-je vous aider aujourd\'hui ?',
  speed: 1.0, // vitesse normale
});

console.log(result.audioBase64); // Audio en base64
console.log(result.mimeType); // 'audio/mpeg'
console.log(result.characterCount); // Nombre de caractères
```

### Voix disponibles

| Voix | Genre | Style | Description |
|------|-------|-------|-------------|
| `alloy` | Neutre | Professionnel | Voix claire et professionnelle |
| `echo` | Masculin | Chaleureux | Voix masculine mature |
| `fable` | Neutre | Énergique | Voix dynamique |
| `onyx` | Masculin | Autoritaire | Voix profonde |
| `nova` | Féminin | Moderne | Voix jeune ⭐ Recommandé pour FR |
| `shimmer` | Féminin | Douce | Voix apaisante |

### Lister les voix

```typescript
const voices = await tts.listVoices('fr-FR');

voices.forEach(voice => {
  console.log(`${voice.name} (${voice.gender}): ${voice.description}`);
});
```

### Modèles

| Modèle | Latence | Qualité | Prix |
|--------|---------|---------|------|
| `tts-1` | Faible (~300ms) | ⭐⭐⭐⭐ | $15 / 1M caractères |
| `tts-1-hd` | Moyenne (~500ms) | ⭐⭐⭐⭐⭐ | $30 / 1M caractères |

### Formats audio

```typescript
// MP3 (défaut, bon compromis)
const mp3 = await tts.synthesize({
  text: '...',
  outputFormat: 'mp3',
});

// Opus (meilleur pour streaming)
const opus = await tts.synthesize({
  text: '...',
  outputFormat: 'opus',
});

// PCM (brut, pour traitement)
const pcm = await tts.synthesize({
  text: '...',
  outputFormat: 'pcm',
});
```

---

## Utilisation dans DomOSServer

```typescript
import { DomOSServer } from '@domos/server';
import { AnthropicAdapter } from '@domos/adapter-anthropic';
import { WhisperSTT, OpenAITTS } from '@domos/adapter-openai';

const server = new DomOSServer({
  // LLM sans audio natif (Claude)
  llm: new AnthropicAdapter({
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY!,
  }),

  // Pipeline hybride : Audio → STT → LLM texte → TTS → Audio
  stt: new WhisperSTT({
    apiKey: process.env.OPENAI_API_KEY!,
    language: 'fr',
  }),

  tts: new OpenAITTS({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'tts-1',
    voice: 'nova',
  }),

  transport: { type: 'websocket', port: 3000 },
  apiKeys: ['pk_demo_local'],
});

server.listen(() => {
  console.log('✅ DomOS with STT/TTS ready');
});
```

---

## Prix & Quotas

### OpenAI Whisper
- **Prix** : $0.006 / minute d'audio
- **Limite** : Pas de limite, pay-as-you-go
- **Durée max** : 25 MB par fichier (~3 heures en MP3)

### OpenAI TTS
- **Prix** :
  - tts-1 : $15 / 1M caractères
  - tts-1-hd : $30 / 1M caractères
- **Limite** : Pas de limite, pay-as-you-go
- **Longueur max** : 4096 caractères par requête

### Exemple de calcul

**Conversation de 5 minutes** :
- Audio client → Whisper : 5 min × $0.006 = $0.03
- LLM (Claude) : ~1000 tokens = $0.003
- TTS → Audio : 200 caractères × $15/1M = $0.003
- **Total : ~$0.036 par conversation vocale**

---

## Validation minimale

```bash
# Compiler le package adapter OpenAI
pnpm --filter @domos/adapter-openai build

# Valider l'integration serveur qui compose ces providers
pnpm --filter @domos/server build
```

---

## Troubleshooting

### Erreur : "Invalid API key"
→ Vérifier `OPENAI_API_KEY` dans `.env`

### Erreur : "Audio file too large"
→ Whisper limite : 25 MB. Compresser ou découper l'audio.

### Latence élevée
→ Utiliser `tts-1` au lieu de `tts-1-hd`

### PCM ne fonctionne pas
→ Vérifier que le `mimeType` inclut le sample rate : `audio/pcm;rate=16000`
