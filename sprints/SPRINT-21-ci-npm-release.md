---
mode: agent
description: >
  Sprint 21 - Mettre en place la CI du monorepo DomOS et une chaine de
  versioning, validation et publication securisee des packages @domos sur npm.
---

# Sprint 21 - CI et publication npm

> Objectif : rendre chaque pull request verifiable automatiquement et publier les packages publics `@domos/*` sur npm de facon reproductible, auditable et securisee.
>
> Base : `TODO.md`, sections `Publication npm` et `CI/CD`.
>
> Domaine : `infra`, puis mises a jour metadata des packages publics uniquement.
>
> Statut : A VALIDER.

## 0. Perimetre verrouille

La publication npm concerne **uniquement les packages presents dans `packages/`**.

- `packages/*` : seuls candidats a l'audit, au packaging et a la publication npm ;
- `apps/*` : jamais publies sur npm dans ce sprint ;
- `plugins/*` : jamais publies sur npm dans ce sprint ;
- `docs-site/` et `apps/docs-site/` : jamais publies sur npm dans ce sprint ;
- les fichiers racine, `.changeset/`, `.github/workflows/`, `scripts/` et la documentation peuvent etre modifies uniquement pour piloter, verifier et documenter la CI/release des packages de `packages/`.

Dans `packages/`, les packages portant deja `private: true` restent exclus de la publication tant qu'une decision produit distincte n'autorise pas leur passage en public.

## 1. Probleme et preuves dans le workspace

Le monorepo utilise pnpm 9 et Turborepo, mais il ne dispose pas encore d'une chaine de livraison publique :

- `.github/workflows/` n'existe pas ; aucun build ou test n'est execute sur les pull requests ;
- `Dangerfile.js` existe, mais aucun workflow ne l'execute ;
- Changesets n'est ni installe ni configure ;
- les 13 packages publics sont tous en version `0.1.0` et aucun ne declare `publishConfig.access: public` ;
- `@domos/adapter-openai`, `@domos/svelte` et `@domos/vue` ne declarent pas `files` ;
- plusieurs packages n'ont pas encore de script `lint` ou `test` ; ce manque doit etre documente et ne doit pas etre masque par un faux script ;
- les dependances internes utilisent `workspace:*` ; la tarball finale doit contenir des versions npm resolues et jamais un specifier `workspace:*` ;
- le README ne montre aucun badge de statut CI.

### Packages npm cibles

| Ordre de dependance | Packages publics |
| --- | --- |
| 1 | `@domos/core`, `@domos/audio` |
| 2 | `@domos/ui`, `@domos/browser`, `@domos/adapter-anthropic`, `@domos/adapter-google`, `@domos/adapter-openai`, `@domos/adapter-livekit` |
| 3 | `@domos/react`, `@domos/vue`, `@domos/svelte`, `@domos/angular`, `@domos/server` |

`@domos/shopify` et `@domos/woocommerce`, bien que situes dans `packages/`, restent exclus car `private: true`. Les apps, plugins et sites de documentation ne sont ni candidats ni publies sur npm.

## 2. Scenario attendu

### Pull request

1. Un contributeur ouvre ou met a jour une PR.
2. GitHub Actions installe exactement `pnpm-lock.yaml` avec `pnpm install --frozen-lockfile`.
3. La CI lance le lint, les tests et le build du monorepo.
4. Danger s'execute sur la PR sans disposer d'un secret npm.
5. La PR ne peut pas etre fusionnee si un gate obligatoire echoue.

### Release

1. Une modification publiable contient un fichier Changeset indiquant les packages, le niveau SemVer et le resume.
2. La branche principale maintient une PR de version qui met a jour versions et changelogs.
3. Apres validation de cette PR, le workflow de release reconstruit et reteste le depot.
4. La publication npm utilise OIDC Trusted Publishing depuis un runner GitHub heberge, sans token npm longue duree.
5. Seuls les packages dont la version n'existe pas encore sont publies, avec acces public et provenance.
6. Les tags et GitHub Releases correspondent aux versions effectivement publiees.
7. Un smoke test installe les packages depuis le registre npm, jamais depuis le workspace local.

## 3. Invariants de livraison

