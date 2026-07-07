# Feature #31 : Parite minimale du mode vocal Angular SDK + demo de validation

**Statut** : 🟡 Validee  
**Domaine** : angular  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-04-07

---

## Objectif

Fermer la dette voice restante du domaine Angular avec une seule strategie de livraison : retablir la parite vocale minimale utile entre Angular et les SDK React/Vue sur la surface officielle du package, puis faire porter cette capacite par `apps/demo-angular` comme demo de validation reelle.

Cette feature ne lance pas une refonte UX. Elle ne lance pas une nouvelle architecture voice. Elle ne lance pas un chantier `core`, `server` ou `ui`.

Le resultat attendu est strictement borne :

- le widget officiel `@domos/angular` doit gerer correctement le flux live vocal minimal
- la demo Angular doit valider cette capacite sur la surface officielle du SDK
- si la surface publique Angular reste insuffisante pour une UI custom voice robuste, cette limite doit etre dite explicitement et sortir dans une autre feature Angular

---

## Diagnostic actuel

Le repo reel au 7 avril 2026 montre un ecart clair entre ce que le domaine Angular expose et ce qu'il valide effectivement.

### 1. Le package Angular expose deja un widget officiel, mais sa boucle voice live n'est pas au niveau React/Vue

**AVANT**

- `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts` capture et stream l'audio vers le serveur via `sendAudioStream`.
- `stopRecordingInternal()` coupe le micro, deconnecte les nodes et ferme le contexte de capture, mais n'envoie pas `sendAudioEnd(...)`.
- le widget ne reprend pas la logique minimale de barge-in visible dans `packages/react/src/voice/useVoiceMode.ts` et `packages/vue/src/composables/useVoiceMode.ts`.
- le widget ne s'appuie pas sur une machine d'etat vocale comparable a React/Vue pour borner capture, attente modele, lecture et interruption.

**APRES vise**

- le widget officiel Angular doit fermer correctement un tour vocal live en envoyant `sendAudioEnd` avant l'arret du micro.
- le widget doit gerer l'interruption minimale quand l'utilisateur reparle pendant que l'agent parle.
- le widget doit respecter les regles audio DomOS deja ecrites, notamment la fermeture des contextes uniquement dans les bons lifecycles.

**POURQUOI**

- tant que `sendAudioEnd` n'est pas envoye, le backend live peut rester en attente d'input et la reponse vocale ne part pas proprement.
- tant que l'interruption n'est pas alignee, Angular n'a pas une parite minimale de comportement avec React/Vue.

### 2. La facade Angular publique n'expose pas encore la couche voice minimale attendue pour une surface package coherente

**AVANT**

- `packages/angular/src/lib/services/DomOSAngularService.ts` expose la connexion, le texte, le contexte, les events et les tools.
- aucune methode voice minimale de facade n'y est exposee aujourd'hui : pas de `sendAudio`, pas de `sendAudioStream`, pas de `sendAudioEnd`, pas de `sendInterrupt`, pas de callback `onAudioOutput` cote facade.
- le widget officiel s'appuie donc directement sur `DomOSClient` pour sa boucle audio.

**APRES vise**

- la facade Angular doit exposer les primitives voice minimales deja existantes dans `DomOSClient`, sans creer une nouvelle API exotique ni un nouveau protocole.

**POURQUOI**

- un SDK Angular qui promet une surface widget audio officielle ne doit pas obliger tout futur consommateur voice a contourner la facade publique et a retomber sur le client brut.
- cette facade minimale suffit pour le widget officiel et pour une eventuelle coque Angular raisonnable, sans ouvrir un chantier `DomOSVoiceService` complet si ce n'est pas necessaire.

### 3. La demo Angular actuelle ne valide pas la voice du SDK Angular

**AVANT**

- `apps/demo-angular/src/app/app.component.ts` monte `app-chat-widget`.
- `apps/demo-angular/src/app/marketplace/components/chat-widget.component.ts` est un widget local texte-only.
- la demo ne valide donc ni le widget officiel Angular, ni le flux live voice, ni le playback audio du package.
- `feature_27_demo_angular_classifieds_marketplace.md` disait explicitement que la voice UI Angular restait une hypothese ouverte.

**APRES vise**

- la demo Angular doit valider la feature via la surface officielle `DomOSWidgetComponent` de `@domos/angular`.
- le widget local texte-only ne doit plus etre la surface de verification voice de la demo.

