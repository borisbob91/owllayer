# Issue GitHub #46 : Sous-chemin Core Media audio

**Issue GitHub** : https://github.com/borisbob91/owllayer/issues/46
**Parent** : https://github.com/borisbob91/owllayer/issues/30
**Statut** : En cours
**Domaine** : Core Media
**Priorité** : Fondation avant les migrations Angular et LiveKit

## Objectif

Rendre les primitives audio maintenues et indépendantes des providers disponibles depuis
`@owllayer/core/media/audio`, sans charger les codecs depuis l'entrée racine
`@owllayer/core`.

## Décision de migration

`packages/core/src/media/audio/` devient l'unique implémentation des helpers PCM,
WAV, Opus et de détection de formats. Les sources correspondantes sont déplacées depuis
`packages/audio/src/` afin d'éviter deux implémentations actives.

Le package `@owllayer/audio` reste temporairement présent, mais son entrée publique devient
un shim qui réexporte `@owllayer/core/media/audio`. Il ne porte plus une implémentation
audio indépendante. Cette issue ne retire ni le workspace, ni les consumers : ces actions
restent respectivement dans #49, #47 et #48.

## Périmètre autorisé

- `packages/core/package.json` et `packages/core/README.md`.
- `packages/core/src/media/audio/**` et les tests Core nécessaires.
- Les sources audio déplacées depuis `packages/audio/src/{decoders,encoders,formats,types}/`.
- `packages/audio/package.json`, `packages/audio/README.md`, `packages/audio/src/index.ts`
  et les tests Audio adaptés au shim de compatibilité.
- `pnpm-lock.yaml` pour les dépendances déplacées entre packages.
- Un Changeset dédié et ce canvas.

## Périmètre interdit

- `packages/angular/`, `packages/adapter-livekit/` et tout autre consumer.
- Suppression du workspace `packages/audio/`.
- Scripts de release, workflows CI et inventaire des packages publics.
- Entrée racine `packages/core/src/index.ts`, AITP, HITL, voice state machine, sessions,
  permissions, codecs nouveaux ou comportement provider.

## Contrat public attendu

```ts
import {
  base64EncodeAudio,
  decodeAudio,
  decodeAudioToFloat32,
  decodeWAVFromBase64,
  decodeWAVFromBuffer,
  getWAVMetadata,
  decodeOpusFromBase64,
  decodeOpusPackets,
  getOpusPacketDuration,
  detectFormatFromBase64,
  detectFormatFromBuffer,
  getMimeType,
  getFormatFromMimeType,
} from '@owllayer/core/media/audio';
```

Les types `AudioData`, `OpusDecodeOptions` et `AudioFormat` font partie du même
sous-chemin. Le contrat historique `@owllayer/audio` conserve ces exports pendant la fenêtre
de compatibilité en les réexportant, sans implémentation propre.

## Contraintes techniques

- L'export `./media/audio` est déclaré explicitement dans `packages/core/package.json` et
  produit ESM et déclarations TypeScript.
- Le build doit produire l'entrée racine et le sous-chemin séparément ; l'entrée racine ne
  doit ni exporter ni importer les codecs audio.
- Le build du shim doit construire Core avant de générer ses déclarations, afin de fonctionner
  depuis un checkout dépourvu d'artefacts `dist`.
- Les dépendances existantes nécessaires au décodage sont déplacées vers Core, sans nouvelle
  dépendance tierce.
- Les commentaires et la logique des helpers déplacés sont conservés, sauf adaptation
  strictement requise par leur nouveau chemin.
- Le shim `@owllayer/audio` dépend de `@owllayer/core` et ne réintroduit pas de source de vérité
  audio.

## Validation requise

- Tests ciblés des comportements PCM, formats/MIME et exports du sous-chemin Core Media.
- Vérification du shim `@owllayer/audio` après un build frais, sans artefact `dist` réutilisé.
- `pnpm --filter @owllayer/core lint`, `test` et `build`.
- `pnpm --filter @owllayer/audio lint`, `test` et `build`.
- Inspection des tarballs, import ESM et déclarations des deux packages.
- `pnpm verify:packages`, `pnpm changeset status` et `git diff --check`.

## Conditions de clôture

- La PR reste limitée à #46 et référence #30.
- Tous les contrôles ciblés et les checks GitHub sont verts.
- Les migrations #47 et #48 ne commencent qu'après le merge de cette PR.
