# Feature 16 — Sprint 3 : Gate finale de validation de la topologie voice `@domos/core` / `@domos/audio` / `@domos/server` / `adapter-*`

**Statut** : 🟢 Livrée   
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-31  
**Sprint** : 2 semaines — 10 jours ouvrés  
**Dépendances** : feature_14_voice_contracts_core_audio_boundaries.md, feature_15_voice_provider_migration_server_composition.md

---

## Objectif

Fermer la trajectoire voice ouverte par les Sprints 1 et 2 avec un sprint de revue, de purge et de gate final, sans réouvrir une migration structurelle majeure.

Le but de Sprint 3 n'est pas de redéplacer massivement des providers. Le but est de prouver, à partir du repo réel, que la topologie cible est effectivement atteinte, que `@domos/server` est bien redevenu un orchestrateur/composition runtime, que les adapters ne dépendent plus de `server` pour leurs contrats voice/providers, et que le reliquat éventuel de provider non migré est explicite, assumé et documenté.

---

## Diagnostic actuel

Au 31 mars 2026, le repo réel montre encore plusieurs écarts qui justifient un Sprint 3 traité comme un gate strict, et non comme une simple formalité de clôture :

- `packages/server/src/llm/types.ts` reste le domicile effectif des contrats `LLMRequest`, `LLMResponse`, `LLMToolCall`, `LiveAdapter`, `LiveSessionConfig`, `LLMAdapterCapabilities` et `VoiceInfo`.
- `packages/server/src/speech/types.ts` reste le domicile effectif des contrats `STTService`, `TTSService`, `SpeechCapabilities` et `SpeechServiceError`.
- `packages/core/src/index.ts` expose aujourd'hui la machine d'état vocale, mais n'expose pas encore une surface publique voice/speech partagée couvrant les contrats et bases abstraites décrits dans la feature 14.
- `packages/adapter-google/package.json` et `packages/adapter-openai/package.json` dépendent encore de `@domos/server`.
- `packages/adapter-google/src/GoogleAdapter.ts`, `packages/adapter-google/src/GoogleLiveAdapter.ts`, `packages/adapter-openai/src/OpenAIAdapter.ts` et `packages/adapter-openai/src/OpenAILiveAdapter.ts` importent encore leurs contrats et bases depuis `@domos/server`.
- `packages/server/src/standalone/adapters/factory.ts` compose bien les adapters LLM/live via `@domos/adapter-google` et `@domos/adapter-openai`, mais construit encore `GoogleSTT`, `GoogleTTS`, `WhisperSTT`, `OpenAITTS` et `ElevenLabsTTS` depuis `packages/server/src/speech/providers/`.
- `packages/server/src/index.ts` et `packages/server/src/speech/index.ts` continuent d'exporter les providers speech concrets depuis `server`.
- `docs/CUSTOM_ADAPTER.md` continue d'enseigner un import de `BaseLLMAdapter`, `LLMRequest` et `LLMResponse` depuis `@domos/server`, ce qui contredit la cible d'architecture des features 14 et 15.
- `packages/server/src/STT-TTS-INTEGRATION.md`, `packages/server/src/speech/providers/README.md` et `packages/server/src/speech/providers/README-OpenAI.md` documentent encore les providers Google/OpenAI comme résidant dans `server`.
- Aucun package `adapter-elevenlabs` n'existe dans le repo réel. `ElevenLabsTTS` reste donc le cas limite qu'il faut traiter explicitement au lieu de le laisser dans un angle mort.

Conclusion de diagnostic : si ces écarts existent encore au démarrage du Sprint 3, le sprint s'ouvre en mode bloquant. Il documente l'échec du gate et renvoie la correction structurelle vers les features 14 et 15 au lieu d'absorber silencieusement la dette.

---

## Positionnement MVP du sprint

Sprint 3 est un sprint de validation finale et de réduction de dette transitoire, pas un sprint de nouvelle migration provider.

Le livrable attendu n'est pas une capacité produit visible. Le livrable attendu est une décision d'architecture objectivable, appuyée par le graphe d'imports, le graphe de dépendances `package.json`, les barrels publics, les builds/tests ciblés et la documentation.

Le sprint est réussi si l'état cible suivant est atteint :