**POURQUOI**

- tant que la demo valide un widget local hors package, le domaine Angular peut paraitre voice-ready alors que le SDK officiel ne l'est pas vraiment.

### 4. Le contexte plus large `sendAudioEnd` existe deja, mais il ne justifie pas d'ouvrir un autre domaine ici

**AVANT**

- `issues/issue_04_implementation_plan.md` pose deja le contexte global autour de `sendAudioEnd`.
- React et Vue ont deja integre la fermeture de tour vocal live.

**APRES vise**

- Angular consomme les capacites deja livrees, sans reouvrir `core`, `server` ou `adapter-*`.

**POURQUOI**

- le protocole existe deja. Le manque est maintenant un manque d'integration Angular, pas un manque d'architecture globale.

---

## Besoin

En tant qu'integrateur DomOS sur Angular, je veux que le SDK Angular officiel et la demo Angular supportent vraiment le mode voice live minimal, afin que l'utilisateur puisse parler, terminer sa prise de parole, entendre la reponse audio et interrompre l'agent comme sur React/Vue, sans passer par un widget local hors package.

### User story

> En tant que developpeur Angular DomOS, je veux une parite voice minimale sur le widget officiel et une demo qui la valide reellement, afin de ne plus avoir un domaine Angular qui parait vocal en documentation mais reste incomplet dans le code et dans la demo.

---

## Perimetre strict

### Ce qu'on fait

- corriger le package Angular pour que le widget officiel ferme correctement un tour live vocal avec `sendAudioEnd`
- retablir la gestion minimale de l'interruption voice et de l'etat de lecture/capture dans le widget officiel Angular
- exposer dans `DomOSAngularService` la facade voice minimale necessaire pour rester coherent avec cette surface widget
- activer la validation reelle du mode vocal dans `apps/demo-angular` en consommant la surface officielle du package Angular
- fermer la feature sur un gate explicite package + demo

### Ce qu'on ne fait pas

- pas de refonte UX large du widget Angular ou de la demo Angular
- pas de nouveau package, pas de cloud, pas de nouvelle API exotique si la capacite peut vivre dans le widget officiel et une facade Angular raisonnable
- pas de changement `packages/core/**`, `packages/server/**`, `packages/adapter-*/**` ou `packages/ui/**`
- pas de promesse de parite totale d'une UI custom voice Angular equivalente a `useVoiceMode` React/Vue si ce besoin depasse la facade minimale raisonnable
- pas d'auto-mount global du widget via provider ou plugin
- pas de revalidation produit large de `feature_27` au-dela de la preuve voice minimale dans la demo

> Si la mise en oeuvre revele un manque reel dans `core`, `ui` ou dans une future surface publique Angular de type composable/service voice complet, la feature s'arrete et ouvre un nouveau document dans le bon perimetre.

---

## Regles de design

- Une seule strategie de livraison : la validation voice Angular passe par la surface officielle `DomOSWidgetComponent`, pas par un widget local de demo reimplemente.
- La facade publique Angular ne doit exposer que les primitives voice minimales deja porteuses dans `DomOSClient` ; aucun protocole, aucun naming exotique, aucune abstraction speculative.
- Les references de comportement sont `packages/react/src/voice/useVoiceMode.ts` et `packages/vue/src/composables/useVoiceMode.ts`, mais la cible reste une parite de resultat Angular-native, pas un copier-coller de hooks.
- Le widget Angular doit suivre `docs/AUDIO_PIPELINE_RULES.md` pour la capture et le playback, en particulier sur `sendAudioEnd`, l'interruption, le sequencing playback et la fermeture des contextes.
- `apps/demo-angular` doit valider le package officiel. Un composant local de demo peut au mieux devenir une simple coque de configuration ; il ne doit plus porter une logique voice parallele.
- La feature est consideree reussie meme si la surface publique Angular pour une UI custom voice reste limitee, tant que cette limite est explicite et que le widget officiel + la demo passent le gate.

---