- Aucun secret npm, cle LLM, cle LiveKit ou fichier `.npmrc` authentifie n'est commite.
- Le job de PR a uniquement `contents: read` ; `id-token: write` est limite au job de publication.
- Le job de publication utilise un `environment` GitHub `npm-production` avec approbation si cette option est disponible sur le depot.
- Les workflows npm tournent sur un runner GitHub heberge. Le Trusted Publishing npm ne doit pas etre branche sur un runner self-hosted.
- La version de Node du workflow de release doit satisfaire npm Trusted Publishing : Node `>=22.14.0` et npm CLI `>=11.5.1` au moment de ce sprint.
- `pnpm install --frozen-lockfile` est obligatoire en CI.
- Une tarball est inspectee avant toute publication ; une compilation locale reussie ne suffit pas.
- Les packages prives restent prives.
- La CI ne requiert aucune cle de fournisseur externe pour les tests unitaires.

## 4. Decisions a valider avant implementation

1. Confirmer que le scope npm `@domos` appartient au porteur du projet et que le compte de publication peut creer les 13 packages.
2. Confirmer la branche par defaut reelle (`main` supposee dans ce sprint).
3. Choisir le mode Changesets : versions independantes recommandees ; ne pas utiliser un groupe `fixed` sans decision produit explicite.
4. Confirmer le depot canonique attendu dans `repository.url` pour tous les packages.
5. Decider si le tout premier publish est effectue manuellement avec un token granulaire temporaire, lorsque npm exige que le package existe avant de lui associer un Trusted Publisher. Le token doit etre revoque des que les 13 relations OIDC sont configurees.
6. Confirmer si la protection de branche rend `CI / quality` obligatoire avant merge.

## 5. Plan d'implementation concret

### Phase A - Baseline et inventaire

- [ ] Creer une branche dediee `chore/ci-npm-release`.
- [ ] Relever `git status` et ne pas inclure les changements preexistants hors scope.
- [ ] Executer la baseline depuis la racine `domos/` :

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

- [ ] Documenter chaque echec preexistant avant de modifier l'infrastructure. Ne pas reduire le gate pour rendre artificiellement la CI verte.
- [ ] Construire une matrice des 13 packages : nom, dependances internes, scripts disponibles, fichiers exportes et ordre de publication.

### Phase B - Verrouiller le contrat des packages

Pour chaque package public, verifier et corriger uniquement les metadata de publication :

- [ ] `name`, `version`, `description`, `license`, `repository`, `homepage` et `bugs` ;
- [ ] `files`, limite a `dist` et aux documents reellement necessaires ;
- [ ] `main`, `types` et `exports`, en verifiant que chaque chemin existe apres build ;
- [ ] `publishConfig.access: public` ;
- [ ] `engines.node` seulement si la compatibilite est prouvee par la CI ;
- [ ] `sideEffects` seulement apres inspection du comportement des bundles CSS/runtime ;
- [ ] repartition correcte entre `dependencies`, `peerDependencies` et `devDependencies` ;
- [ ] exclusion maintenue pour les packages `private: true`.

Ecarts deja prouves a traiter :

| Package | Correction minimale connue |
| --- | --- |
| Tous les 13 packages publics | Ajouter et verifier `publishConfig.access: public` ainsi que les metadata de depot/licence |
| `@domos/adapter-openai` | Ajouter `files`; verifier l'absence actuelle de gates `lint`/`test` sans inventer de tests vides |
| `@domos/vue` | Ajouter `files`; verifier que les fichiers `.vue` requis sont bien presents dans la tarball |
| `@domos/svelte` | Ajouter `files`; verifier les artefacts Svelte publies |
| Tous les packages avec `workspace:*` | Verifier la reecriture en versions npm dans la tarball generee |

Pour chaque package public :

```bash
pnpm --filter <package> build
pnpm --filter <package> pack --pack-destination .artifacts/packs
npm pack --dry-run
```

Le controle de tarball doit verifier : taille raisonnable, absence de `src/`, tests, secrets et fichiers internes, presence des `.js`, `.d.ts`, assets requis, et resolution correcte de chaque dependance `@domos/*`.

### Phase C - Installer Changesets

- [ ] Ajouter `@changesets/cli` aux `devDependencies` racine et mettre a jour `pnpm-lock.yaml`.
- [ ] Creer `.changeset/config.json` avec `access: public`, `baseBranch: main`, versions independantes et packages prives ignores.
- [ ] Conserver `.changeset/README.md` genere pour le workflow contributeur.
- [ ] Ajouter les scripts racine :