- la topologie finale `core = contrats`, `audio = infrastructure audio générique`, `server = runtime/composition`, `adapter-* = logique provider spécifique` est prouvable dans le code réel ;
- aucun adapter Google/OpenAI n'importe `@domos/server` pour des contrats, classes de base ou providers ;
- `@domos/server` n'expose plus de re-exports transitoires injustifiés ni de providers Google/OpenAI qui devraient vivre dans `adapter-*` ;
- les dépendances `package.json` reflètent les imports réels ;
- les builds/tests ciblés des packages touchés sont exécutés et interprétés ;
- le statut final de `ElevenLabsTTS` ou de tout provider non migré est explicite ;
- la règle d'architecture finale est figée dans la documentation existante utile, sans créer de documentation décorative.

---

## Règles de design

- Sprint 3 valide, purge et documente. Il ne lance pas une nouvelle vague de migration de providers non prévue par les features 14 et 15.
- `packages/core` et `packages/audio` sont des entrées de validation de topologie dans ce sprint, pas des zones de refactor libres. Si leur état réel ne permet pas de passer le gate, Sprint 3 doit le signaler et bloquer la clôture.
- `packages/server` reste limité à l'orchestration runtime, aux factories, à la configuration, au transport et à la composition.
- Un re-export transitoire dans `server` n'est acceptable que s'il répond à un besoin de compatibilité externe démontré. Un re-export juste “au cas où” doit être supprimé.
- `packages/adapter-google` et `packages/adapter-openai` importent leurs contrats depuis `@domos/core` et l'infrastructure audio générique depuis `@domos/audio`, jamais depuis `@domos/server`.
- `packages/server/src/standalone/adapters/factory.ts` compose les providers migrés via `adapter-*`. Il ne recharge pas localement sous `server` un provider déjà domicilié ailleurs.
- `ElevenLabsTTS` ne doit pas être maquillé comme “déjà migré” tant qu'aucun package dédié n'existe. Son statut doit être soit exception explicitement maintenue, soit dette formalisée pour une feature ultérieure.
- Toute documentation qui montre des imports d'architecture faux doit être corrigée ou retirée dans le même sprint. Un gate final avec une doc mensongère n'est pas un gate.
- Aucun nouveau package npm n'est ajouté dans ce sprint.

---

## Codes stables de validation

| Code | Déclencheur | Décision attendue |
| --- | --- | --- |
| `VOICE-GATE-001` | La topologie finale `core/audio/server/adapter-*` n'est pas prouvable à partir du code réel | Refus de clôture du sprint et retour explicite vers la feature 14 ou 15 concernée |
| `VOICE-GATE-002` | Un adapter Google/OpenAI importe `@domos/server` pour des contrats, bases abstraites ou providers | Refus du sprint tant que l'import n'est pas rerouté vers `@domos/core` ou `@domos/audio` |
| `VOICE-GATE-003` | `packages/adapter-google/package.json` ou `packages/adapter-openai/package.json` dépend encore de `@domos/server` sans nécessité runtime démontrée | Refus du sprint tant que le graphe de dépendances n'est pas aligné sur le graphe d'imports |
| `VOICE-GATE-004` | `packages/server/src/standalone/adapters/factory.ts` importe encore Google/OpenAI speech depuis `../../speech/providers/*.js` | Refus du sprint tant que la composition runtime n'est pas branchée sur `adapter-*` pour les providers migrés |
| `VOICE-GATE-005` | `packages/server/src/index.ts` ou `packages/server/src/speech/index.ts` exposent encore des providers Google/OpenAI migrés ou des re-exports transitoires non justifiés | Refus du sprint tant que la surface publique `server` n'est pas cohérente |
| `VOICE-GATE-006` | Les builds/tests ciblés des packages touchés échouent, ou ne sont pas exécutés/documentés | Refus du sprint tant que la matrice de validation n'est pas verte ou explicitement expliquée |
| `VOICE-GATE-007` | Le statut de `ElevenLabsTTS` ou d'un provider non migré reste ambigu | Refus du sprint tant qu'une décision explicite n'est pas écrite |
| `VOICE-GATE-008` | La documentation continue à prescrire des imports ou des domiciles d'architecture faux | Refus du sprint tant que la doc visible par les contributeurs n'est pas réalignée |

