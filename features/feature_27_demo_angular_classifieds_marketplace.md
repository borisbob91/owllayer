# Feature #27 : Demo Angular marketplace de petites annonces type Leboncoin

**Statut** : 🔵 Proposition  
**Domaine** : angular  
**Porteur** : @BorisBob  
**Valide par** : a confirmer  
**Date** : 2026-04-06

---

## Positionnement MVP

Cette feature est la phase produit de la demande.

Elle ne doit demarrer qu'apres validation de la feature 26.

Le repo actuel prouve deja deux choses :

- Angular existe maintenant comme domaine bootstrappe et gate minimalement.
- Angular ne dispose pas encore des patterns SDK suffisants pour qu'une vraie application produit soit un bon point d'appui.

Conclusion : la transformation de `apps/demo-angular` en application de petites annonces ne doit pas etre absorbee dans la meme feature que la parite SDK. Ce serait un fourre-tout et cela laisserait la demo dicter les APIs du package Angular.

---

## Diagnostic actuel

### 1. Les demos de reference ne sont pas homothetiques

**AVANT**

- `apps/demo/` est une demo React de boutique e-commerce acheteur avec catalogue, panier, favoris et checkout.
- `apps/demo-vue/` est une demo Vue de dashboard admin avec CRUD catalogue.
- `apps/demo-angular/` est encore une demo de gate sans scenario produit.

**APRES vise**

- `apps/demo-angular/` devient une troisieme famille de demo : marketplace de petites annonces entre particuliers, avec ses propres flux produit.

**POURQUOI**

- Demander a Angular d'etre "comme React et Vue" ne signifie pas recopier l'e-commerce React ou le back-office Vue. La bonne lecture est : meme niveau de maturite applicative, mais scenario produit adapte a la cible Leboncoin.

### 2. Le scenario "vente de produits d'occasion" est un nouveau domaine de demo

**AVANT**

- Aucun modele d'annonce, aucun detail d'annonce, aucun depot d'annonce, aucun favoris d'annonces n'existe dans `apps/demo-angular`.

**APRES vise**

- Une vraie app Angular de petites annonces livre un parcours coherent : explorer des annonces, filtrer, voir une fiche, publier une annonce, suivre ses favoris.

**POURQUOI**

- Sans ce minimum, la demo resterait un exercice de SDK et non une preuve produit utilisable.

---

## Besoin

En tant qu'utilisateur de la demo Angular DomOS, je veux manipuler une vraie application de petites annonces de biens d'occasion, afin de voir DomOS agir dans un scenario produit credibile et non dans un simple ecran de gate technique.

### User story

> En tant qu'utilisateur de la demo Angular, je veux rechercher des annonces, consulter leur detail, publier ma propre annonce et gerer mes favoris, afin de tester DomOS dans une experience proche d'un site type Leboncoin.

---

## Perimetre strict

### Ce que cette feature fait

- Transforme `apps/demo-angular` en application Angular de petites annonces.
- Reutilise les primitives `@domos/angular` validees par la feature 26.
- Introduit un modele local d'annonces et un parcours produit coherent.
- Fait porter a DomOS les actions utiles du domaine petites annonces : navigation, recherche, filtrage, favoris, creation ou edition locale d'annonce.

### Ce que cette feature ne fait PAS

- Ne modifie pas `packages/core/**`.
- Ne modifie pas `packages/ui/**`.
- N'ouvre pas de backend marketplace, ni persistence serveur, ni authentification.
- N'ouvre pas de paiement, de livraison, de moderation, ni de messagerie vendeur/acheteur temps reel.
- Ne transforme pas la demo Angular en copie de `apps/demo/` ou `apps/demo-vue/`.

> Toute fonctionnalite de plateforme reelle hors de ce MVP doit ouvrir un nouveau document.

---

## Regles de design

- Le produit cible est une marketplace de petites annonces, pas un checkout e-commerce.
- La source de verite reste locale a `apps/demo-angular` pour ce MVP.
- Les primitives DomOS doivent venir du package `@domos/angular`, pas d'un bricolage local.
- Si la demo a besoin d'une nouvelle API package Angular non prevue par la feature 26, l'implementation s'arrete et un nouveau document Angular est ouvert.
- La demo doit etre navigable, lisible et realiste sur desktop et mobile, mais sans ouvrir un chantier design system global.

