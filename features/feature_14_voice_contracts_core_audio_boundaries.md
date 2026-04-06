# Feature 14 — Sprint 1 : Extraction des contrats voice/speech vers `@domos/core` et clarification des frontières `core` / `audio` / `server` / `adapters`

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-31  
**Sprint** : 2 semaines — 10 jours ouvrés  
**Dépendances** : aucune

---

## Objectif

Construire la base d'architecture commune qui manque aujourd'hui pour la refonte voice/speech/providers.

Ce sprint ne déplace pas encore les providers concrets hors de `packages/server`. Il prépare le terrain en faisant de `packages/core` la source de vérité des contrats partagés et de `packages/audio` la source de vérité de l'infrastructure audio, afin que `packages/server` puisse ensuite redevenir un orchestrateur runtime/composition.

---

## Diagnostic actuel

- `packages/server/src/llm/types.ts` contient encore les contrats LLM et live.
- `packages/server/src/speech/types.ts` contient encore les contrats STT/TTS et `SpeechServiceError`.
- `packages/server/src/llm/BaseLLMAdapter.ts`, `packages/server/src/speech/STTService.ts` et `packages/server/src/speech/TTSService.ts` restent les bases abstraites consommées indirectement par les adapters.
- `packages/server/src/index.ts` exporte encore `BaseLLMAdapter`, `BaseSTTService`, `BaseTTSService` et des providers speech concrets.
- `packages/server/src/standalone/adapters/factory.ts` compose déjà les adapters LLM/live via `@domos/adapter-google` et `@domos/adapter-openai`, mais construit encore STT/TTS via `../../speech/providers/*.ts`.
- `packages/adapter-google` et `packages/adapter-openai` dépendent encore structurellement de `@domos/server` pour les types et bases LLM/live.
- `packages/audio` existe déjà et exporte de la détection de format, du décodage WAV/Opus et des helpers PCM. Le repo réel ne justifie donc plus de centraliser l'infrastructure audio dans `@domos/core`.
- `packages/core` exporte déjà le protocole ADTP, le contexte, les tools, le prompt système, la machine d'état vocale et le runtime agent. C'est le bon domicile pour les contrats partagés voice/speech.

---

## Positionnement MVP du sprint

Sprint 1 est un sprint de fondation.

Le livrable attendu n'est pas une nouvelle capacité produit visible côté client. Le livrable attendu est une topologie de packages propre, stable et testable, sans dépendance inversée `adapter-* -> server` pour les contrats communs.

Le sprint est réussi si l'état cible suivant est atteint :

- `@domos/core` devient la seule source de vérité des contrats LLM/live/STT/TTS partagés.
- `@domos/audio` est explicitement reconnu comme le seul domicile de l'infrastructure audio générique.
- `@domos/server` ne possède plus la définition canonique des contrats partagés, même s'il peut encore offrir une compatibilité transitoire par re-export.
- `@domos/adapter-google` et `@domos/adapter-openai` n'importent plus `@domos/server` pour des types ou classes de base.

---

## Règles de design

- `packages/core` centralise les contrats partagés, les capacités, les erreurs génériques et les bases abstraites réutilisées par plusieurs packages.
- `packages/audio` centralise l'encodage, le décodage, la détection de format, les helpers PCM/WAV/Opus et, si nécessaire, le transcodage générique. Aucune logique réseau provider n'y vit.
- `packages/server` reste responsable de la composition runtime, de la configuration, des factories, de l'orchestration de session et des intégrations transport.
- `packages/adapter-google` et `packages/adapter-openai` consomment `@domos/core` pour les contrats et `@domos/audio` pour l'infrastructure audio. Ils ne doivent pas dépendre structurellement de `@domos/server`.
- Ce sprint n'introduit aucun nouveau provider, aucun changement de protocole ADTP et aucun changement de configuration YAML publique.
- Toute compatibilité transitoire côté `@domos/server` doit être un simple re-export ou shim, jamais une seconde source de vérité.

---

## Codes stables de validation d'architecture