---

## Découpage du sprint

### Bloc 1 — Valider la topologie finale réelle et ses invariants

**startIndex recommandé** : 1

Avant :

- la cible d'architecture est documentée dans les features 14 et 15, mais elle n'est pas encore prouvée par le repo réel ;
- des contrats et providers vivent encore sous `server` ;
- les adapters continuent à dépendre de `server` pour des éléments qu'ils ne devraient pas y chercher.

Après :

- une matrice d'invariants permet d'attester ou de refuser la topologie cible à partir des sources, des barrels publics et des `package.json` ;
- tout écart observé est classé sous un code stable `VOICE-GATE-*` et rattaché sans ambiguïté à la feature 14 ou 15 si la correction est encore structurelle.

Pourquoi :

- un sprint de gate final n'a de valeur que si le verdict repose sur des preuves techniques, pas sur une impression.

Service interface methods concernés :

- `buildAdapters(config)`
- `buildLLMAdapter(config)`
- `buildLiveAdapter(config)`
- `buildSTT(config)`
- `buildTTS(config)`
- `LLMAdapter.chat(request)`
- `LiveAdapter.createSession(config)`
- `STTService.transcribe(config)`
- `TTSService.synthesize(config)`

Boilerplate libs à réutiliser :

- `@domos/core`
- `@domos/audio`
- imports ESM dynamiques déjà présents dans `server`
- aucun ajout de dépendance npm

### Bloc 2 — Purger les re-exports transitoires et la fausse surface publique de `server`

**startIndex recommandé** : 2

Avant :

- `packages/server/src/index.ts` et `packages/server/src/speech/index.ts` exposent encore des providers speech concrets depuis `server` ;
- les fichiers `packages/server/src/llm/types.ts`, `packages/server/src/llm/BaseLLMAdapter.ts`, `packages/server/src/speech/types.ts`, `packages/server/src/speech/STTService.ts` et `packages/server/src/speech/TTSService.ts` peuvent encore jouer le rôle de faux domicile public au lieu d'une simple compatibilité strictement contrôlée.

Après :

- `server` n'expose plus que la composition runtime, les points d'entrée nécessaires et, le cas échéant, une compatibilité résiduelle explicitement justifiée ;
- les providers Google/OpenAI migrés ne sont plus exportés depuis `server` ;
- toute couche de compatibilité restante est minimale, non canonique et non consommée par les adapters.

Pourquoi :

- tant que `server` reste publiquement perçu comme un package provider, la refonte n'est pas finie même si les fichiers ont bougé.

Service interface methods concernés :

- `buildAdapters(config)`
- `createDomOSServer(config)`
- signatures publiques `BaseLLMAdapter`, `BaseSTTService`, `BaseTTSService` seulement si une compatibilité documentée est encore requise

Boilerplate libs à réutiliser :

- barrels ESM existants
- aucun wrapper ad hoc supplémentaire

### Bloc 3 — Verrouiller les dépendances `package.json` et les imports croisés adapter → core/audio

**startIndex recommandé** : 3

Avant :

- `packages/adapter-google` et `packages/adapter-openai` dépendent encore de `@domos/server` ;
- leurs sources importent encore des contrats et bases voice depuis `@domos/server`.

Après :

- les dépendances des adapters reflètent uniquement leurs besoins réels : `@domos/core`, `@domos/audio` et les SDK provider ;
- le graphe d'imports des adapters ne contient plus de dépendance structurelle vers `server` ;
- si un import `@domos/server` subsiste, il doit être considéré comme un échec du gate et non comme un compromis silencieux.

Pourquoi :

- la topologie cible n'existe réellement que lorsque le graphe de compilation et le graphe de dépendances racontent la même histoire.

Service interface methods concernés :

- `GoogleAdapter.chat(request)`
- `GoogleLiveAdapter.createSession(config)`
- `OpenAIAdapter.chat(request)`
- `OpenAILiveAdapter.createSession(config)`
- `GoogleSTT.transcribe(config)` si le provider existe déjà dans `adapter-google`
- `GoogleTTS.synthesize(config)` si le provider existe déjà dans `adapter-google`
- `WhisperSTT.transcribe(config)` si le provider existe déjà dans `adapter-openai`
- `OpenAITTS.synthesize(config)` si le provider existe déjà dans `adapter-openai`

