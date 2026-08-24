# Feature 15 — Sprint 2 : Migration des providers voice/speech hors de `@owllayer/server` vers `adapter-google` / `adapter-openai`, réduction de `server` à la composition runtime

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-31  
**Sprint** : 2 semaines — 10 jours ouvrés  
**Dépendances** : feature_14_voice_contracts_core_audio_boundaries.md

---

## Objectif

Achever la refonte d'architecture en retirant de `packages/server` les implémentations provider concrètes Google/OpenAI pour le speech, puis en limitant `server` à son rôle d'orchestrateur runtime/composition.

Ce sprint suppose que les contrats et bases abstraites voice/speech ont déjà été déplacés vers `@owllayer/core`. Il s'agit maintenant de déplacer les implémentations concrètes au bon endroit : dans les packages adapters provider.

---

## Diagnostic actuel

- `packages/server/src/standalone/adapters/factory.ts` importe déjà `GoogleAdapter`, `GoogleLiveAdapter`, `OpenAIAdapter` et `OpenAILiveAdapter` depuis leurs packages dédiés.
- Le même fichier continue pourtant à construire `GoogleSTT`, `GoogleTTS`, `WhisperSTT`, `OpenAITTS` et `ElevenLabsTTS` depuis `packages/server/src/speech/providers/`.
- `packages/server/src/index.ts` continue à exporter les providers speech concrets.
- `packages/server/src/speech/index.ts` reste un barrel mêlant contrats, bases et implémentations provider.
- `packages/audio` contient déjà l'infrastructure audio générique nécessaire pour éviter de recopier de la logique PCM/WAV/Opus dans les nouveaux providers.
- Aucune structure `packages/adapter-elevenlabs` n'existe aujourd'hui dans le repo réel.

---

## Positionnement MVP du sprint

Sprint 2 est un sprint de migration de domicile d'implémentation.

Le livrable attendu n'est pas une nouvelle capacité fonctionnelle. Le livrable attendu est la fin de l'anomalie suivante : `server` ne doit plus être le domicile des implémentations provider concrètes Google/OpenAI tout en prétendant n'être qu'un orchestrateur.

Le sprint est réussi si l'état cible suivant est atteint :

- `packages/adapter-google` porte les implémentations `GoogleSTT` et `GoogleTTS` en plus des adapters LLM/live déjà présents.
- `packages/adapter-openai` porte les implémentations `WhisperSTT` et `OpenAITTS` en plus des adapters LLM/live déjà présents.
- `packages/server/src/standalone/adapters/factory.ts` ne construit plus aucun provider speech via `../../speech/providers/*.ts` pour Google/OpenAI.
- `packages/server/src/index.ts` n'expose plus les providers speech concrets Google/OpenAI migrés.
- `packages/server/src/speech/` cesse d'être un foyer d'implémentations provider pour Google/OpenAI.

---

## Règles de design

- `packages/server` compose, configure, orchestre et branche les transports. Il ne loge pas l'implémentation concrète d'un provider quand un package adapter dédié existe.
- `packages/adapter-google` porte toutes les implémentations concrètes Google liées à la voix : LLM texte, live audio, STT et TTS.
- `packages/adapter-openai` porte toutes les implémentations concrètes OpenAI liées à la voix : LLM texte, live audio, Whisper STT et OpenAI TTS.
- `packages/core` reste la seule source de vérité des contrats et bases abstraites.
- `packages/audio` reste la seule source de vérité de l'infrastructure audio générique. Les providers migrés doivent réutiliser ses helpers plutôt que réimplémenter de la logique audio transversale.
- Le sprint ne crée pas de package provider nouveau tant que la structure réelle du repo ne le justifie pas.

---

## Codes stables de validation d'architecture

| Code | Déclencheur | Décision attendue |
| --- | --- | --- |
| `VOICE-COMP-001` | `packages/server/src/standalone/adapters/factory.ts` importe encore `../../speech/providers/*.js` pour Google/OpenAI | Refus du sprint tant que la factory n'importe pas les adapters speech depuis `@owllayer/adapter-google` et `@owllayer/adapter-openai` |
| `VOICE-COMP-002` | `packages/server/src/index.ts` exporte encore un provider concret Google/OpenAI migré | Refus du sprint tant que le barrel public `server` n'est pas nettoyé |
| `VOICE-COMP-003` | Un provider speech migré recopie de l'infrastructure audio générique au lieu d'utiliser `@owllayer/audio` | Refus du sprint tant que la logique est recentralisée correctement |
| `VOICE-COMP-004` | Les packages adapters speech nouveaux réintroduisent une dépendance structurelle à `@owllayer/server` | Refus du sprint tant que le provider compile contre `@owllayer/core` et `@owllayer/audio` uniquement |