```json
{
  "changeset": "changeset",
  "version-packages": "changeset version",
  "release": "pnpm build && changeset publish"
}
```

- [ ] Ajouter dans `CONTRIBUTING.md` la regle SemVer et les commandes `pnpm changeset`, `pnpm version-packages` et `pnpm release`.
- [ ] Definir explicitement les changements qui ne requierent pas de Changeset : documentation seule, tests seuls et infrastructure sans changement de package publie.
- [ ] Tester `pnpm changeset status` sur une branche avec un Changeset de test, puis retirer ce Changeset avant handoff s'il ne correspond pas a une vraie release.

### Phase D - Creer la CI pull request

Creer `.github/workflows/ci.yml` :

- [ ] triggers `pull_request` et `push` sur la branche principale ;
- [ ] `permissions: contents: read` ;
- [ ] annulation des executions obsoletes via `concurrency` ;
- [ ] checkout, installation pnpm depuis le champ `packageManager`, installation Node LTS et cache pnpm ;
- [ ] `pnpm install --frozen-lockfile` ;
- [ ] `pnpm lint`, `pnpm test`, puis `pnpm build` ;
- [ ] timeout explicite et noms stables pour les branch protection rules ;
- [ ] aucun secret de production expose aux jobs de PR, notamment aux PR de forks.

Si les tests sont trop longs, la premiere optimisation autorisee est Turborepo et son cache local GitHub. Le cache distant Vercel et ses secrets restent hors scope tant qu'un besoin mesure n'est pas documente.

### Phase E - Brancher Danger

Creer `.github/workflows/danger.yml` ou un job dedie dans `ci.yml` :

- [ ] executer uniquement sur `pull_request` ;
- [ ] fournir les permissions minimales necessaires aux commentaires de PR ;
- [ ] utiliser le `GITHUB_TOKEN` ephemere et aucun token npm ;
- [ ] verifier que `Dangerfile.js` s'execute avec les dependances reellement declarees ;
- [ ] ne pas utiliser `pull_request_target` avec du code non fiable de la PR.

### Phase F - Automatiser version et publication

Creer `.github/workflows/release.yml` :

- [ ] trigger sur la branche principale pour creer/mettre a jour la PR de version Changesets ;
- [ ] serialiser les releases avec `concurrency` ;
- [ ] donner `contents: write` et `pull-requests: write` uniquement au job de version ;
- [ ] executer installation figee, lint, tests et build avant toute publication ;
- [ ] utiliser `changesets/action` pour la PR de version ;
- [ ] publier seulement apres fusion/validation de la PR de version ;
- [ ] utiliser un job distinct `publish` avec `contents: read` et `id-token: write` ;
- [ ] configurer `registry-url: https://registry.npmjs.org` ;
- [ ] installer une version npm compatible OIDC et afficher `node --version`, `npm --version`, `pnpm --version` ;
- [ ] lancer `pnpm release` sans `NPM_TOKEN` permanent une fois Trusted Publishing active ;
- [ ] produire les tags et GitHub Releases correspondant aux packages publies ;
- [ ] ne jamais republier une version existante ; un rerun doit etre idempotent ou echouer avant mutation partielle.

Le workflow exact doit etre valide contre la version courante de `changesets/action`. Sa documentation historique de publication par token ne doit pas conduire a conserver un token longue duree si le chemin OIDC fonctionne.

### Phase G - Bootstrap et securisation npm

- [ ] Activer le 2FA sur le compte npm proprietaire du scope.
- [ ] Reserver/verifier le scope `@domos`.
- [ ] Effectuer, si necessaire, un premier publish controle dans l'ordre de dependance defini en section 1.
- [ ] Configurer pour chacun des 13 packages le Trusted Publisher GitHub Actions avec organisation, depot et nom exact `release.yml`.
- [ ] Verifier la correspondance exacte de `repository.url` avec le depot GitHub canonique.
- [ ] Tester une release patch sur un sous-ensemble sans casser la coherence des dependances internes.
- [ ] Verifier sur npm : acces public, provenance, contenu de tarball, README, licence, liens depot et versions de dependances.
- [ ] Revoquer le token temporaire de bootstrap et interdire les tokens de publication si la configuration npm le permet.
- [ ] Conserver dans GitHub uniquement les secrets strictement necessaires a d'autres usages ; aucun `NPM_TOKEN` d'ecriture apres migration OIDC.

