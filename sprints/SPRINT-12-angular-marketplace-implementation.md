---
mode: agent
description: >
  Sprint 12 - Transformer apps/demo-angular en demo produit marketplace de
  petites annonces en consommant uniquement l'API publique de @domos/angular,
  sans ouvrir core, ui ni backend.
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - create_file
  - run_in_terminal
  - grep_search
  - file_search
  - get_errors
---

# Sprint 12 - Angular Marketplace Implementation

**Base :** Sprint 11 livre, feature 26 fermee, domaine Angular deja valide au niveau SDK  
**Perimetre :** `domos/apps/demo-angular/` uniquement, hors consommation de l'API publique `@domos/angular`  
**Reference CDC :** `domos/features/feature_27_demo_angular_classifieds_marketplace.md`

---

## Objectif

Livrer le sprint produit unique de la feature 27 : transformer `apps/demo-angular` en demo marketplace de petites annonces type Leboncoin, en restant sur une source de verite locale et en consommant uniquement l'API publique de `@domos/angular`.

Le livrable de Sprint 12 est une demo produit exploitable. Ce sprint ne rouvre pas de chantier SDK, ne touche pas `packages/core/**`, ne touche pas `packages/ui/**` et n'absorbe aucun besoin backend.

---

## AVANT

- `apps/demo-angular` sort de Sprint 11 comme app de validation SDK, pas comme demo produit.
- aucun modele local de petites annonces n'est encore stabilise.
- aucun parcours marketplace complet n'est encore livre dans la demo Angular.

## APRES

- `apps/demo-angular` devient une demo Angular de petites annonces type Leboncoin.
- la source de verite reste locale a l'application.
- DomOS agit sur des tools metier marketplace en passant uniquement par `@domos/angular`.

## POURQUOI

- la feature 27 est un sprint produit, pas une extension diffuse de la feature 26.
- la demo Angular doit prouver un cas usage produit coherent sans ouvrir backend, auth ou paiements.
- si une API `@domos/angular` manque, il faut stopper et ouvrir un nouveau document Angular, pas patcher le SDK opportunistement dans le sprint produit.

---

## Perimetre strict

### Ce que Sprint 12 fait

- transforme `apps/demo-angular` en demo marketplace de petites annonces
- introduit un modele local d'annonces, de filtres et de favoris dans l'application Angular
- livre un parcours produit minimum : liste, detail, depot edition, favoris
- enregistre des tools DomOS du domaine marketplace via l'API publique `@domos/angular`

### Ce que Sprint 12 ne fait pas

- ne modifie pas `packages/core/**`
- ne modifie pas `packages/ui/**`
- ne modifie pas `packages/angular/**`
- n'ajoute pas de backend, d'auth, de paiement, de messagerie temps reel ni d'upload media
- ne convertit pas la demo Angular en copie de `apps/demo/` ou `apps/demo-vue/`

---

## Regles de design

- le produit cible est une marketplace de petites annonces entre particuliers, pas un checkout e-commerce
- la source de verite reste locale a `apps/demo-angular` pour tout le sprint
- les primitives DomOS viennent uniquement de l'API publique `@domos/angular`
- si une API `@domos/angular` manque, STOP et nouveau document Angular ; aucun patch SDK opportuniste dans ce sprint
- le design peut etre realiste et lisible, mais sans ouvrir de chantier design system transverse

---