Boilerplate libs à réutiliser :

- `@domos/core`
- `@domos/audio`
- `@google/genai`
- `openai`

### Bloc 4 — Figer le statut des providers restants et réaligner la documentation utile

**startIndex recommandé** : 4

Avant :

- `ElevenLabsTTS` reste présent dans `server` sans décision finale d'architecture ;
- la documentation adapter/provider continue de prescrire des imports faux depuis `@domos/server`.

Après :

- `ElevenLabsTTS` est traité explicitement comme exception documentée ou dette ouverte vers une feature dédiée, jamais comme un reste implicite ;
- `docs/CUSTOM_ADAPTER.md` reflète la règle finale d'import des contrats ;
- `packages/server/src/STT-TTS-INTEGRATION.md` et les README providers ne racontent plus une architecture obsolète.

Pourquoi :

- si la doc officielle ment, les prochains contributeurs reconstruiront la dette que le sprint prétend avoir fermée.

Service interface methods concernés :

- `ElevenLabsTTS.synthesize(config)`
- `ElevenLabsTTS.listVoices?(languageCode?)`

Boilerplate libs à réutiliser :

- documentation existante dans `docs/` et `packages/server/src/`
- aucun nouveau package ni nouvel espace documentaire inutile

### Bloc 5 — Exécuter la matrice build/test ciblée et rendre le verdict du gate

**startIndex recommandé** : 5

Avant :

- la trajectoire voice peut paraître cohérente localement sans être validée par une matrice de build/test suffisante ;
- les packages touchés n'ont pas encore tous un verdict exploitable.

Après :

- la matrice minimale de validation est exécutée et archivée ;
- les commandes qui échouent ou manquent sont documentées explicitement ;
- le sprint se ferme avec un verdict binaire : gate validé ou gate bloqué.

Pourquoi :

- un gate final sans compilation ni test ciblés n'est qu'une revue d'intention.

Service interface methods concernés :

- aucun nouveau service métier ; validation transversale de la surface publique et de la composition runtime existantes

Boilerplate libs à réutiliser :

- scripts `build`, `test` et `lint` déjà présents dans les packages concernés
- `pnpm --filter`

---

## Fichiers ciblés