### Phase H - Smoke tests depuis npm

Creer `scripts/verify-npm-install.mjs` et/ou des fixtures temporaires generees dans le runner. Les fixtures servent uniquement a verifier les packages de `packages/`, ne doivent pas importer le workspace local et ne doivent pas modifier les applications de `apps/`.

- [ ] Creer un repertoire temporaire vide avec son propre `package.json` et sans `pnpm-workspace.yaml` parent.
- [ ] Installer les versions publiees depuis `https://registry.npmjs.org`.
- [ ] Tester au minimum :

| Cible | Verification |
| --- | --- |
| Core | import ESM et chargement des types |
| React | compilation d'un composant minimal avec React/ReactDOM peers |
| Vue | compilation d'une app minimale et resolution des composants `.vue` publies |
| Svelte | compilation d'une app minimale avec le peer Svelte |
| Angular | compilation TypeScript/Angular avec peers compatibles |
| Browser | import ESM, sous-chemin `/core` et presence de l'artefact `/cdn` |
| Server + adapters | import Node ESM et resolution des dependances internes publiees |

- [ ] Echouer si une dependance installee contient encore `workspace:*`.
- [ ] Executer le smoke test apres publication et permettre un lancement manuel cible sur une version donnee.
- [ ] Televerser les rapports de pack/smoke comme artefacts GitHub en cas d'echec, sans secrets.

### Phase I - Visibilite et documentation

- [ ] Ajouter le badge du workflow CI dans `README.md` et `README_EN.md` avec l'URL du depot canonique.
- [ ] Ajouter un runbook `docs/RELEASING.md` couvrant : Changeset, PR de version, approbation de l'environment, publish, verification npm, rerun et rollback par deprecation.
- [ ] Documenter qu'une version npm publiee est immuable : ne pas tenter de l'ecraser ; publier un correctif ou utiliser `npm deprecate` en cas d'incident.
- [ ] Cocher dans `TODO.md` uniquement les elements reellement verifies : configuration versioning, audit package, publication, installation vierge, CI PR, release automatisee et badge.

## 6. Fichiers autorises et probables

| Fichier ou zone | Raison |
| --- | --- |
| `package.json` | Scripts Changesets et dependance de developpement |
| `pnpm-lock.yaml` | Verrouillage de `@changesets/cli` et action locale eventuelle |
| `.changeset/config.json`, `.changeset/README.md` | Politique de versioning et usage contributeur |
| `.github/workflows/ci.yml` | Gates PR et branche principale |
| `.github/workflows/danger.yml` | Controle Danger sur PR, si non integre a `ci.yml` |
| `.github/workflows/release.yml` | PR de version et publication npm securisee |
| `packages/*/package.json` pour les 13 packages publics | Metadata, exports, files et publication publique |
| `scripts/verify-packages.mjs` | Audit automatise des manifests et tarballs, si necessaire |
| `scripts/verify-npm-install.mjs` | Smoke tests depuis le registre public |
| `CONTRIBUTING.md` | Workflow Changesets pour contributeurs |
| `docs/RELEASING.md` | Runbook mainteneur |
| `README.md`, `README_EN.md` | Badge CI et liens npm |
| `TODO.md` | Etat reel apres verification uniquement |
| `sprints/SPRINT-21-ci-npm-release.md` | Cloture d'implementation |

Toute necessite de modifier du code dans `packages/*/src`, une app de demo, `turbo.json` ou `pnpm-workspace.yaml` doit etre prouvee puis ajoutee explicitement au sprint avant edition.