| Code | Déclencheur | Décision attendue |
| --- | --- | --- |
| `VOICE-ARCH-001` | Un adapter importe `@domos/server` pour un contrat partagé ou une base abstraite | Refus du sprint tant que l'import n'est pas rerouté vers `@domos/core` |
| `VOICE-ARCH-002` | Un contrat LLM/live/STT/TTS reste défini canoniquement dans `packages/server/src` | Refus du sprint tant que `@domos/core` n'est pas la source de vérité |
| `VOICE-ARCH-003` | Un helper audio générique nouveau est ajouté dans `server` ou `adapter-*` | Refus du sprint tant que le helper n'est pas déplacé vers `@domos/audio` |
| `VOICE-ARCH-004` | `@domos/server` expose encore une implémentation maison des bases abstraites au lieu de re-exporter `@domos/core` | Compatibilité jugée invalide, correction requise avant clôture |

---

## Découpage du sprint

### Bloc 1 — Sortir les contrats LLM/live de `server`

**startIndex recommandé** : 1

Avant :

- `ChatMessage`, `LLMRequest`, `LLMResponse`, `LLMToolCall`, `LiveAdapter`, `LiveSession`, `LiveSessionConfig`, `LLMAdapterCapabilities`, `LLMModel` et `VoiceInfo` vivent dans `packages/server/src/llm/types.ts`.
- Les adapters Google/OpenAI importent ces types depuis `@domos/server`.

Après :

- Ces contrats vivent dans un module voice dédié de `packages/core/src/voice/`.
- `packages/server/src/llm/types.ts` devient une simple couche de compatibilité interne et publique qui re-exporte `@domos/core`.
- Les adapters importent directement `@domos/core`.

Pourquoi :

- Les contrats LLM/live sont partagés par `server` et par les adapters provider. Ils ne doivent pas être domiciliés dans l'orchestrateur runtime.
- Tant qu'ils vivent dans `server`, chaque adapter reste structurellement dépendant d'une couche qui devrait seulement composer.

Service interface methods concernés :

- `LLMAdapter.chat(request)`
- `LLMAdapter.handleToolResult(callId, result)`
- `LiveAdapter.createSession(config)`
- `LiveSession.sendAudio(audioBase64, mimeType?)`
- `LiveSession.sendText(text)`
- `LiveSession.sendToolResponse(callId, name, result)`
- `LiveSession.endAudioTurn?()`
- `LiveSession.interrupt?()`
- `LiveSession.updateTools?(tools)`
- `LiveSession.close()`

Boilerplate libs à réutiliser :

- `@domos/core` pour `ToolDeclaration`, `ShadowContext`, `SystemPrompt`, `resolveSystemPrompt`
- Aucun ajout de dépendance npm

### Bloc 2 — Sortir les contrats speech et les bases abstraites de `server`

**startIndex recommandé** : 2

Avant :

- `STTAudioConfig`, `STTResult`, `TTSConfig`, `TTSResult`, `Voice`, `SpeechCapabilities`, `SpeechServiceOptions` et `SpeechServiceError` vivent dans `packages/server/src/speech/types.ts`.
- `BaseSTTService` et `BaseTTSService` vivent dans `packages/server/src/speech/`.

Après :

- Les contrats speech et bases abstraites vivent dans `packages/core/src/voice/`.
- `packages/server/src/speech/types.ts`, `STTService.ts` et `TTSService.ts` deviennent des re-exports de compatibilité.
- Le contrat speech exprime explicitement que les helpers audio génériques viennent de `@domos/audio` et non de `server`.

Pourquoi :

- Les implémentations STT/TTS des adapters futurs doivent partager les mêmes contrats sans dépendre de `server`.
- `SpeechServiceError` est un contrat transversal. Il n'a rien à faire dans la couche runtime.

Service interface methods concernés :

- `STTService.transcribe(config)`
- `STTService.isAvailable?()`
- `STTService.getCapabilities?()`
- `TTSService.synthesize(config)`
- `TTSService.listVoices?(languageCode?)`
- `TTSService.isAvailable?()`
- `TTSService.getCapabilities?()`

Boilerplate libs à réutiliser :

