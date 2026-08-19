# Feature #28 : Harness HTML statique standalone pour le bundle minifie WooCommerce

**Statut** : 🟡 Validée  
**Domaine** : woocommerce  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-06

---

## Positionnement MVP

Cette feature ajoute un harness HTML statique unique dans `packages/woocommerce/` pour verifier que le bundle IIFE deja build `dist/owllayer-woocommerce.min.js` se charge et que l'entree `OwlLayerWoo.init(...)` reste executable hors WordPress.

Le MVP est volontairement etroit : il valide le chargement du JS minifie existant, la lecture du bloc JSON `#owllayer-woo-context` et l'appel de l'API publique deja documentee. Il ne tente ni de recreer WordPress, ni de simuler WooCommerce Store API, ni de corriger les comportements runtime observes hors environnement WooCommerce reel.

---

## Diagnostic actuel

### 1. Usage standalone documente mais non materialise

**AVANT**

- `packages/woocommerce/README.md` documente un usage manuel standalone avec un bloc `<script type="application/json" id="owllayer-woo-context">`, puis le bundle minifie, puis `OwlLayerWoo.init(...)`.
- Aucun fichier HTML concret n'existe dans `packages/woocommerce/` pour appliquer exactement ce flux de validation.

**APRES**

- Le package disposera d'une page HTML statique minimale servant de harness officiel pour verifier ce chemin d'initialisation hors WordPress.

**POURQUOI**

- Aujourd'hui, la documentation seule ne suffit pas a distinguer un probleme de chargement JS d'un probleme de runtime WooCommerce ou WordPress.

### 2. Le bundle cible existe deja et ne doit pas etre reconstruit par la feature

**AVANT**

- `packages/woocommerce/esbuild.config.mjs` produit deja `dist/owllayer-woocommerce.min.js` puis le copie vers `plugin/assets/owllayer-woocommerce.min.js`.
- La feature demandee n'a pas besoin d'ajouter un nouveau pipeline build, un nouveau bundle, ni un nouvel export.

**APRES**

- Le harness consommera uniquement le bundle deja build `./dist/owllayer-woocommerce.min.js` depuis le package `@owllayer/woocommerce`.

**POURQUOI**

- Le but est de tester le bundle minifie existant hors WordPress, pas de changer la chaine de build.

### 3. L'API publique a tester est deja stable et connue

**AVANT**

- `packages/woocommerce/src/index.ts` exporte `OwlLayerWoo`.
- `packages/woocommerce/src/OwlLayerWoo.ts` expose `init(config)` et lit le contexte JSON injecte via `WooContextBuilder`, avec `apiKey` comme minimum reel de configuration, `storeApiBase` par defaut sur `/wp-json/wc/store/v1`, et `siteUrl` auto-resolue si absente.

**APRES**

- Le harness exercera exactement cette surface publique existante, sans adapter le package ni ajouter de shim WordPress.

**POURQUOI**

- Le test doit mesurer si le JS "passe" hors WordPress sur la surface publique actuelle, pas sur une variante artificielle du runtime.

---

## Besoin

En tant que mainteneur WooCommerce OwlLayer, je veux une page HTML statique de harness pour charger le bundle minifie deja build et appeler `OwlLayerWoo.init(...)` hors WordPress, afin d'isoler rapidement les problemes de chargement JS des problemes propres au runtime WordPress/WooCommerce.

### User story

> En tant que developpeur du domaine WooCommerce, je veux ouvrir une page HTML statique qui injecte le contexte WooCommerce minimal et le bundle `dist/owllayer-woocommerce.min.js`, afin de verifier si le bootstrap JS casse deja hors WordPress avant toute investigation plugin ou PHP.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute un seul fichier HTML statique dans `packages/woocommerce/`.
- Charge le bundle deja build `./dist/owllayer-woocommerce.min.js`.
- Injecte un bloc JSON `#owllayer-woo-context` conforme a la documentation du package.
- Appelle `OwlLayerWoo.init(...)` depuis le global expose par le bundle minifie.
- Sert uniquement de harness de validation du bootstrap JS hors WordPress.

