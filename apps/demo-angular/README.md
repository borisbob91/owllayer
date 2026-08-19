# OwlLayer Angular Marketplace — Demo

Démo marketplace de petites annonces (type LeBonCoin) construite avec Angular 19 et le SDK `@owllayer/angular`.

## Fonctionnalités

- 🏪 **Marketplace complète** : liste, détail, création/édition, favoris
- 🤖 **Agent IA intégré** : recherche, filtres, gestion favoris, CRUD annonces
- 🎨 **Widget OwlLayer** : interface chat avec audio et texte
- 🛠️ **DevTools** : debug et inspection des tools en temps réel

## Démarrage rapide

### 1. Configuration des variables d'environnement

Copiez le fichier d'exemple :

```bash
cp .env.example .env
```

Éditez `.env` avec vos paramètres :

```env
VITE_OWLLAYER_ENDPOINT=ws://localhost:4001/owllayer
VITE_OWLLAYER_API_KEY=pk_78ab37_angular_marketplace
VITE_USE_DEFAULT_WIDGET=true
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Lancer le serveur OwlLayer

Dans un terminal séparé, démarrez le serveur OwlLayer :

```bash
cd ../../packages/server
pnpm dev
```

Le serveur démarre sur `http://localhost:4001`.

### 4. Lancer la demo Angular

```bash
pnpm dev
```

La demo démarre sur `http://localhost:4400`.

## Architecture

```
src/app/
├── app.component.ts          # Shell avec widget + devtools
├── app.config.ts             # Configuration OwlLayer + routes
├── core/
│   └── register-demo-tools.ts # 17 tools marketplace
└── marketplace/
    ├── models/               # Types TypeScript
    ├── store/                # Source de vérité (signals)
    ├── pages/                # 4 pages (home, detail, edit, favorites)
    └── components/           # Composants réutilisables
```

## Tools OwlLayer disponibles

La demo expose **17 tools marketplace** :

**Recherche & Filtres** :
- `search_listings` — Recherche par mots-clés et catégorie
- `filter_by_category` — Filtrer par catégorie
- `set_price_range` — Fourchette de prix
- `reset_filters` — Réinitialiser les filtres

**Favoris** :
- `add_favorite` — Ajouter aux favoris
- `remove_favorite` — Retirer des favoris
- `view_favorites` — Consulter les favoris

**CRUD Annonces** :
- `create_listing` — Créer une annonce
- `update_listing` — Modifier une annonce
- `delete_listing` — Supprimer une annonce
- `read_listing` — Lire détails annonce
- `list_listing` — Lister annonces

**Navigation** :
- `navigate` — Navigation entre pages

**UI State** :
- `ui_state` — Actions UI locales

**Contact** :
- `contact_seller` — Contacter un vendeur

## SDK Angular utilisé

Cette demo démontre **11/14 primitives du SDK `@owllayer/angular`** :

✅ `provideOwlLayer` — Bootstrap  
✅ `injectOwlLayer` — Injection service  
✅ `registerContext` — Contexte LLM riche (4 pages)  
✅ `registerNavigationTool` — Navigation  
✅ `registerViewStateTool` — Actions UI  
✅ `registerToolResolver` — Groupes de tools  
✅ `createResolverFromSwitch` — Helper resolver  
✅ `createCRUDResolver` — Helper CRUD  
✅ `OwlLayerWidgetComponent` — Widget chat  
✅ `OwlLayerToolButtonComponent` — Bouton template-bound  
✅ `injectOwlLayerDevTools` — DevTools debug  

## Build pour production

```bash
pnpm build
```

Le bundle de production est généré dans `dist/` (~1.5 MB minifié).

## Documentation

- [SDK Angular](../../packages/angular/README.md)
- [Sprint 12 - Marketplace Implementation](../../sprints/SPRINT-12-angular-marketplace-implementation.md)
- [AGENTS.md](../../AGENTS.md) — Conventions OwlLayer
