# Sprint MEDIA-00 - Primitives PCM minimales dans Core Media

Statut : **prêt pour implémentation après validation du Product Owner**

## 1. Intention produit

Les SDK DomOS capturent des échantillons Web Audio en `Float32Array`, les
convertissent en PCM16 base64, puis envoient ce contenu avec le type
`audio/pcm;rate=16000`. À la réception, ils réalisent l'opération inverse avant
de programmer la lecture dans un `AudioContext`.

Cette conversion est une règle de représentation DomOS commune. Elle doit être
fournie par Core Media sans déplacer dans core la gestion du microphone, du
playback, du transport ADTP ou des codecs qui ne sont pas utilisés.

## 2. État réel vérifié

### 2.1 Consommateur direct du package audio

`packages/angular/src/lib/services/voice/DomOSVoiceService.ts` importe
`base64EncodeAudio` depuis `@domos/audio`. Le service contient aussi son propre
décodage PCM16 base64 vers `Float32Array` pour lire les réponses.

### 2.2 Implémentations clientes déjà fonctionnelles

Les SDK React, Vue, Svelte et Browser possèdent chacun une conversion locale
équivalente. Ces implémentations confirment le contrat utile, mais leur
remplacement n'appartient pas à MEDIA-00 : modifier simultanément cinq runtimes
augmenterait le risque sans être nécessaire à l'extraction.

Le comportement Angular fait référence pour le décodage : une charge dont le
nombre d'octets est impair est tronquée au dernier octet complet avant la
création des échantillons PCM16.

### 2.3 Contenu explicitement non retenu

WAV, Opus et la détection de format n'ont pas de consommateur actif parmi les
SDK clients fonctionnels. Leur seul lien identifié concerne l'adapter LiveKit,
laissé en backlog. Ils restent dans `packages/audio` et aucune de leurs
dépendances n'entre dans `@domos/core`.

## 3. Résultat final attendu

Après ce sprint :

1. Core expose deux fonctions PCM nommées sans ambiguïté via un sous-chemin ;
2. Angular les utilise pour l'envoi et la lecture PCM ;
3. le comportement observable du mode vocal Angular ne change pas ;
4. l'import racine de core ne contient aucun code média supplémentaire ;
5. les autres SDK et `packages/audio` restent inchangés.

## 4. Contrats publics

Fichier cible : `packages/core/src/media/audio/pcm.ts`.

```ts
export function encodeFloat32ToPcm16Base64(
  samples: Float32Array,
): string;

export function decodePcm16Base64ToFloat32(
  payload: string,
): Float32Array;
```

Import public :

```ts
import {
  decodePcm16Base64ToFloat32,
  encodeFloat32ToPcm16Base64,
} from '@domos/core/media/audio';
```

### 4.1 Encodage

- borner chaque échantillon à `[-1, 1]` ;
- convertir en entier PCM16 signé en conservant la règle actuelle ;
- écrire les octets en little-endian ;
- retourner une chaîne base64 ;
- accepter un tableau vide et retourner une chaîne vide ;
- ne pas modifier le tableau fourni.

### 4.2 Décodage

- décoder la charge base64 en octets ;
- ignorer un éventuel dernier octet isolé ;
- lire les valeurs PCM16 little-endian ;
- normaliser chaque valeur en flottant dans `[-1, 1]` ;
- retourner un nouveau `Float32Array` ;
- accepter une chaîne vide et retourner un tableau vide.

MEDIA-00 ne crée pas de contrat WAV, Opus, resampling, MIME ou détection de
format. Il ne crée pas non plus un objet `AudioManager` générique.

## 5. Architecture cible

```text
packages/core/
  src/media/audio/
    index.ts                 # exports PCM du sous-chemin
    pcm.ts                   # fonctions pures, sans Web Audio
  tests/
    media-audio-pcm.test.ts  # compatibilité et cas limites
  package.json               # export ./media/audio + entrée de build

packages/angular/
  src/lib/services/voice/DomOSVoiceService.ts
  package.json
```

Le sous-chemin doit produire ses propres artefacts ESM/CJS et déclarations de
types. `packages/core/src/index.ts` ne doit pas réexporter son contenu.

## 6. Tâches d'implémentation

### Tâche 1 - Figer les preuves de compatibilité

1. Reprendre les vecteurs de tests PCM existants de `packages/audio`.
2. Ajouter des fixtures représentant les conversions Angular, React, Vue,
   Svelte et Browser actuellement en production.
3. Prouver que le nouvel encodeur retourne exactement les mêmes octets pour
   `-1`, `-0.5`, `0`, `0.5`, `1` et les valeurs hors bornes.
4. Figer le comportement pour une charge vide et une charge de taille impaire.