---

## Codes stables

| Code | Declencheur | Decision attendue |
| --- | --- | --- |
| `ANGULAR-MARKET-001` | La demo ne livre pas un parcours petites annonces complet avec liste, detail, depot et favoris | Refus de la feature |
| `ANGULAR-MARKET-002` | La demo reste branchee sur `demo_echo` ou sur des tools de smoke test | Refus tant que le domaine produit n'est pas porte par les tools |
| `ANGULAR-MARKET-003` | La demo introduit backend, auth, upload media, paiement ou messagerie temps reel | Refus car hors scope MVP |
| `ANGULAR-MARKET-004` | La demo modifie `packages/ui/**` ou `packages/core/**` pour compenser un manque applicatif | Refus car mauvais domaine |
| `ANGULAR-MARKET-005` | La demo implemente directement des primitives DomOS au lieu de consommer `@domos/angular` | Refus tant que le package Angular n'est pas la surface officielle |
| `ANGULAR-MARKET-006` | Une nouvelle exigence SDK apparait pendant la demo | Stop et ouverture d'une nouvelle feature Angular separee |

---

## Decoupage interne

## Phase 1 - Modele local marketplace et store Angular

**startIndex recommande** : 1

**AVANT**

- `apps/demo-angular` ne porte aucun domaine produit.

**APRES**

- Une couche locale Angular gere les annonces, les favoris, la recherche et les filtres.

**POURQUOI**

- Le MVP a besoin d'une base produit reelle avant de brancher les tools agentiques.

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

## Phase 2 - Parcours ecran petites annonces

**startIndex recommande** : 2

**AVANT**

- La demo Angular ne comporte ni routes produit ni composants metier.

**APRES**

- La demo livre au minimum :
  - une page liste d'annonces
  - une page detail annonce
  - une page deposer ou editer une annonce
  - une page favoris

**POURQUOI**

- C'est le minimum d'une app type Leboncoin sans ouvrir les domaines hors scope.

### Service interface methods visees

- `ListingFiltersService.setQuery(query: string): void`
- `ListingFiltersService.setCategory(category: string | null): void`
- `ListingFiltersService.setPriceRange(min?: number, max?: number): void`
- `ListingFiltersService.reset(): void`

### Boilerplate libs a reutiliser

- `@angular/router`
- composants standalone Angular

## Phase 3 - Tools DomOS du domaine petites annonces

**startIndex recommande** : 3

**AVANT**

- Le seul tool demo est `demo_echo`.

**APRES**

- La demo expose des tools metier coherents avec le domaine marketplace.

**POURQUOI**

- DomOS doit agir sur le produit, pas sur un ecran technique.

### Service interface methods visees cote app

- `registerMarketplaceTools(): VoidFunction`
- Appui exclusif sur les primitives `registerToolResolver`, `registerNavigationTool`, `registerContext` et `subscribeEvent` issues de la feature 26

### Tools metier minimums

- `search_listings`
- `filter_listings`
- `open_listing`
- `create_listing`
- `update_listing`
- `toggle_favorite_listing`
- `list_favorites`

## Phase 4 - Gate finale de demo produit Angular

**startIndex recommande** : 4

**AVANT**

- Aucun verdict binaire n'existe sur la transformation produit de la demo Angular.

**APRES**

- La demo se ferme sur une validation explicite de son parcours produit et de sa consommation exclusive de `@domos/angular`.

**POURQUOI**

- Le risque principal est de livrer une UI jolie mais architecturalement hors pattern Angular DomOS.

### Service interface methods visees

- Aucune nouvelle methode. Phase de gate sur les services et primitives deja livres.

### Boilerplate libs a reutiliser

- scripts `pnpm --filter`
- tests Angular deja en place dans `apps/demo-angular`

---