## Codes stables de validation

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-MARKET-001` | la demo ne livre pas le parcours liste, detail, depot edition et favoris | Refus du sprint |
| `ANGULAR-MARKET-002` | la demo reste branchee sur `demo_echo` ou sur des tools de smoke test | Refus tant que le domaine produit n'est pas porte par les tools |
| `ANGULAR-MARKET-003` | la demo introduit backend, auth, upload media, paiement ou messagerie temps reel | Refus car hors scope MVP |
| `ANGULAR-MARKET-004` | la demo modifie `packages/core/**` ou `packages/ui/**` pour compenser un manque applicatif | Refus car mauvais domaine |
| `ANGULAR-MARKET-005` | la demo implemente directement des primitives DomOS au lieu de consommer `@domos/angular` | Refus tant que le package Angular reste la seule surface officielle |
| `ANGULAR-MARKET-006` | une exigence SDK apparait pendant l'implementation produit | STOP et ouverture d'un nouveau document Angular separe |

---

## Phase 1 - Modele local marketplace et store Angular

**startIndex recommande :** 1

**AVANT**

- `apps/demo-angular` ne porte aucun modele produit marketplace.

**APRES**

- un modele local d'annonces, favoris et filtres existe dans l'application Angular.

**POURQUOI**

- la demo produit a besoin d'une source de verite locale claire avant toute orchestration DomOS.

### Service interface methods visees

- `ListingsStoreService.list(filters?: ListingFilters): ListingSummary[]`
- `ListingsStoreService.getById(id: string): ListingDetail | null`
- `ListingsStoreService.createListing(input: CreateListingInput): ListingDetail`
- `ListingsStoreService.updateListing(id: string, input: UpdateListingInput): ListingDetail | null`
- `ListingsStoreService.toggleFavorite(id: string): boolean`
- `ListingsStoreService.favoriteIds(): Signal<string[]>`

### Boilerplate libs a reutiliser

- Angular signals et computed
- `@angular/forms` si formulaire template ou reactive forms retenu

## Phase 2 - Parcours produit petites annonces

**startIndex recommande :** 2

**AVANT**

- la demo Angular n'a ni routes produit ni composants metier petites annonces.

**APRES**

- la demo livre une page liste, une page detail, une page depot edition et une page favoris.

**POURQUOI**

- c'est le minimum d'une experience type Leboncoin sans sortir du MVP local.

### Service interface methods visees

- `ListingFiltersService.setQuery(query: string): void`
- `ListingFiltersService.setCategory(category: string | null): void`
- `ListingFiltersService.setPriceRange(min?: number, max?: number): void`
- `ListingFiltersService.reset(): void`

### Boilerplate libs a reutiliser

- `@angular/router`
- composants standalone Angular

## Phase 3 - Tools DomOS du domaine marketplace

**startIndex recommande :** 3

**AVANT**

- la demo n'expose pas encore de tools metier marketplace coherents.

**APRES**

- la demo expose un set de tools DomOS aligne sur le domaine petites annonces.

**POURQUOI**

- DomOS doit agir sur le produit reel, pas sur un ecran de smoke test.

### Service interface methods visees

- `registerMarketplaceTools(): VoidFunction`
- consommation exclusive de `registerToolResolver`, `registerNavigationTool`, `registerContext` et `subscribeEvent` issues de `@domos/angular`

### Boilerplate libs a reutiliser

- `@domos/angular`
- `zod` si les schemas de tools doivent etre explicites cote app

## Phase 4 - Gate finale demo produit Angular

**startIndex recommande :** 4

**AVANT**

- aucun verdict binaire n'existe sur la bascule de `apps/demo-angular` en demo produit marketplace.

**APRES**

- le sprint se ferme sur une validation explicite du parcours produit et du respect strict du perimetre Angular demo.

**POURQUOI**

- le principal risque est de livrer une UI produit qui recasse les bornes SDK ou les bornes de domaine.

### Service interface methods visees

- aucune nouvelle methode
- gate sur les services et primitives deja livres dans les phases precedentes

### Boilerplate libs a reutiliser

- scripts `pnpm --filter`
- tests Angular deja en place dans `apps/demo-angular`

---

## Organisation cible des fichiers

Sprint 12 ne doit pas replonger dans un `app/` fourre-tout. La cible est une demo produit Angular claire, avec le wiring DomOS separe du domaine marketplace.

```text
apps/demo-angular/src/app/
  app.component.ts
  app.config.ts
  app.routes.ts
  core/
    register-demo-tools.ts
  marketplace/
    models/
      listing.types.ts
    store/
      listings.store.ts
      listing-filters.service.ts
    pages/
      HomePageComponent.ts
      ListingDetailPageComponent.ts
      EditListingPageComponent.ts
      FavoritesPageComponent.ts
    components/
      ListingCardComponent.ts
      SearchFiltersComponent.ts
```

- `core/` garde le wiring DomOS a part du domaine produit.
- `marketplace/models/` porte le contrat metier local.
- `marketplace/store/` porte la source de verite locale et les filtres.
- `marketplace/pages/` couvre le parcours produit.
- `marketplace/components/` regroupe les briques visuelles reutilisables.
- pas de dossier `services/` global si la logique reste purement marketplace locale.

---

## Fichiers cibles

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `apps/demo-angular/src/app/app.component.ts` | shell de validation SDK | shell produit marketplace Angular | porter la demo finale dans l'app racine |
| `apps/demo-angular/src/app/app.config.ts` | bootstrap de demo SDK | bootstrap aligne sur routes, store et parcours produit | brancher la demo produit sans toucher le SDK |
| `apps/demo-angular/src/app/app.routes.ts` | routes de validation SDK | routes produit liste, detail, edition, favoris | rendre le parcours produit navigable |
| `apps/demo-angular/src/app/core/register-demo-tools.ts` | tools de validation SDK a la racine `app/` | tools metier marketplace ranges dans `core/` | separer le wiring DomOS du domaine produit |
| `apps/demo-angular/src/app/marketplace/models/listing.types.ts` | absent | types annonces, filtres et payloads locaux | fixer le contrat local du domaine |
| `apps/demo-angular/src/app/marketplace/store/listings.store.ts` | absent | source de verite locale des annonces et favoris | centraliser l'etat produit local |
| `apps/demo-angular/src/app/marketplace/store/listing-filters.service.ts` | absent | gestion de recherche et filtres | eviter la logique dispersee dans les pages |
| `apps/demo-angular/src/app/marketplace/pages/HomePageComponent.ts` | absent | page liste des annonces | point d'entree marketplace |
| `apps/demo-angular/src/app/marketplace/pages/ListingDetailPageComponent.ts` | absent | page detail annonce | couvrir la consultation produit |
| `apps/demo-angular/src/app/marketplace/pages/EditListingPageComponent.ts` | absent | page depot edition d'annonce | couvrir create et update local |
| `apps/demo-angular/src/app/marketplace/pages/FavoritesPageComponent.ts` | absent | page favoris | couvrir une boucle d'usage essentielle |
| `apps/demo-angular/src/app/marketplace/components/ListingCardComponent.ts` | absent | carte d'annonce reutilisable | stabiliser l'affichage liste |
| `apps/demo-angular/src/app/marketplace/components/SearchFiltersComponent.ts` | absent | composant de recherche et filtres | porter le filtrage sans dupliquer l'UI |

---

## Gate fin de sprint

- [ ] `apps/demo-angular` livre une demo marketplace de petites annonces type Leboncoin
- [ ] la source de verite reste locale a l'application
- [ ] la demo livre liste, detail, depot edition et favoris
- [ ] les tools DomOS exposes sont des tools metier marketplace
- [ ] la demo consomme uniquement l'API publique de `@domos/angular`
- [ ] aucun changement `packages/core/**` ou `packages/ui/**` n'a ete absorbe
- [ ] aucun backend, auth, paiement, messagerie temps reel ou upload media n'a ete ajoute

---

## Ce qu'on ne fait pas

- pas de backend marketplace
- pas d'auth
- pas de paiement
- pas de messagerie temps reel
- pas d'upload media
- pas de modification `packages/core/**`
- pas de modification `packages/ui/**`
- pas de patch opportuniste de `@domos/angular` depuis le sprint produit
