# Speech Services - Provider Implementations

This directory contains the implementations of STT (Speech-to-Text) and TTS (Text-to-Speech) providers.

## Structure

```
providers/
├── WhisperSTT.ts           # OpenAI Whisper STT
├── OpenAITTS.ts            # OpenAI TTS
├── GoogleSTT.ts            # Google Cloud Speech-to-Text
├── GoogleTTS.ts            # Google Cloud Text-to-Speech
├── ElevenLabsTTS.ts        # ElevenLabs TTS
├── AzureSTT.ts             # Azure Speech Services STT (futur)
└── AzureTTS.ts             # Azure Speech Services TTS (futur)
```

## Providers implementes

### Phase 2: STT Providers
- [x] OpenAI Whisper (SPRINT 7C - Phase 2)
- [x] Google Cloud Speech-to-Text (SPRINT 7C - Phase 2)


### Phase 3: TTS Providers
- [x] OpenAI TTS (SPRINT 7C - Phase 3)
- [x] Google Cloud Text-to-Speech (SPRINT 7C - Phase 3)
- [x] ElevenLabs TTS (SPRINT 7C - Phase 3)


### Phase 4 (futur): Azure
- [ ] Azure Speech Services STT
- [ ] Azure Speech Services TTS


## Usage

Each provider extends either `BaseSTTService` or `BaseTTSService` and implements the required methods.

See `../types.ts` for the interfaces and `../STTService.ts` / `../TTSService.ts` for the base classes.

### STT Providers

```typescript
import { WhisperSTT, GoogleSTT } from '@domos/server';

// OpenAI Whisper
const whisper = new WhisperSTT({
  apiKey: process.env.OPENAI_API_KEY!,
  language: 'fr',
});

// Google Cloud Speech-to-Text
const googleSTT = new GoogleSTT({
  apiKey: process.env.GOOGLE_API_KEY!,
  defaultLanguage: 'fr-FR',
  enableAutomaticPunctuation: true,
});
```

### TTS Providers

```typescript
import { OpenAITTS, GoogleTTS, ElevenLabsTTS } from '@domos/server';

// OpenAI TTS
const openaiTTS = new OpenAITTS({
  apiKey: process.env.OPENAI_API_KEY!,
  voice: 'nova',
  model: 'tts-1',
});

// Google Cloud TTS
const googleTTS = new GoogleTTS({
  apiKey: process.env.GOOGLE_API_KEY!,
  voice: 'fr-FR-Neural2-A',
  defaultLanguage: 'fr-FR',
});

// ElevenLabs TTS
const elevenTTS = new ElevenLabsTTS({
  apiKey: process.env.ELEVENLABS_API_KEY!,
  voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
  model: 'eleven_multilingual_v2',
});
```

## Prix & Comparaison

| Provider | Type | Prix | Qualite | Latence |
|----------|------|------|---------|---------|
| OpenAI Whisper | STT | $0.006/min | ★★★★★ | ~1-2s |
| Google Cloud STT | STT | $0.006/15s | ★★★★ | ~1-2s |
| OpenAI TTS | TTS | $15/1M chars | ★★★★ | ~300ms |
| Google Cloud TTS | TTS | $4-16/1M chars | ★★★★ | ~200ms |
| ElevenLabs TTS | TTS | $5+/mois | ★★★★★ | ~500ms |