## Fichiers impactes

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| `apps/demo-angular/src/app/app.component.ts` | shell de gate technique | shell produit du marketplace Angular | sortir du gate minimal |
| `apps/demo-angular/src/app/app.config.ts` | config minimale | bootstrap aligne sur routes, store et primitives Angular DomOS | brancher la vraie demo |
| `apps/demo-angular/src/app/app.routes.ts` | absent ou minimal technique selon feature 26 | routes produit de la demo petites annonces | porter le parcours applicatif |
| `apps/demo-angular/src/app/register-demo-tools.ts` | `demo_echo` | enregistrement des tools marketplace via `@domos/angular` | porter le domaine produit dans DomOS |
| `apps/demo-angular/src/app/marketplace/listings.store.ts` | absent | source de verite locale des annonces | materialiser le domaine produit |
| `apps/demo-angular/src/app/marketplace/listing.types.ts` | absent | types annonces, filtres et payloads | expliciter le contrat local |
| `apps/demo-angular/src/app/marketplace/listing-filters.service.ts` | absent | gestion des filtres et de la recherche | eviter la logique dispersee |
| `apps/demo-angular/src/app/pages/HomePageComponent.ts` | absent | liste des annonces | point d'entree produit |
| `apps/demo-angular/src/app/pages/ListingDetailPageComponent.ts` | absent | detail annonce | consultation detaillee |
| `apps/demo-angular/src/app/pages/EditListingPageComponent.ts` | absent | depot ou edition d'annonce | flux create/edit du MVP |
| `apps/demo-angular/src/app/pages/FavoritesPageComponent.ts` | absent | vue favoris | boucle d'usage essentielle |
| `apps/demo-angular/src/app/components/ListingCardComponent.ts` | absent | carte d'annonce reutilisable | cohesion UI du produit |
| `apps/demo-angular/src/app/components/SearchFiltersComponent.ts` | absent | recherche et filtres annonces | experience type marketplace |
| `apps/demo-angular/src/app/components/AgentPanelComponent.ts` | absent ou technique | panneau agent adapte au produit si necessaire | rendre DomOS visible dans le scenario |
| `apps/demo-angular/src/app/**/*.test.ts` | tests techniques de gate | tests produit sur store, tools et parcours minimum | objectiver le MVP |

---

## Ce qui ne sera pas modifie

- `packages/angular/**` hors consommation de l'API publique deja livree par la feature 26.
- `packages/core/**`.
- `packages/ui/**`.
- `apps/demo/**`.
- `apps/demo-vue/**`.
- Toute logique serveur, websocket specifique marketplace, auth, paiement, moderation ou upload media.

---

## Gate de fin

- [ ] `apps/demo-angular` est une vraie app Angular de petites annonces et non une page de gate.
- [ ] La demo livre liste, detail, depot edition et favoris.
- [ ] Les tools DomOS exposes par la demo sont des tools metier du marketplace.
- [ ] La demo consomme uniquement l'API publique de `@domos/angular`.
- [ ] Aucun changement `ui` ou `core` n'a ete absorbe.
- [ ] Aucun backend, auth, paiement ou messagerie temps reel n'a ete ajoute.

---

## Ce qu'on ne fait pas

- Pas de backend de petites annonces.
- Pas de persistance serveur.
- Pas de comptes utilisateur reels.
- Pas de paiement, de livraison, de moderation ou de chat vendeur/acheteur.
- Pas de copie du parcours e-commerce React.
- Pas de copie du dashboard admin Vue.

---

## Dependances

- Feature 26 validee avant demarrage.
- Sprint 8 et Sprint 9 deja actent comme base technique.
- Issue 14 deja corrigee pour garantir la resolution workspace normale.

---

## Hypotheses ouvertes

- Hypothese forte : le MVP type Leboncoin peut rester purement local dans `apps/demo-angular` sans valeur perdue pour la demo DomOS.
- Hypothese a verifier : un panneau agent simple suffit pour le MVP, sans ouvrir un chantier voice UI ou approval UI specifique Angular.
- Hypothese a verifier : le parcours "deposer une annonce" peut rester mono-utilisateur local sans auth ni notion de vendeur reel.
