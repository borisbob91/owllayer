# Speech Services - Provider Runtime Notes

Depuis la migration voice/speech, ce dossier ne garde plus que les providers encore reellement domicilies dans `@owllayer/server`.

Etat cible actuel :

- `@owllayer/adapter-google` porte `GoogleSTT` et `GoogleTTS`
- `@owllayer/adapter-openai` porte `WhisperSTT` et `OpenAITTS`
- `@owllayer/server` garde seulement `ElevenLabsTTS` dans ce dossier, en attendant une feature dediee pour un adapter propre

## Ce qui reste dans ce dossier

```text
providers/
└── ElevenLabsTTS.ts        # Exception temporaire encore domiciliee dans server
```

## Usage recommande

```ts
import { GoogleSTT, GoogleTTS } from '@owllayer/adapter-google';
import { WhisperSTT, OpenAITTS } from '@owllayer/adapter-openai';
import { ElevenLabsTTS } from '@owllayer/server';
```

## Decision d'architecture

- `server` compose et orchestre
- `adapter-google` et `adapter-openai` hebergent les implementations providers concretes
- `core` garde les contrats et bases abstraites
- `audio` garde l'infrastructure audio generique

Le cas `ElevenLabsTTS` reste explicitement hors migration complete dans ce sprint.