- `@domos/audio` pour la détection de format, le décodage et les helpers PCM/WAV/Opus existants
- Aucun helper audio générique recopié dans `core`

### Bloc 3 — Poser une couche de compatibilité transitoire dans `server`

**startIndex recommandé** : 3

Avant :

- `@domos/server` est à la fois l'orchestrateur runtime et la source de vérité des contrats voice/speech.

Après :

- `@domos/server` re-exporte depuis `@domos/core` les contrats et bases abstraites nécessaires à la transition.
- Les imports internes de `packages/server/src/standalone/adapters/factory.ts` et du barrel `packages/server/src/index.ts` sont reroutés vers les exports core.

Pourquoi :

- Cette étape évite un big bang incompatible et découple la correction d'architecture de la migration des providers concrets prévue au Sprint 2.

Service interface methods concernés :

- Aucun nouveau service métier
- Maintien strict des signatures publiques existantes pendant la fenêtre de transition

Boilerplate libs à réutiliser :

- Ré-exports ESM existants
- Aucun alias ad hoc supplémentaire

### Bloc 4 — Casser la dépendance structurelle `adapter-* -> server`

**startIndex recommandé** : 4

Avant :

- `packages/adapter-google/package.json` et `packages/adapter-openai/package.json` déclarent `@domos/server` en dépendance.
- Le code source des adapters importe `BaseLLMAdapter`, `LLMRequest`, `LLMResponse`, `LiveAdapter`, `LiveSessionConfig`, `LLMToolCall`, `LLMAdapterCapabilities` et `VoiceInfo` depuis `@domos/server`.

Après :

- Les packages adapters déclarent `@domos/core` comme dépendance contractuelle principale.
- Les imports source basculent sur `@domos/core`.
- `@domos/server` n'est plus nécessaire pour compiler les adapters LLM/live existants.

Pourquoi :

- Tant que les adapters dépendent de `server`, la frontière cible est fausse même si les fichiers ont été déplacés.

Service interface methods concernés :

- `GoogleAdapter.chat(request)`
- `GoogleAdapter.handleToolResult(callId, result)`
- `GoogleLiveAdapter.createSession(config)`
- `OpenAIAdapter.chat(request)`
- `OpenAIAdapter.handleToolResult(callId, result)`
- `OpenAILiveAdapter.createSession(config)`

Boilerplate libs à réutiliser :

- `@google/genai`
- `openai`
- `@domos/core`

---

## Fichiers ciblés

### `packages/core`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/core/src/voice/contracts.ts` | N'existe pas | Création du module canonique des contrats LLM/live/STT/TTS | Donner un domicile unique aux contrats partagés |
| `packages/core/src/voice/BaseLLMAdapter.ts` | N'existe pas | Création de la base abstraite LLM | Retirer la dépendance des adapters à `server` |
| `packages/core/src/voice/BaseSTTService.ts` | N'existe pas | Création de la base abstraite STT | Préparer la migration des providers speech au Sprint 2 |
| `packages/core/src/voice/BaseTTSService.ts` | N'existe pas | Création de la base abstraite TTS | Préparer la migration des providers speech au Sprint 2 |
| `packages/core/src/voice/index.ts` | N'existe pas | Création d'un barrel voice dédié | Garder une surface d'import stable et lisible |
| `packages/core/src/index.ts` | Exporte ADTP, tools, context, prompt, voice state machine | Exporte aussi le nouveau sous-ensemble voice/speech partagé | Faire de `@domos/core` la porte d'entrée publique des contrats |