### Ce que cette feature ne fait PAS

- Ne modifie pas `src/`, `plugin/`, `dist/`, `package.json`, `esbuild.config.mjs` ni aucun autre fichier applicatif.
- Ne cree pas de mock WordPress, de nonce PHP, de faux Store API, de serveur Node, ni de fixture backend.
- Ne corrige pas les erreurs runtime pouvant survenir ensuite contre `/wp-json/wc/store/v1` hors WooCommerce reel.
- N'ajoute ni README local, ni note d'usage separee, ni documentation collaterale.
- Ne transforme pas ce harness en demo produit, page marketing, ou outillage de regression automatise.

> ⚠️ Toute extension au-dela de ce perimetre ouvre une nouvelle issue ou une nouvelle feature.

---

## Regles de design

- Domaine unique : `woocommerce` uniquement.
- Livraison implementation limitee a un seul nouveau fichier HTML.
- La source du script doit pointer vers le bundle existant `./dist/owllayer-woocommerce.min.js`.
- Le contexte doit rester injecte via le contrat documentaire `id="owllayer-woo-context"`.
- L'initialisation doit passer par `OwlLayerWoo.init(...)` sans wrapper, bundler secondaire, ni helper additionnel.
- Si l'objectif est d'observer le bootstrap depuis l'origine reelle qui sert la page, le harness ne doit pas forcer un `siteUrl` fictif different de cette origine.
- La page doit pouvoir etre servie par un serveur statique minimal depuis `packages/woocommerce/`.
- Si des erreurs reseau apparaissent ensuite faute de backend WooCommerce, elles doivent etre traitees comme un resultat d'observation, pas comme un motif d'elargissement implicite du scope.

---

## Codes stables

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `WOO-HARNESS-001` | Le harness charge un autre fichier que `dist/owllayer-woocommerce.min.js` | Refus de l'implementation |
| `WOO-HARNESS-002` | Le harness n'injecte pas le bloc `#owllayer-woo-context` | Refus de l'implementation |
| `WOO-HARNESS-003` | L'implementation ajoute un mock WordPress, une API fictive ou un shim runtime pour faire "comme si" | Refus car hors scope |
| `WOO-HARNESS-004` | Un fichier autre que le HTML autorise est modifie pendant l'implementation | Refus immediate |
| `WOO-HARNESS-005` | L'implementation cherche a corriger le runtime WooCommerce plutot qu'a observer le bootstrap hors WordPress | Stop et ouverture d'un document separe |

---

## Analyse d'impact

### Fonctionnalites existantes pouvant etre affectees

| Fonctionnalite | Impact | Mitigation |
| --- | --- | --- |
| Bundle IIFE `dist/owllayer-woocommerce.min.js` | Aucun changement de code | Le harness consomme l'artefact existant sans le modifier |
| API publique `OwlLayerWoo.init(...)` | Aucun changement d'API | Le harness ne fait qu'exercer l'API documentee |
| Plugin WordPress WooCommerce | Aucun | Aucun fichier plugin n'est touche |

### Packages touches

| Package | Modification | Retro-compatibilite |
| --- | --- | --- |
| `@owllayer/woocommerce` | Ajout d'un fichier HTML standalone de validation | ✅ Oui |

### Fichiers qui seront modifies

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `packages/woocommerce/static-harness.html` | absent | nouvelle page HTML statique chargeant `./dist/owllayer-woocommerce.min.js`, injectant `#owllayer-woo-context` et appelant `OwlLayerWoo.init(...)` | disposer d'un harness minimal pour tester le bootstrap JS hors WordPress sans toucher au runtime package |

> ⚠️ Tout fichier modifie en implementation qui ne figure pas dans ce tableau est un motif de refus.

### Fichiers qui ne seront PAS modifies

- `packages/woocommerce/src/**` : hors scope, aucune modification SDK ou runtime TypeScript
- `packages/woocommerce/plugin/**` : hors scope, aucun ajustement WordPress ou PHP
- `packages/woocommerce/dist/**` : hors scope, le bundle est un prerequis deja build, pas une sortie a modifier
- `packages/woocommerce/esbuild.config.mjs` : hors scope, aucune evolution de build
- `packages/woocommerce/package.json` : hors scope, aucune commande ou dependance additionnelle
- `packages/woocommerce/README.md` : hors scope, pas de documentation collaterale a ce stade