## Codes stables

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-VOICE-001` | `DomOSWidgetComponent.stopRecordingInternal()` coupe le micro sans `sendAudioEnd(...)` | Refus de cloture tant que la fin de tour live n'est pas emise correctement |
| `ANGULAR-VOICE-002` | le widget Angular ferme son `AudioContext` de capture au stop normal au lieu de suivre les regles audio DomOS | Refus tant que le stop capture ne suit pas les regles R1-R7 pertinentes |
| `ANGULAR-VOICE-003` | l'utilisateur ne peut pas interrompre l'agent en reparlant pendant un playback live | Refus tant que l'interruption minimale n'est pas alignee |
| `ANGULAR-VOICE-004` | `DomOSAngularService` reste incapable d'exposer la facade voice minimale deja disponible dans `DomOSClient` | Refus tant que la surface publique Angular oblige encore a contourner le service |
| `ANGULAR-VOICE-005` | `apps/demo-angular` continue de valider `app-chat-widget` texte-only au lieu du widget officiel Angular | Refus tant que la demo ne prouve pas la feature sur la bonne surface |
| `ANGULAR-VOICE-006` | la correction deborde sur `core`, `server`, `adapter-*` ou `ui` | Stop immediate et re-borneg du chantier |
| `ANGULAR-VOICE-007` | la feature derive en refonte UX du widget ou en chantier produit large de la marketplace | Refus car hors scope |
| `ANGULAR-VOICE-008` | une vraie UI custom Angular voice reste impossible sans une nouvelle surface publique plus large | Limite explicite acceptee ici, nouvelle feature Angular requise si ce besoin devient prioritaire |

---

## Decoupage en phases

## Phase 1 - Facade voice minimale du SDK Angular

**startIndex recommande** : 1

**AVANT**

- `DomOSAngularService` ne porte pas encore les primitives voice minimales deja presentes sur `DomOSClient`.
- le widget officiel Angular et toute future coque voice doivent s'appuyer sur le client brut pour l'audio.

**APRES**

- `DomOSAngularService` expose la couche voice minimale necessaire a la coherence du package Angular.

**POURQUOI**

- la parite minimale n'est pas seulement un bug widget ; c'est aussi une dette de facade publique Angular.

### Service interface methods a couvrir

- `sendAudio(audioBase64: string, mimeType: string): void`
- `sendAudioStream(audioBase64: string, mimeType?: string): void`
- `sendAudioEnd(reason: 'user_stop' | 'disconnect'): void` ou type public equivalent deja expose par `@domos/core`
- `sendInterrupt(): void`
- `onAudioOutput(listener: (audioBase64: string, mimeType: string) => void): VoidFunction`
- reusage de `state`, `isConnected` et `getAgentState()` pour ne pas recreer un etat vocal parallele inutile

### Briques existantes a reutiliser

- `DomOSClient` deja instancie dans le domaine Angular
- surface voice deja disponible cote client DomOS
- `@angular/core` signals deja en place dans `DomOSAngularService`

### Clause STOP

- ne pas creer `DomOSVoiceService` ou `injectDomOSVoice` dans cette feature tant que la facade minimale ci-dessus suffit au widget officiel et a la demo de validation

## Phase 2 - Correction du widget officiel Angular pour le flux live vocal

**startIndex recommande** : 2

**AVANT**

- `DomOSWidgetComponent` capture et stream l'audio mais coupe le micro sans `sendAudioEnd`.
- le stop normal ferme le contexte de capture au lieu de rester dans un cleanup leger.
- le widget ne gere pas l'interruption minimale de type barge-in visible dans React/Vue.
- l'etat vocal est derive surtout du `ClientState`, sans couche minimale explicite pour borner capture, attente modele et playback.

**APRES**

- le widget officiel Angular envoie `sendAudioEnd` avant l'arret du micro en mode live.
- le widget supporte l'interruption minimale quand l'utilisateur reprend la parole pendant que l'agent parle.
- le widget garde un pipeline capture/playback conforme aux regles audio DomOS.
- l'etat visuel et vocal reste coherent entre `listening`, attente modele, playback, interruption et retour a l'etat connecte.

**POURQUOI**

- c'est le coeur de la parite voice utile. Sans cela, la documentation widget Angular reste sur-prometteuse.

### Service interface methods et points de comportement a couvrir

- appel de `sendAudioStream(...)` pendant la capture live
- appel de `sendAudioEnd(...)` au stop normal d'une prise de parole
- appel de `sendInterrupt()` au barge-in si l'agent est deja en train de parler
- abonnement `onAudioOutput(...)` pour la lecture audio du modele
- reuse de `ClientState` et, si necessaire, de `VoiceStateMachine` de `@domos/core` pour borner les transitions internes

### Briques existantes a reutiliser

- `packages/react/src/voice/useVoiceMode.ts`
- `packages/vue/src/composables/useVoiceMode.ts`
- `docs/AUDIO_PIPELINE_RULES.md`
- `@domos/core` : `VoiceStateMachine`, `ClientState`, `WidgetConfig`, `generateWidgetStyles`

## Phase 3 - Activation reelle du mode vocal dans `apps/demo-angular`

**startIndex recommande** : 3

**AVANT**

- `app.component.ts` monte un widget local `app-chat-widget`.
- `chat-widget.component.ts` est texte-only et contourne la surface officielle Angular du package.
- la demo Angular ne prouve pas la voice du SDK.

**APRES**

- `apps/demo-angular` valide la feature sur `DomOSWidgetComponent` de `@domos/angular`.
- le chemin runtime principal de la demo n'utilise plus le widget local texte-only comme surface de verification.
- la configuration de la demo ouvre le mode audio par defaut ou, a minima, rend la voice accessible et testable sans bricolage supplementaire.

**POURQUOI**

- la correction package seule ne suffit pas ; sans demo de validation, la feature reste theorique.

### Service interface methods a couvrir cote demo

- consommation du widget officiel Angular
- aucune nouvelle methode de demo hors configuration widget
- reusage du provider `provideDomOS(...)` et de la config endpoint/apiKey existante

### Briques existantes a reutiliser

- `DomOSWidgetComponent` du package Angular
- `demoDomOSConfig` deja porte par `apps/demo-angular/src/app/app.config.ts`
- shell marketplace et routes existants de `apps/demo-angular`

### Decision de validation retenue

- le plus court chemin valide est de monter le widget officiel Angular dans la demo
- retrofitter `app-chat-widget` avec sa propre logique voice n'est pas une strategie acceptee dans cette feature

## Phase 4 - Gate final et limites declarees

**startIndex recommande** : 4

**AVANT**

- aucun gate binaire n'existe pour affirmer que le domaine Angular supporte vraiment le voice live sur sa surface officielle.

**APRES**

- la feature se ferme sur un gate package + demo clair, avec limite explicite sur la UI custom Angular si elle reste sous-dimensionnee.

**POURQUOI**

- le risque principal est de declarer la parite voice fermee alors que seule la documentation ou un widget local de demo aurait ete corrige.

### Gate final attendu

- `packages/angular` build et tests passent avec la surface voice corrigee
- le widget officiel Angular permet : parler, stopper la capture, declencher la reponse modele, jouer l'audio recu
- l'interruption minimale marche pendant un playback live
- `apps/demo-angular` valide cette boucle via la surface officielle du package
- aucune modification n'a ete absorbee hors domaine Angular
- la limite eventuelle sur une UI custom voice Angular plus large est ecrite noir sur blanc dans la conclusion technique de livraison

---

## Fichiers et groupes de fichiers cibles

| Fichier ou groupe | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `packages/angular/src/lib/services/DomOSAngularService.ts` | facade publique sans primitives voice minimales | facade publique expose aussi `sendAudio`, `sendAudioStream`, `sendAudioEnd`, `sendInterrupt`, `onAudioOutput` | fermer la dette de surface publique Angular sans ouvrir une nouvelle architecture |
| `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts` | widget officiel avec capture/playback mais fin de flux live incomplere et interruption minimale absente | widget officiel voice live corrige, conforme au protocole existant et aux regles audio DomOS | corriger le probleme a la source dans le package officiel |
| `packages/angular/src/public-api.test.ts` | gate facade/widget sans verrou explicite sur la parite voice minimale | tests de facade et/ou smoke de surface publique voice Angular mis a jour | fermer la feature sur un contrat package verifie |
| `apps/demo-angular/src/app/app.component.ts` | monte `app-chat-widget` texte-only | monte la surface officielle widget Angular pour la validation voice | faire de la demo une preuve de package et non un bypass local |
| `apps/demo-angular/src/app/marketplace/components/chat-widget.component.ts` | widget local texte-only utilise en runtime | sort du chemin de validation principal ; suppression ou coque minimale uniquement si necessaire pour compatibilite locale | empecher la demo de cacher un manque SDK derriere un widget local |

---

## Service interface methods a couvrir

La feature reste volontairement minimaliste sur l'API publique. Les methodes a couvrir dans la facade Angular sont celles qui existent deja de fait dans le client DomOS et dont le domaine Angular a besoin pour porter proprement la voice officielle.

- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `sendAudio(audioBase64: string, mimeType: string): void`
- `sendAudioStream(audioBase64: string, mimeType?: string): void`
- `sendAudioEnd(reason: 'user_stop' | 'disconnect'): void` ou type public equivalent deja present
- `sendInterrupt(): void`
- `onAudioOutput(listener: (audioBase64: string, mimeType: string) => void): VoidFunction`
- `state: Signal<ClientState>`
- `isConnected: Signal<boolean>`
- `getAgentState(): string`

Ce perimetre n'inclut pas un composable/service voice Angular complet equivalant a `useVoiceMode`. Si cette couche devient necessaire pour une UI custom plus riche, il faudra une autre feature Angular.

---

## Briques existantes a reutiliser

- `packages/react/src/voice/useVoiceMode.ts` comme reference de comportement live minimal
- `packages/vue/src/composables/useVoiceMode.ts` comme reference de comportement live minimal cote composable non-React
- `packages/angular/src/lib/components/widget/DomOSWidgetComponent.ts` comme point d'entree officiel a corriger, pas a contourner
- `packages/angular/src/lib/services/DomOSAngularService.ts` comme facade publique a completer, pas a doubler
- `docs/AUDIO_PIPELINE_RULES.md` pour les regles de capture, playback, sequencing et cleanup
- `issues/issue_04_implementation_plan.md` comme contexte de bug global `sendAudioEnd`, sans elargir le domaine de cette feature
- `apps/demo-angular/src/app/app.component.ts` et `apps/demo-angular/src/app/app.config.ts` comme point de validation de la demo

---

## Gate final

- [ ] `DomOSAngularService` expose la facade voice minimale sans creer de nouvelle architecture speculative
- [ ] `DomOSWidgetComponent` envoie `sendAudioEnd` au stop normal en mode live
- [ ] le widget officiel Angular gere l'interruption minimale pendant le playback live
- [ ] le widget officiel suit les regles audio DomOS utiles au scope Angular, notamment sur le cleanup des contextes et le sequencing playback
- [ ] `apps/demo-angular` valide la voice via la surface officielle du package Angular
- [ ] `app-chat-widget` n'est plus la preuve de validation voice du domaine Angular
- [ ] aucun fichier hors `packages/angular/**` et `apps/demo-angular/**` n'entre dans l'implementation
- [ ] la limite eventuelle d'une UI custom Angular voice plus ambitieuse est explicitement documentee au lieu d'etre maquillee

---

## Ce qu'on ne fait pas

- pas de refonte de design du widget marketplace ou du shell demo
- pas de migration vers une nouvelle stack audio
- pas de nouveau protocole voice
- pas de chantier global de parity UI custom Angular avec React/Vue au-dela de la facade minimale raisonnable
- pas de correction opportuniste dans `core`, `server`, `adapter-*` ou `ui`
- pas de deuxieme widget voice parallele dans la demo

---

## Hypotheses ouvertes

- Hypothese forte : la parite voice minimale demandee peut etre fermee sans creer `DomOSVoiceService`, en completant la facade existante et en corrigeant le widget officiel.
- Hypothese forte : la demo Angular peut valider la feature en montant directement `DomOSWidgetComponent`, sans retrofitter le widget local texte-only.
- Hypothese a verifier pendant implementation : un `VoiceStateMachine` explicite dans le widget Angular est utile pour la coherence d'etat ; si `ClientState` seul suffit proprement, ne pas sur-ajouter de couche.
- Hypothese a documenter si elle se confirme : la surface publique Angular reste encore trop courte pour une UI custom voice riche, mais cette limite n'empeche pas la cloture de la presente feature si le widget officiel et la demo passent le gate.

---

## Ordre de livraison recommande

1. Completer la facade voice minimale dans `DomOSAngularService` et verrouiller le contrat package.
2. Corriger `DomOSWidgetComponent` pour le flux live vocal complet minimal.
3. Basculer `apps/demo-angular` sur la surface widget officielle pour la validation.
4. Fermer sur un gate package + demo et documenter la limite eventuelle cote UI custom.