## 7. Tests et commandes de gate

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm changeset status
pnpm exec changeset status
```

Par package public :

```bash
pnpm --filter <package> build
pnpm --filter <package> pack --pack-destination .artifacts/packs
```

Apres publication :

```bash
npm view <package>@<version> version dist.tarball dist.integrity --json
node scripts/verify-npm-install.mjs --version <version>
```

Gates GitHub a observer :

- PR depuis une branche interne ;
- PR depuis un fork sans acces aux secrets ;
- changement docs-only ;
- changement d'un package avec Changeset ;
- PR de version Changesets ;
- publication patch reussie ;
- rerun sans double publication ;
- echec volontaire avant publish pour prouver qu'aucune mutation npm n'a lieu.

## 8. Definition Of Done

- [ ] La CI est verte sur une PR et sur la branche principale avec installation figee, lint, tests et build.
- [ ] Danger s'execute sur PR avec permissions minimales.
- [ ] Les 13 packages publics ont des manifests complets et coherents.
- [ ] Les tarballs ne contiennent que les artefacts attendus et aucun secret/fichier interne.
- [ ] Aucun manifest publie ne contient `workspace:*`.
- [ ] Les packages prives ne peuvent pas etre publies.
- [ ] Changesets gere les versions et changelogs du monorepo.
- [ ] Le workflow de release ne publie qu'apres les gates qualite.
- [ ] La publication courante utilise OIDC Trusted Publishing sur runner GitHub heberge.
- [ ] Aucun token npm d'ecriture longue duree ne subsiste apres le bootstrap.
- [ ] La provenance npm est visible pour les packages publies depuis le depot public.
- [ ] Les smoke tests React, Vue, Svelte, Angular, Browser, Core et Server/adapters installent depuis npm et passent.
- [ ] Le badge CI est present dans les deux README.
- [ ] `docs/RELEASING.md` permet a un mainteneur d'executer et diagnostiquer une release sans deviner.
- [ ] Les protections de branche utilisent les noms de jobs stables documentes.
- [ ] Le sprint contient sa cloture reelle avec fichiers, commandes, resultats et ecarts residuels.

## 9. Hors scope

- Passage du depot GitHub de prive a public et nettoyage des documents internes.
- Deploiement GitHub Pages des docs ; il doit suivre dans un sprint dedie apres stabilisation de la CI.
- Deploiement du serveur de demo, Docker, cloud, CORS, quotas et rate limiting.
- Publication de `@domos/shopify`, `@domos/woocommerce`, de tout contenu hors `packages/`, des apps ou des plugins prives.
- Modification des `package.json` sous `apps/`, `plugins/`, `docs-site/` ou `apps/docs-site/` pour les rendre publiables.
- Cache distant Turborepo, runners self-hosted et matrice multi-OS.
- Refactor du code source ou ajout de tests fonctionnels sans lien direct avec le packaging.
- Modification fonctionnelle des APIs publiques.

## 10. Risques et mesures

| Risque | Mesure obligatoire |
| --- | --- |
| Publication partielle du graphe | Build complet, ordre de dependance, Changesets et smoke test registre |
| Token npm compromis | OIDC, permissions minimales, token de bootstrap temporaire puis revocation |
| Package vide ou exports casses | `pack`, inspection tarball et fixtures d'installation vierges |
| `workspace:*` publie | Inspection automatisee des manifests contenus dans les tarballs |
| Double publication au rerun | Verification de version existante et publication idempotente |
| PR de fork exfiltrant un secret | Aucun secret dans CI PR et interdiction de `pull_request_target` pour executer le code PR |
| Package prive publie | `private: true`, liste d'exclusion Changesets et assertion automatisee |
| Release non reproductible | lockfile fige, versions d'outils affichees et runner defini |

## 11. Cloture d'implementation obligatoire

L'implementer complete cette section avant handoff. Une case DoD ne peut etre cochee que si la preuve existe.

### Fichiers crees

- A renseigner.

### Fichiers modifies

- A renseigner.

### Commandes et resultats

- A renseigner avec commande exacte, exit code et resume.

### Publications verifiees

- A renseigner avec package, version, URL npm et statut de provenance.

### Ecarts residuels ou hors scope

- A renseigner ; ecrire `Aucun` seulement apres verification.

Le reviewer compare ensuite les cases cochees avec le diff reel, les logs CI, les tarballs et les pages npm. Les cases seules ne constituent pas une preuve.

## 12. Commits recommandes

Livrer en commits auditables, sans melanger metadata et workflows :

```text
chore(release): configure changesets and npm package metadata
ci: add pull request quality gates
ci(release): publish @domos packages with npm trusted publishing
test(release): verify npm tarballs and clean installs
docs: document the DomOS release workflow
```

## 13. References de mise en oeuvre

- npm Trusted Publishing : verifier les prerequis OIDC, Node et npm CLI au jour de l'implementation.
- npm provenance : attendue automatiquement avec Trusted Publishing pour un depot et des packages publics.
- GitHub Actions : publication de packages Node.js et permissions OIDC minimales.
- Changesets : versioning SemVer, reecriture des dependances internes, PR de version et publication monorepo.