---

## Decoupage interne

## Phase 1 - Harness statique de validation du bootstrap minifie

**startIndex recommande** : 1

**AVANT**

- Le package n'a aucun harness HTML concret pour valider le chargement du bundle IIFE hors WordPress.

**APRES**

- Un fichier `packages/woocommerce/static-harness.html` permet de verifier visuellement et techniquement que le bundle minifie se charge et que `OwlLayerWoo.init(...)` demarre dans un navigateur sans dependance WordPress immediate.

**POURQUOI**

- Ce point de controle isole un echec de chargement JS d'un echec lie au runtime WordPress/WooCommerce.

### Service interface methods et contrats consommes

- `window.OwlLayerWoo`
- `OwlLayerWoo.init(config: OwlLayerWooConfig): Promise<void>`
- Bloc JSON `#owllayer-woo-context`
- Bundle existant `./dist/owllayer-woocommerce.min.js`

### Boilerplate libs a reutiliser

- Aucune lib additionnelle
- API navigateur native uniquement

### Etapes sequentielles

1. Creer `packages/woocommerce/static-harness.html` comme page autonome unique.
2. Injecter un contexte JSON minimal compatible avec la lecture attendue par le package.
3. Charger `./dist/owllayer-woocommerce.min.js` et appeler `OwlLayerWoo.init(...)` avec une configuration minimale orientee bootstrap.
4. Verifier manuellement que l'absence de WordPress ne produit pas de crash synchrone avant observation du runtime reseau.

---

## Gate de fin et criteres de validation

- [ ] L'implementation ne modifie qu'un seul fichier : `packages/woocommerce/static-harness.html`
- [ ] La page charge `./dist/owllayer-woocommerce.min.js` et non une copie, un CDN ou `plugin/assets/`
- [ ] La page injecte un bloc `#owllayer-woo-context`
- [ ] La page appelle explicitement `OwlLayerWoo.init(...)`
- [ ] Aucune dependance, aucun mock backend, aucun shim WordPress n'est ajoute
- [ ] L'ouverture de la page via un serveur statique minimal permet d'observer que le bundle se charge sans erreur de symbole WordPress ou de reference immediate a `OwlLayerWoo`
- [ ] Toute erreur reseau ulterieure vers le Store API, si elle apparait, reste documentee comme observation runtime hors scope et non comme motif de modifier `src/` ou `plugin/`
- [ ] La future PR reference ce document : `feat: ... (ref feature_28)`

---

## Ce qu'on ne fait pas

- On ne cree pas un environnement de test WooCommerce complet.
- On ne touche pas au plugin WordPress ni au bundle source.
- On ne promet pas un parcours panier/checkout fonctionnel hors backend WooCommerce reel.
- On ne rajoute pas de README, de script npm, de fixture JSON separee, de CSS dediee, ni de serveur auxiliaire.
- On ne convertit pas ce harness en outil de debug global multi-domaines.

---

## Hypotheses ouvertes

- Hypothese 1 : le signal attendu par l'utilisateur est la validation du chargement et de l'appel `OwlLayerWoo.init(...)`, pas l'absence totale de requetes reseau vers le Store API apres bootstrap.
- Hypothese 2 : servir la page depuis `packages/woocommerce/` est acceptable pour resoudre correctement `./dist/owllayer-woocommerce.min.js`.
- Hypothese 3 : aucun README local n'est necessaire si le nom du fichier et le canvas feature suffisent a guider l'implementation.

---

## Ordre de livraison recommande

1. Valider cette feature telle quelle avec le porteur du projet.
2. Implementer uniquement `packages/woocommerce/static-harness.html`.
3. Ouvrir la page via un serveur statique minimal depuis `packages/woocommerce/` et constater le comportement du bootstrap.
4. Si le bootstrap casse avant meme les appels reseau attendus, ouvrir ensuite une issue WooCommerce separee avec reproduction precise.