### `packages/server`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/server/src/llm/types.ts` | Définit les contrats LLM/live | Devient un shim de compatibilité vers `@domos/core` | Éviter deux sources de vérité |
| `packages/server/src/llm/BaseLLMAdapter.ts` | Contient la base abstraite canonique | Devient un shim de compatibilité vers `@domos/core` | Garder la compatibilité publique sans garder l'autorité de définition |
| `packages/server/src/speech/types.ts` | Définit les contrats STT/TTS | Devient un shim de compatibilité vers `@domos/core` | Préparer la migration des providers |
| `packages/server/src/speech/STTService.ts` | Contient la base abstraite canonique STT | Devient un shim de compatibilité vers `@domos/core` | Découpler la base speech du runtime |
| `packages/server/src/speech/TTSService.ts` | Contient la base abstraite canonique TTS | Devient un shim de compatibilité vers `@domos/core` | Découpler la base speech du runtime |
| `packages/server/src/speech/index.ts` | Re-exporte types, bases et providers depuis `server` | Re-exporte les types/bases depuis `@domos/core`, garde les providers existants transitoirement | Séparer les contrats de la présence temporaire des providers |
| `packages/server/src/standalone/adapters/factory.ts` | Type local fondé sur `server` + imports speech concrets internes | Continue à construire les mêmes providers en Sprint 1, mais tape contre les contrats `@domos/core` | Préparer Sprint 2 sans casser la composition |
| `packages/server/src/index.ts` | Source mixte de runtime, bases et contrats | Reroute les contrats/bases vers `@domos/core`, conserve la compatibilité publique | Faire de `server` un orchestrateur, pas un référentiel de contrats |

### `packages/adapter-google`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/adapter-google/package.json` | Déclare `@domos/server` comme dépendance | Déclare `@domos/core` comme dépendance contractuelle | Supprimer la dépendance inversée |
| `packages/adapter-google/src/GoogleAdapter.ts` | Importe base et types depuis `@domos/server` | Importe base et types depuis `@domos/core` | Aligner le package sur sa vraie dépendance de contrat |
| `packages/adapter-google/src/GoogleLiveAdapter.ts` | Importe types live depuis `@domos/server` | Importe types live depuis `@domos/core` | Aligner le package sur sa vraie dépendance de contrat |

### `packages/adapter-openai`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/adapter-openai/package.json` | Déclare `@domos/server` comme dépendance | Déclare `@domos/core` comme dépendance contractuelle | Supprimer la dépendance inversée |
| `packages/adapter-openai/src/OpenAIAdapter.ts` | Importe base et types depuis `@domos/server` | Importe base et types depuis `@domos/core` | Aligner le package sur sa vraie dépendance de contrat |
| `packages/adapter-openai/src/OpenAILiveAdapter.ts` | Importe types live depuis `@domos/server` | Importe types live depuis `@domos/core` | Aligner le package sur sa vraie dépendance de contrat |

---

## Périmètre strict

- Extraire les contrats LLM/live/STT/TTS partagés vers `packages/core`.
- Extraire les bases abstraites LLM/STT/TTS vers `packages/core`.
- Maintenir une compatibilité transitoire côté `packages/server` par re-export simple.
- Retirer la dépendance des adapters à `@domos/server` pour les contrats et bases.
- Formaliser explicitement la frontière `@domos/audio = infra audio générique` dans le plan et dans les points de contrôle.

## Hors scope

- Déplacer `GoogleSTT`, `GoogleTTS`, `WhisperSTT`, `OpenAITTS` ou `ElevenLabsTTS` hors de `packages/server`.
- Modifier les providers YAML publics (`google`, `openai`, `whisper`, `elevenlabs`).
- Modifier ADTP, `VoiceStateMachine` ou les SDK frontend.
- Réécrire l'infrastructure audio existante de `@domos/audio`.
- Ajouter une dépendance npm nouvelle.

---

## Gate de fin de sprint

- `@domos/core` exporte l'ensemble des contrats et bases abstraites voice/speech partagés.
- `packages/adapter-google` et `packages/adapter-openai` ne dépendent plus de `@domos/server` pour compiler les adapters existants.
- `packages/server/src/llm/types.ts` et `packages/server/src/speech/types.ts` ne sont plus la source de vérité, uniquement des re-exports de compatibilité.
- Aucun helper audio générique nouveau n'a été ajouté dans `server` ou `adapter-*`.
- `pnpm --filter @domos/core build`, `pnpm --filter @domos/server build`, `pnpm --filter @domos/adapter-google build` et `pnpm --filter @domos/adapter-openai build` passent.

---

## Plan journalier — 10 jours ouvrés