---

## Découpage du sprint

### Bloc 1 — Migrer les providers speech Google vers `@owllayer/adapter-google`

**startIndex recommandé** : 1

Avant :

- `GoogleSTT` et `GoogleTTS` vivent dans `packages/server/src/speech/providers/`.
- La factory standalone du server les importe localement.

Après :

- `packages/adapter-google/src/GoogleSTT.ts` et `packages/adapter-google/src/GoogleTTS.ts` existent et deviennent la source de vérité.
- `packages/adapter-google/src/index.ts` les exporte.
- `packages/server/src/standalone/adapters/factory.ts` les charge via `@owllayer/adapter-google`.

Pourquoi :

- Si Google a déjà un package adapter dédié pour LLM/live, y laisser STT/TTS dans `server` est une incohérence de domaine.

Service interface methods concernés :

- `GoogleSTT.transcribe(config)`
- `GoogleSTT.getCapabilities?()`
- `GoogleTTS.synthesize(config)`
- `GoogleTTS.listVoices?(languageCode?)`
- `GoogleTTS.getCapabilities?()`

Boilerplate libs à réutiliser :

- `@google/genai`
- `@owllayer/core`
- `@owllayer/audio`

### Bloc 2 — Migrer les providers speech OpenAI vers `@owllayer/adapter-openai`

**startIndex recommandé** : 2

Avant :

- `WhisperSTT` et `OpenAITTS` vivent dans `packages/server/src/speech/providers/`.
- La factory standalone du server les importe localement.

Après :

- `packages/adapter-openai/src/WhisperSTT.ts` et `packages/adapter-openai/src/OpenAITTS.ts` existent et deviennent la source de vérité.
- `packages/adapter-openai/src/index.ts` les exporte.
- `packages/server/src/standalone/adapters/factory.ts` les charge via `@owllayer/adapter-openai`.

Pourquoi :

- OpenAI possède déjà un package adapter dédié pour LLM/live. Garder Whisper/OpenAI TTS dans `server` casse la symétrie de domaine et entretient la dette.

Service interface methods concernés :

- `WhisperSTT.transcribe(config)`
- `WhisperSTT.getCapabilities?()`
- `OpenAITTS.synthesize(config)`
- `OpenAITTS.listVoices?(languageCode?)`
- `OpenAITTS.getCapabilities?()`

Boilerplate libs à réutiliser :

- `openai`
- `@owllayer/core`
- `@owllayer/audio`

### Bloc 3 — Réduire `server` à la composition runtime

**startIndex recommandé** : 3

Avant :

- `packages/server/src/index.ts` exporte contrats, bases abstraites, providers concrets et runtime.
- `packages/server/src/speech/index.ts` mélange tout dans le même barrel.

Après :

- `packages/server/src/index.ts` expose uniquement runtime, composition et éventuels contrats re-exportés depuis `core`.
- Les exports de providers concrets Google/OpenAI migrés disparaissent de `server`.
- `packages/server/src/speech/index.ts` n'est plus un point d'entrée provider concret pour Google/OpenAI.

Pourquoi :

- Tant que `server` exporte les implémentations providers migrées, la frontière architecture cible reste fausse même si les fichiers ont changé de place.

Service interface methods concernés :

- `buildSTT(config)`
- `buildTTS(config)`
- `buildAdapters(config)`

Boilerplate libs à réutiliser :

- Dynamic imports ESM existants
- `@owllayer/adapter-google`
- `@owllayer/adapter-openai`

### Bloc 4 — Traiter explicitement le cas `ElevenLabsTTS`

**startIndex recommandé** : 4

Avant :

- `ElevenLabsTTS` vit dans `packages/server/src/speech/providers/`.
- Aucun package `packages/adapter-elevenlabs` n'existe aujourd'hui dans le repo.

Après :

- Le sprint documente explicitement que `ElevenLabsTTS` ne doit pas être remigré au hasard dans Google/OpenAI.
- Deux options seulement sont recevables en sortie de sprint :
- soit `ElevenLabsTTS` reste hors scope explicite et bloque la fermeture complète de la trajectoire globale providers,
- soit une feature dédiée crée son propre package adapter ultérieurement.

Pourquoi :

- Le pire raccourci serait de fourrer ElevenLabs dans `server` “temporairement” tout en déclarant la refonte terminée.

Service interface methods concernés :

- `ElevenLabsTTS.synthesize(config)`
- `ElevenLabsTTS.listVoices?(languageCode?)`

Boilerplate libs à réutiliser :

- Aucun dans ce sprint, sauf documentation explicite du statut hors scope

---

## Fichiers ciblés

