# Speech Services - Provider Runtime Notes

Depuis le Sprint 2 voice provider migration, `packages/server/src/speech/providers` n'est plus le domicile des providers Google/OpenAI pour le speech.

Etat cible actuel :

- `@domos/adapter-google` porte `GoogleSTT` et `GoogleTTS`
- `@domos/adapter-openai` porte `WhisperSTT` et `OpenAITTS`
- `@domos/server` garde seulement `ElevenLabsTTS` dans ce dossier, en attendant une feature dediee pour un adapter propre

## Ce qui reste dans ce dossier

```text
providers/
├── ElevenLabsTTS.ts        # Exception temporaire encore domiciliee dans server
├── GoogleSTT.ts            # Shim de compatibilite -> @domos/adapter-google
├── GoogleTTS.ts            # Shim de compatibilite -> @domos/adapter-google
├── WhisperSTT.ts           # Shim de compatibilite -> @domos/adapter-openai
└── OpenAITTS.ts            # Shim de compatibilite -> @domos/adapter-openai
```

## Usage recommande

```ts
import { GoogleSTT, GoogleTTS } from '@domos/adapter-google';
import { WhisperSTT, OpenAITTS } from '@domos/adapter-openai';
import { ElevenLabsTTS } from '@domos/server';
```

## Decision d'architecture

- `server` compose et orchestre
- `adapter-google` et `adapter-openai` hebergent les implementations providers concretes
- `core` garde les contrats et bases abstraites
- `audio` garde l'infrastructure audio generique

Le cas `ElevenLabsTTS` reste explicitement hors migration complete dans ce sprint.