### `packages/server`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/server/src/index.ts` | Exporte encore contrats, bases abstraites, runtime et providers speech concrets | Ne garde que la surface publique runtime/composition et les compatibilités strictement justifiées | Rendre `server` cohérent avec son rôle d'orchestrateur |
| `packages/server/src/speech/index.ts` | Mélange types, bases et providers concrets | Cesse d'être un point d'entrée public pour les providers migrés ; garde uniquement ce qui reste légitime côté `server` | Supprimer le faux domicile provider |
| `packages/server/src/standalone/adapters/factory.ts` | Compose Google/OpenAI speech depuis `../../speech/providers/*.js` | Compose les providers migrés via `adapter-*` et isole explicitement le cas restant éventuel comme `ElevenLabsTTS` | Aligner la composition runtime sur la topologie cible |
| `packages/server/src/llm/types.ts` | Reste une définition publique ou pseudo-canonique des contrats LLM/live | Devient un shim minimal justifié, ou cesse d'être exposé publiquement si la compatibilité n'est pas requise | Purger la source de vérité résiduelle dans `server` |
| `packages/server/src/llm/BaseLLMAdapter.ts` | Peut encore être consommé comme base principale depuis `server` | Est réduit à une compatibilité documentée ou retiré de la surface publique | Empêcher les adapters de dépendre encore de `server` |
| `packages/server/src/speech/types.ts` | Définit ou expose encore les contrats speech comme s'ils vivaient dans `server` | Devient un shim strictement contrôlé ou sort de la surface publique | Fermer la dette transitoire voice/speech |
| `packages/server/src/speech/STTService.ts` | Reste un point d'entrée base STT public depuis `server` | N'est conservé que si une compatibilité externe démontrée l'impose | Réduire `server` à son rôle réel |
| `packages/server/src/speech/TTSService.ts` | Reste un point d'entrée base TTS public depuis `server` | N'est conservé que si une compatibilité externe démontrée l'impose | Réduire `server` à son rôle réel |
| `packages/server/package.json` | Peut conserver des dépendances provider héritées des anciens providers locaux | Ne garde que les dépendances runtime effectivement nécessaires au `server` final | Aligner le graphe npm sur le graphe de code |
| `packages/server/src/speech/providers/GoogleSTT.ts` | Implémentation concrète encore présente dans `server` si Sprint 2 n'a pas totalement purgé | N'a plus vocation à vivre sous `server` une fois la migration Google fermée | Clore la dette de domicile Google |
| `packages/server/src/speech/providers/GoogleTTS.ts` | Implémentation concrète encore présente dans `server` si Sprint 2 n'a pas totalement purgé | N'a plus vocation à vivre sous `server` une fois la migration Google fermée | Clore la dette de domicile Google |
| `packages/server/src/speech/providers/WhisperSTT.ts` | Implémentation concrète encore présente dans `server` si Sprint 2 n'a pas totalement purgé | N'a plus vocation à vivre sous `server` une fois la migration OpenAI fermée | Clore la dette de domicile OpenAI |
| `packages/server/src/speech/providers/OpenAITTS.ts` | Implémentation concrète encore présente dans `server` si Sprint 2 n'a pas totalement purgé | N'a plus vocation à vivre sous `server` une fois la migration OpenAI fermée | Clore la dette de domicile OpenAI |
| `packages/server/src/speech/providers/ElevenLabsTTS.ts` | Provider restant ambigu dans `server` | Est explicitement conservé comme exception documentée ou basculé vers une feature dédiée ultérieure, jamais maquillé | Traiter proprement le reliquat non migré |
| `packages/server/src/STT-TTS-INTEGRATION.md` | Continue à documenter des imports/providers faux depuis `server` | Raconte la topologie finale réelle ou est réduit à ce qui reste valide | Éviter une documentation d'intégration mensongère |
| `packages/server/src/speech/providers/README.md` | Documente `server` comme domicile central des providers speech | Est réaligné sur la topologie finale ou retiré si devenu trompeur | Éviter la reconstruction de dette via la doc |
| `packages/server/src/speech/providers/README-OpenAI.md` | Présente encore les providers OpenAI speech comme publics depuis `server` | Est réaligné sur `adapter-openai` ou retiré si obsolète | Faire correspondre la doc à la réalité |

### `packages/adapter-google`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/adapter-google/package.json` | Dépend encore de `@domos/server` | Dépend de `@domos/core`, de `@domos/audio` si nécessaire et du SDK provider, sans dépendance structurelle à `server` | Fermer la dépendance inversée |
| `packages/adapter-google/src/GoogleAdapter.ts` | Importe la base et les contrats LLM depuis `@domos/server` | Importe uniquement depuis `@domos/core` pour les contrats partagés | Aligner l'adapter sur son vrai contrat |
| `packages/adapter-google/src/GoogleLiveAdapter.ts` | Importe les contrats live/capabilities depuis `@domos/server` | Importe uniquement depuis `@domos/core` pour les contrats partagés | Aligner l'adapter sur son vrai contrat |
| `packages/adapter-google/src/index.ts` | N'exporte aujourd'hui que texte/live | Exporte aussi les providers speech Google s'ils ont été créés par Sprint 2, et ne dépend d'aucun export `server` | Donner un point d'entrée provider cohérent |

### `packages/adapter-openai`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/adapter-openai/package.json` | Dépend encore de `@domos/server` | Dépend de `@domos/core`, de `@domos/audio` si nécessaire et du SDK provider, sans dépendance structurelle à `server` | Fermer la dépendance inversée |
| `packages/adapter-openai/src/OpenAIAdapter.ts` | Importe la base et les contrats LLM depuis `@domos/server` | Importe uniquement depuis `@domos/core` pour les contrats partagés | Aligner l'adapter sur son vrai contrat |
| `packages/adapter-openai/src/OpenAILiveAdapter.ts` | Importe les contrats live/capabilities depuis `@domos/server` | Importe uniquement depuis `@domos/core` pour les contrats partagés | Aligner l'adapter sur son vrai contrat |
| `packages/adapter-openai/src/index.ts` | N'exporte aujourd'hui que texte/live | Exporte aussi les providers speech OpenAI s'ils ont été créés par Sprint 2, et ne dépend d'aucun export `server` | Donner un point d'entrée provider cohérent |