### `packages/adapter-google`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/adapter-google/src/GoogleSTT.ts` | N'existe pas | Création du provider STT Google dans le bon package | Rapatrier l'implémentation concrète au bon domaine |
| `packages/adapter-google/src/GoogleTTS.ts` | N'existe pas | Création du provider TTS Google dans le bon package | Rapatrier l'implémentation concrète au bon domaine |
| `packages/adapter-google/src/index.ts` | Exporte seulement `GoogleAdapter` et `GoogleLiveAdapter` | Exporte aussi `GoogleSTT` et `GoogleTTS` | Donner un point d'entrée provider cohérent |
| `packages/adapter-google/package.json` | Dépendances taillées pour LLM/live | Dépendances alignées sur speech si besoin de `@owllayer/audio` | Supporter proprement les providers speech migrés |

### `packages/adapter-openai`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/adapter-openai/src/WhisperSTT.ts` | N'existe pas | Création du provider Whisper STT dans le bon package | Rapatrier l'implémentation concrète au bon domaine |
| `packages/adapter-openai/src/OpenAITTS.ts` | N'existe pas | Création du provider OpenAI TTS dans le bon package | Rapatrier l'implémentation concrète au bon domaine |
| `packages/adapter-openai/src/index.ts` | Exporte seulement `OpenAIAdapter` et `OpenAILiveAdapter` | Exporte aussi `WhisperSTT` et `OpenAITTS` | Donner un point d'entrée provider cohérent |
| `packages/adapter-openai/package.json` | Dépendances taillées pour LLM/live | Dépendances alignées sur speech si besoin de `@owllayer/audio` | Supporter proprement les providers speech migrés |

### `packages/server`

| Fichier | AVANT | APRÈS | POURQUOI |
| --- | --- | --- | --- |
| `packages/server/src/standalone/adapters/factory.ts` | Importe speech depuis `../../speech/providers/*.js` | Importe les providers speech migrés depuis `@owllayer/adapter-google` et `@owllayer/adapter-openai` | Faire du server un composeur runtime seulement |
| `packages/server/src/index.ts` | Exporte encore `WhisperSTT`, `OpenAITTS`, `GoogleSTT`, `GoogleTTS` et `ElevenLabsTTS` | Retire les exports Google/OpenAI migrés, traite explicitement `ElevenLabsTTS` comme exception hors scope ou étape ultérieure | Rendre la frontière publique cohérente |
| `packages/server/src/speech/index.ts` | Mélange contrats, bases et providers concrets | Ne sert plus de point d'entrée pour les providers Google/OpenAI migrés | Éviter le faux domicile provider dans `server` |
| `packages/server/src/speech/providers/GoogleSTT.ts` | Implémentation concrète Google STT | Supprimé du domaine `server` après migration | Supprimer la duplication et clarifier le domaine |
| `packages/server/src/speech/providers/GoogleTTS.ts` | Implémentation concrète Google TTS | Supprimé du domaine `server` après migration | Supprimer la duplication et clarifier le domaine |
| `packages/server/src/speech/providers/WhisperSTT.ts` | Implémentation concrète Whisper STT | Supprimé du domaine `server` après migration | Supprimer la duplication et clarifier le domaine |
| `packages/server/src/speech/providers/OpenAITTS.ts` | Implémentation concrète OpenAI TTS | Supprimé du domaine `server` après migration | Supprimer la duplication et clarifier le domaine |
| `packages/server/src/speech/providers/README.md` | Documente les providers comme résidant dans `server` | Mis à jour ou retiré selon le plan de migration | Éviter une documentation mensongère après déplacement |

---

## Périmètre strict

- Migrer `GoogleSTT` et `GoogleTTS` dans `packages/adapter-google`.
- Migrer `WhisperSTT` et `OpenAITTS` dans `packages/adapter-openai`.
- Mettre à jour la factory standalone pour ne plus construire ces providers depuis `packages/server/src/speech/providers/`.
- Nettoyer les exports publics `@owllayer/server` pour refléter la nouvelle architecture.
- Réutiliser `@owllayer/audio` pour toute logique audio générique requise par les providers migrés.

## Hors scope

- Créer `packages/adapter-elevenlabs` dans ce sprint sans feature dédiée.
- Changer le contrat YAML public des providers speech.
- Modifier `AnthropicAdapter` ou tout autre provider hors voice/speech demandé ici.
- Modifier les SDK frontend ou le protocole ADTP.
- Ajouter un nouveau provider speech.

---

## Gate de fin de sprint