Livrable : tests rouges ajoutés dans
`packages/core/tests/media-audio-pcm.test.ts` avant l'implémentation.

### Tâche 2 - Implémenter les primitives pures

1. Créer `packages/core/src/media/audio/pcm.ts`.
2. Porter uniquement l'algorithme PCM nécessaire.
3. Conserver une implémentation compatible navigateur et environnement de test
   Node sans importer un module Node dans le bundle navigateur.
4. Créer `packages/core/src/media/audio/index.ts` avec les deux exports nommés.
5. Ne dépendre d'aucun package runtime additionnel.

Livrable : fonctions pures couvertes par les tests de la tâche 1.

### Tâche 3 - Publier le sous-chemin Core

1. Ajouter `src/media/audio/index.ts` aux entrées `tsup` de core.
2. Déclarer `./media/audio` dans `packages/core/package.json` avec `types`,
   `import` et `require`, conformément aux exports existants du package.
3. Vérifier que `import '@domos/core'` ne référence pas le module média.
4. Vérifier que l'import du sous-chemin fonctionne dans un consommateur ESM et
   dans la compilation Angular.

Livrable : artefacts et déclarations résolubles sous
`@domos/core/media/audio`.

### Tâche 4 - Migrer uniquement Angular

1. Remplacer l'import `base64EncodeAudio` par
   `encodeFloat32ToPcm16Base64` depuis le nouveau sous-chemin.
2. Remplacer le décodage PCM local du chemin de playback par
   `decodePcm16Base64ToFloat32`.
3. Ne modifier ni `VoiceStateMachine`, ni le barge-in, ni la programmation des
   chunks, ni les règles de fermeture de l'`AudioContext`.
4. Retirer `@domos/audio` du manifeste Angular uniquement après avoir prouvé
   qu'aucun autre import Angular ne subsiste.
5. Mettre à jour le lockfile par la commande workspace habituelle.

Livrable : service Angular utilisant les deux contrats Core Media sans
changement de son API publique.

### Tâche 5 - Vérifier la frontière

1. Confirmer qu'aucun fichier React, Vue, Svelte, Browser ou LiveKit n'a changé.
2. Confirmer que WAV, Opus, leurs types et leurs dépendances n'ont pas été
   déplacés vers core.
3. Confirmer que `packages/audio` existe encore et reste compilable.
4. Documenter les éventuels imports résiduels sans les corriger dans ce sprint.

Livrable : rapport de clôture dans le fichier de progression.

## 7. Tests et commandes de validation

```bash
pnpm --filter @domos/core test
pnpm --filter @domos/core build
pnpm --filter @domos/angular build
pnpm --filter @domos/audio build
pnpm build
rg "@domos/audio" packages/angular packages/react packages/vue packages/svelte packages/browser
```

Une vérification manuelle du mode vocal Angular doit couvrir : démarrage du
microphone, envoi de chunks PCM, lecture de plusieurs chunks consécutifs,
interruption utilisateur, mute et destruction du service.

## 8. Definition of Done

- [ ] Les deux fonctions publiques respectent les contrats de la section 4.
- [ ] Les tests prouvent la compatibilité avec les conversions clientes.
- [ ] L'octet PCM isolé est géré sans exception ni échantillon corrompu.
- [ ] `@domos/core/media/audio` résout son code et ses types.
- [ ] L'import racine `@domos/core` ne réexporte pas Core Media.
- [ ] Angular n'importe plus `@domos/audio`.
- [ ] L'envoi et la lecture vocale Angular conservent leur comportement.
- [ ] Aucun codec ni dépendance lourde n'est ajouté à core.
- [ ] Aucun autre SDK et aucun adapter provider n'est modifié.
- [ ] Les builds ciblés et le build monorepo réussissent.
- [ ] Le reviewer confirme le périmètre, les exports et les preuves de tests.

## 9. Hors scope obligatoire

- supprimer ou déprécier `packages/audio` ;
- migrer WAV, Opus ou la détection de format ;
- corriger ou refactoriser LiveKit ;
- uniformiser tous les services vocaux des SDK ;
- introduire AudioWorklet, WebRTC, resampling ou nouveaux formats ADTP ;
- déplacer la capture, le playback ou l'état vocal dans core.

## 10. Risques à surveiller

- une différence d'arrondi PCM modifierait les octets transmis au provider ;
- un export ajouté à la racine alourdirait involontairement tous les clients ;
- fermer ou recréer l'`AudioContext` dans cette migration casserait le playback ;
- supprimer `packages/audio` casserait l'adapter LiveKit encore présent.

## 11. Commit recommandé

`refactor(core): extract minimal pcm media primitives`
