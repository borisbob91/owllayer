---
mode: agent
description: >
  Sprint LK-02 - Ajouter Gemini TTS comme implementation de TTSService.
---

# Sprint LK-02 - Gemini TTS Service

**Base :** Sprint LK-01.  
**Perimetre :** `TTSService` uniquement, pas AgentSession.  
**Objectif :** livrer une premiere integration utile et faible risque avec Gemini TTS.

## Pourquoi commencer par TTS

Le TTS est plus simple qu'un runtime LiveKit complet:

- une entree texte;
- une voix;
- un audio de sortie;
- integration directe avec `TTSService`;
- visible immediatement dans le dashboard capabilities.

Cela valide aussi la configuration voix ajoutee dans DomOS sans toucher au routing tools.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/adapter-livekit/src/tts/GeminiTTSService.ts` | creer |
| `packages/adapter-livekit/src/tts/geminiVoices.ts` | lister voix connues ou presets |
| `packages/adapter-livekit/src/tts/index.ts` | exporter |
| `packages/adapter-livekit/src/index.ts` | exporter `GeminiTTSService` |
| `packages/adapter-livekit/tests/GeminiTTSService.test.ts` | tests unit/smoke avec fetch mock |
| `packages/server/src/speech/types.ts` | verifier compatibilite seulement |
| `packages/ui/src/dashboard/pages/CapabilitiesPage.tsx` | aucune modification si capabilities standard suffisent |

## Interface attendue

`GeminiTTSService` doit implementer `TTSService`:

- `name = 'gemini-tts'`;
- `synthesize(config: TTSConfig): Promise<TTSResult>`;
- `listVoices(languageCode?: string): Promise<Voice[]>`;
- `isAvailable?()`;
- `getCapabilities?()`.

## Options

```ts
export interface GeminiTTSServiceOptions {
  apiKey?: string;
  model?: string;
  defaultVoice?: string;
  instructions?: string;
  customPronunciations?: Array<{
    phrase: string;
    pronunciation: string;
    phoneticEncoding?: string;
  }>;
}
```

## Mapping DomOS

| DomOS | Gemini TTS |
| --- | --- |
| `TTSConfig.text` | input text |
| `TTSConfig.voice` | `voice` / `voice_name` |
| `TTSConfig.languageCode` | metadata/filter, selon support provider |
| `TTSConfig.speed` | si supporte, sinon metadata ignoree |
| `TTSResult.audioBase64` | audio retourne |
| `TTSResult.mimeType` | mime type provider |

## Gates

- [ ] `GeminiTTSService` compile.
- [ ] `getCapabilities()` retourne model, voix courante et voix disponibles.
- [ ] `runtimeVoiceConfig.ttsVoice` fonctionne avec ce service.
- [ ] Les erreurs provider ne leakent pas la cle API.
- [ ] Tests avec mock HTTP ou mock client provider.
- [ ] Documentation d'usage ajoutee.