### `docs`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `docs/CUSTOM_ADAPTER.md` | Recommande encore d'importer `BaseLLMAdapter`, `LLMRequest` et `LLMResponse` depuis `@domos/server` | Fige la règle finale : contrats partagés depuis `@domos/core`, jamais depuis `@domos/server` pour créer un adapter | Empêcher la reconstitution de la dette à la source |

---

## Périmètre strict

- valider la topologie finale `core/audio/server/adapter-*` à partir des fichiers, imports, exports et `package.json` réels ;
- purger les re-exports transitoires injustifiés dans `server` ;
- valider et corriger les dépendances `package.json` des packages `server`, `adapter-google` et `adapter-openai` si elles ne correspondent plus à la réalité du code ;
- valider et corriger les imports croisés pour garantir `adapter-* -> core/audio`, jamais `adapter-* -> server` pour les contrats/providers ;
- exécuter la matrice build/test ciblée des packages touchés et documenter le verdict ;
- trancher explicitement le statut restant de `ElevenLabsTTS` ou de tout provider non migré ;
- réaligner la documentation utile qui expose encore l'ancienne architecture ;
- documenter les écarts bloquants sous forme de codes `VOICE-GATE-*` quand le repo réel n'est pas encore au niveau attendu.

## Hors scope

- créer un nouveau package `adapter-elevenlabs` sans feature dédiée ;
- lancer une nouvelle migration majeure de provider au-delà de Google/OpenAI déjà couverts par la feature 15 ;
- refaire la feature 14 dans `packages/core` ou `packages/audio` si ses prérequis ne sont pas réellement livrés ;
- changer le protocole ADTP, les SDK frontend, la machine d'état vocale ou la configuration publique YAML ;
- ajouter des dépendances npm nouvelles ;
- transformer Sprint 3 en refactor global de documentation au-delà des pages directement mensongères pour les contributors voice.

---

## Gate de fin de sprint

- aucun import `@domos/server` ne subsiste dans `packages/adapter-google/src/` et `packages/adapter-openai/src/` pour des contrats, bases abstraites ou providers ;
- `packages/adapter-google/package.json` et `packages/adapter-openai/package.json` ne dépendent plus structurellement de `@domos/server` ;
- `packages/server/src/standalone/adapters/factory.ts` ne compose plus Google/OpenAI speech via `../../speech/providers/*.js` ;
- `packages/server/src/index.ts` et `packages/server/src/speech/index.ts` n'exposent plus les providers migrés Google/OpenAI ni de re-exports transitoires non justifiés ;
- le statut de `ElevenLabsTTS` est explicitement écrit, acceptable et traçable ;
- `docs/CUSTOM_ADAPTER.md`, `packages/server/src/STT-TTS-INTEGRATION.md` et les README providers touchés ne contredisent plus la topologie finale ;
- les commandes minimales de validation passent ou sont explicitement documentées si un package n'expose pas encore de script de test ;
- à la date du document, `@domos/adapter-openai` n'expose pas de script `test` ; si cette absence persiste au moment du gate, elle doit être documentée explicitement dans le verdict de validation.
- `pnpm --filter @domos/core build`
- `pnpm --filter @domos/audio build`
- `pnpm --filter @domos/server build`
- `pnpm --filter @domos/adapter-google build`
- `pnpm --filter @domos/adapter-openai build`
- `pnpm --filter @domos/core test`
- `pnpm --filter @domos/audio test`
- `pnpm --filter @domos/server test`
- `pnpm --filter @domos/adapter-google test`

---

## Plan journalier — 10 jours ouvrés