| Jour | Tâches concrètes | Livrables attendus | Risques / points de validation |
| --- | --- | --- | --- |
| Jour 1 | Faire l'inventaire final des contrats LLM/live/STT/TTS et des imports `@domos/server` dans les adapters | Cartographie validée des contrats à extraire et des fichiers exacts à toucher | Vérifier qu'aucun contrat partagé n'est oublié, notamment `VoiceInfo`, `SpeechCapabilities` et `SpeechServiceError` |
| Jour 2 | Concevoir la structure cible dans `packages/core/src/voice/` et figer le barrel public | Schéma de fichiers cible validé pour `contracts.ts`, bases abstraites et barrel voice | Ne pas inventer une arborescence trop profonde ou exotique qui n'existe nulle part ailleurs dans `core` |
| Jour 3 | Déplacer les contrats LLM/live dans `@domos/core` et aligner les exports | Contrats LLM/live disponibles depuis `@domos/core` | Vérifier que `resolveSystemPrompt`, `ToolDeclaration`, `ShadowContext` et `SystemPrompt` restent résolus sans cycle |
| Jour 4 | Déplacer les contrats speech et `SpeechServiceError` dans `@domos/core` | Contrats STT/TTS disponibles depuis `@domos/core` | Vérifier que `VoiceInfo` n'est plus redéfini localement dans `speech/types.ts` |
| Jour 5 | Déplacer `BaseLLMAdapter`, `BaseSTTService` et `BaseTTSService` dans `@domos/core` | Bases abstraites partagées compilables depuis `@domos/core` | Contrôler que les helpers internes des bases ne tirent pas de dépendance runtime vers `server` |
| Jour 6 | Transformer `packages/server/src/llm/*` et `packages/server/src/speech/*` ciblés en couches de compatibilité | `server` compile en consommant les contrats du `core` | Interdire toute logique métier résiduelle dans les shims de compatibilité |
| Jour 7 | Basculer `adapter-google` sur `@domos/core` et nettoyer sa dépendance package | `@domos/adapter-google` compile sans `@domos/server` | Valider les imports `BaseLLMAdapter`, `LiveAdapter`, `LLMAdapterCapabilities` et `VoiceInfo` |
| Jour 8 | Basculer `adapter-openai` sur `@domos/core` et nettoyer sa dépendance package | `@domos/adapter-openai` compile sans `@domos/server` | Valider les imports `BaseLLMAdapter`, `LiveAdapter`, `LLMRequest`, `LLMResponse` et `LLMToolCall` |
| Jour 9 | Réaligner `packages/server/src/index.ts`, `speech/index.ts` et `standalone/adapters/factory.ts` sur les nouveaux exports | Surface publique `@domos/server` cohérente et transitoire | Vérifier qu'aucune régression publique involontaire n'est introduite avant Sprint 2 |
| Jour 10 | Lancer la matrice de build ciblée, documenter les points de migration et fermer les écarts restants | Sprint 1 prêt à merger avec gate validée | Bloquer la clôture si un adapter importe encore `@domos/server` ou si `server` reste source de vérité des contrats |

---

## Hypothèses ouvertes

- Hypothèse validable : un seul module `packages/core/src/voice/contracts.ts` suffit et évite une dispersion inutile des types.
- Hypothèse validable : la compatibilité transitoire côté `@domos/server` doit durer un sprint d'implémentation complet, pas davantage.
- Hypothèse non tranchée ici : le traitement exact des warnings de dépréciation publics sera défini au moment de la migration du Sprint 2.

---

## Ordre de livraison recommandé

1. Sortir d'abord les contrats LLM/live puis les bases abstraites, parce que ce sont les dépendances de compilation des adapters existants.
2. Sortir ensuite les contrats speech, pour préparer le Sprint 2 sans bouger encore les providers concrets.
3. Ne transformer `server` qu'après disponibilité complète des exports `core`, afin d'éviter les cycles et les doubles sources de vérité.
4. Fermer le sprint seulement après build croisé de `core`, `server`, `adapter-google` et `adapter-openai`.