- `packages/server/src/standalone/adapters/factory.ts` n'importe plus `GoogleSTT`, `GoogleTTS`, `WhisperSTT` ou `OpenAITTS` depuis `../../speech/providers/*.js`.
- `packages/adapter-google` exporte `GoogleSTT` et `GoogleTTS` et compile avec `@owllayer/core` comme contrat partagé.
- `packages/adapter-openai` exporte `WhisperSTT` et `OpenAITTS` et compile avec `@owllayer/core` comme contrat partagé.
- `packages/server/src/index.ts` n'exporte plus les providers Google/OpenAI migrés.
- `pnpm --filter @owllayer/server build`, `pnpm --filter @owllayer/adapter-google build` et `pnpm --filter @owllayer/adapter-openai build` passent après la bascule.
- Le statut de `ElevenLabsTTS` est explicite, documenté et non maquillé.

---

## Plan journalier — 10 jours ouvrés

| Jour | Tâches concrètes | Livrables attendus | Risques / points de validation |
| --- | --- | --- | --- |
| Jour 1 | Figer le périmètre de migration provider par provider et verrouiller les fichiers supprimés/créés | Inventaire validé de `GoogleSTT`, `GoogleTTS`, `WhisperSTT`, `OpenAITTS` et de leurs dépendances audio | Ne pas englober `ElevenLabsTTS` de façon implicite alors qu'aucun adapter dédié n'existe |
| Jour 2 | Créer la structure speech dans `packages/adapter-google` et porter `GoogleSTT` | `GoogleSTT` existe dans `adapter-google` et compile contre `@owllayer/core` | Vérifier qu'aucun import résiduel vers `server` ne subsiste |
| Jour 3 | Porter `GoogleTTS` dans `packages/adapter-google` et mettre à jour `src/index.ts` | `adapter-google` expose désormais LLM/live/STT/TTS Google | Vérifier l'usage de `@owllayer/audio` pour les helpers génériques au lieu d'une recopie locale |
| Jour 4 | Construire et tester `@owllayer/adapter-google`, puis corriger les écarts d'API | Package Google speech validé | Bloquer si l'API publique diverge des contrats définis dans `@owllayer/core` |
| Jour 5 | Créer la structure speech dans `packages/adapter-openai` et porter `WhisperSTT` | `WhisperSTT` existe dans `adapter-openai` | Vérifier les usages OpenAI et la compatibilité des types importés depuis `@owllayer/core` |
| Jour 6 | Porter `OpenAITTS` dans `packages/adapter-openai` et mettre à jour `src/index.ts` | `adapter-openai` expose désormais LLM/live/STT/TTS OpenAI | Vérifier l'absence de duplication audio générique et l'absence de dépendance `@owllayer/server` |
| Jour 7 | Réécrire `packages/server/src/standalone/adapters/factory.ts` pour composer uniquement via les adapters | Factory runtime clean pour Google/OpenAI speech | Bloquer si un import `../../speech/providers/*.js` subsiste pour ces providers |
| Jour 8 | Nettoyer `packages/server/src/index.ts`, `packages/server/src/speech/index.ts` et les anciens fichiers provider du domaine `server` | Surface publique `server` cohérente avec la nouvelle architecture | Vérifier qu'aucun export fantôme ne masque encore la migration |
| Jour 9 | Mettre à jour la documentation locale `speech/providers/README.md`, exécuter la matrice de build ciblée et traiter les régressions | Docs alignées et builds green | Contrôler que la doc ne prétend plus que les providers Google/OpenAI vivent dans `server` |
| Jour 10 | Fermer le sprint avec revue d'architecture, statut explicite de `ElevenLabsTTS` et checklist de livraison | Sprint 2 prêt à merger, non ambigu | Refuser la clôture si `ElevenLabsTTS` reste dans un angle mort non documenté |

---

## Hypothèses ouvertes

- Hypothèse forte : `GoogleSTT`, `GoogleTTS`, `WhisperSTT` et `OpenAITTS` peuvent migrer sans changement du contrat YAML public actuel.
- Point ambigu à valider : `ElevenLabsTTS` nécessite probablement une feature dédiée et un package adapter dédié pour terminer la trajectoire globale “server = composition only”.
- Hypothèse technique : aucune dépendance npm nouvelle n'est requise si les providers speech migrés réutilisent `@owllayer/audio` plutôt que de réimplémenter des helpers audio.

---

## Ordre de livraison recommandé

1. Migrer Google speech complètement avant de toucher la factory, pour disposer d'un premier chemin provider complet et testable.
2. Migrer ensuite OpenAI speech avec la même topologie de package.
3. Basculer la factory `server` seulement une fois les deux adapters speech exportés et compilables.
4. Nettoyer les exports publics `server` après la bascule runtime, jamais avant.
5. Traiter `ElevenLabsTTS` explicitement comme décision de backlog ou de feature dédiée, pas comme un reste implicite.