| Jour | Tâches concrètes | Livrables attendus | Risques / points de validation |
| --- | --- | --- | --- |
| Jour 1 | Cartographier le graphe réel des imports/exports voice entre `core`, `audio`, `server`, `adapter-google` et `adapter-openai` | Matrice de topologie initiale avec chaque écart codé `VOICE-GATE-*` | Risque principal : se fier aux features 14/15 sans vérifier le repo réel |
| Jour 2 | Vérifier les `package.json` et la cohérence entre dépendances déclarées et imports source | Tableau de dépendances cibles pour `server`, `adapter-google`, `adapter-openai` | Point de validation : aucune dépendance transitive masquant encore une dépendance inversée |
| Jour 3 | Nettoyer les imports `adapter-google` et rerouter les contrats vers `@domos/core` et l'audio générique vers `@domos/audio` | `adapter-google` sans import structurel vers `@domos/server` | Risque : laisser un import type-only vers `server` et croire à tort que le problème est clos |
| Jour 4 | Nettoyer les imports `adapter-openai` et rerouter les contrats vers `@domos/core` et l'audio générique vers `@domos/audio` | `adapter-openai` sans import structurel vers `@domos/server` | Risque : oublier le mode live ou les capabilities dans le nettoyage |
| Jour 5 | Réévaluer `packages/server/src/standalone/adapters/factory.ts`, `src/index.ts` et `src/speech/index.ts` pour retirer les exports/compositions injustifiés | Surface publique `server` réduite à la composition runtime et compatibilités justifiées | Point de validation : ne pas conserver un provider migré dans `server` “par confort” |
| Jour 6 | Passer sur les shims résiduels `llm/types.ts`, `BaseLLMAdapter.ts`, `speech/types.ts`, `STTService.ts`, `TTSService.ts` et décider ce qui reste vraiment nécessaire | Décision explicite sur chaque shim : conservé avec raison ou retiré | Risque : laisser survivre une compatibilité fantôme jamais utilisée |
| Jour 7 | Traiter explicitement `ElevenLabsTTS` et les fichiers providers/documentation encore présents sous `server` | Décision écrite sur `ElevenLabsTTS` + nettoyage doc/provider cohérent | Point de validation : ne pas créer implicitement une migration ElevenLabs hors feature dédiée |
| Jour 8 | Mettre à jour `docs/CUSTOM_ADAPTER.md`, `STT-TTS-INTEGRATION.md` et les README providers affectés | Documentation alignée sur la topologie finale | Risque : doc partiellement mise à jour, encore contradictoire selon les pages |
| Jour 9 | Exécuter la matrice build/test ciblée et noter les packages sans script de test exploitable | Tableau de validation technique avec verdict par package | Point de validation : bloquer la clôture si un build clé échoue ou si l'absence de test n'est pas explicitée |
| Jour 10 | Produire le verdict final du gate, rouvrir si besoin les écarts vers les features 14/15, et préparer la clôture Sprint 3 | Gate final signé : validé ou bloqué avec écarts tracés | Risque : fermer le sprint avec des écarts “tolérés” non écrits |

---

## Hypothèses ouvertes

- Hypothèse de pilotage : Sprint 3 démarre seulement après une implémentation substantielle des features 14 et 15 ; sinon il devient un sprint de blocage et de requalification, pas un sprint de fermeture.
- Hypothèse de compatibilité : aucun consommateur externe critique n'a besoin de continuer à importer les providers Google/OpenAI depuis `@domos/server`. Si c'est faux, la compatibilité doit être écrite, limitée et datée.
- Hypothèse d'architecture : `ElevenLabsTTS` peut rester temporairement sous `server` comme exception documentée tant qu'aucune feature dédiée `adapter-elevenlabs` n'existe.
- Hypothèse de documentation : `docs/CUSTOM_ADAPTER.md` est bien le point d'entrée pertinent pour figer la règle “un adapter importe ses contrats depuis `@domos/core`, jamais depuis `@domos/server`”.
- Hypothèse de validation : la matrice de tests actuelle est hétérogène selon les packages ; l'absence de script `test` dans un package ne vaut pas validation implicite et doit être documentée comme telle.

---

## Ordre de livraison recommandé

1. Commencer par prouver la topologie réelle du repo avant de toucher la moindre surface publique.
2. Nettoyer ensuite les adapters, car ce sont eux qui matérialisent ou non la dépendance inversée `adapter-* -> server`.
3. Réduire `server` seulement après disponibilité d'une lecture claire des contrats et providers côté adapters.
4. Trancher le cas `ElevenLabsTTS` avant la clôture, pas après.
5. Fermer le sprint uniquement après documentation alignée et matrice build/test exécutée.