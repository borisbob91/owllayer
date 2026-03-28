# Feature #11 : Dashboard Embarqué — `@domos/ui/dashboard`

**Statut** : 🔵 Proposition  
**Domaine** : ui (nouveau domaine)  
**Porteur** : @BorisBob  
**Validé par** : —  
**Date** : 2026-03-28  

---

## Besoin

Le dashboard d'administration DomOS (`apps/dashboard`) est une application standalone React, non distribuée dans les packages du SDK. Un intégrateur qui installe `@domos/server` + un SDK frontend n'a aucun moyen d'accéder à un dashboard d'administration sans cloner le dépôt et lancer l'app séparément.

### User story

> En tant que développeur qui intègre DomOS dans son projet, je veux pouvoir monter un dashboard d'administration directement depuis un import npm, sans avoir à déployer une app séparée.

---

## Périmètre strict

### Ce que cette feature fait

- Crée le package `@domos/ui` dans `packages/ui/`
- Expose un composant Preact `DashboardPanel` qui peut être monté via une fonction impérative `mountDashboard(el, config)`
- Le dashboard couvre : statut serveur, sessions, tools, métriques, lignes, clés API, prompts, login
- Authentification via token Bearer stocké en `sessionStorage` (pas `localStorage` — sécurité)
- Communication avec le serveur via les routes `/admin/*` existantes (aucune route serveur créée)
- Compatible avec tous les environnements : React, Vue, Svelte, browser vanilla — l'intégration se fait via l'API impérative `mountDashboard`

### Ce que cette feature ne fait PAS (hors scope)

- Ne modifie pas `apps/dashboard` (hors scope, non touché)
- Ne crée pas de nouvelles routes serveur
- N'introduit pas de système de thème ou dark mode
- Ne gère pas l'internationalisation (i18n)
- Ne remplace pas `apps/dashboard` — les deux coexistent
- Ne crée pas les intégrations framework-spécifiques (React/Vue/Svelte/browser) — c'est la phase 2, hors de ce document

---

## Analyse d'impact

### Fonctionnalités existantes pouvant être affectées

| Fonctionnalité | Impact | Mitigation |
|---|---|---|
| `apps/dashboard` | Aucun — non touché | — |
| Routes `/admin/*` dans `@domos/server` | Aucun — consommation uniquement | — |
| `@domos/core` | Aucun | — |

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `packages/ui` (nouveau) | Création | ✅ N/A |
| `pnpm-workspace.yaml` | Déjà inclus via `packages/*` | ✅ Oui |
| `turbo.json` | Aucune modification nécessaire | ✅ Oui |

### Fichiers qui seront créés

| Fichier | Nature |
|---|---|
| `packages/ui/package.json` | Config package `@domos/ui` |
| `packages/ui/tsconfig.json` | Extends `../../tsconfig.base.json`, jsx preact |
| `packages/ui/esbuild.config.mjs` | Build script — même pattern que `@domos/browser` |
| `packages/ui/src/index.ts` | Export général du package |
| `packages/ui/src/dashboard/index.ts` | Export + `mountDashboard` / `unmountDashboard` |
| `packages/ui/src/dashboard/DashboardPanel.tsx` | Composant racine Preact — routing interne via hash |
| `packages/ui/src/dashboard/api.ts` | Couche HTTP admin — adapté depuis `apps/dashboard/src/api.ts`, token en `sessionStorage` |
| `packages/ui/src/dashboard/components/Layout.tsx` | Layout sidebar + outlet |
| `packages/ui/src/dashboard/components/MetricsChart.tsx` | Chart SVG natif Preact (pas de lib externe) |
| `packages/ui/src/dashboard/components/SessionCard.tsx` | Carte de session compacte |
| `packages/ui/src/dashboard/components/ToolCallTimeline.tsx` | Timeline des appels tools |
| `packages/ui/src/dashboard/pages/StatusPage.tsx` | Statut serveur + ping |
| `packages/ui/src/dashboard/pages/SessionsPage.tsx` | Liste des sessions actives |
| `packages/ui/src/dashboard/pages/SessionDetailPage.tsx` | Détail d'une session |
| `packages/ui/src/dashboard/pages/ToolsPage.tsx` | Tools enregistrés |
| `packages/ui/src/dashboard/pages/MetricsPage.tsx` | Métriques usage |
| `packages/ui/src/dashboard/pages/LinesPage.tsx` | Lignes de communication |
| `packages/ui/src/dashboard/pages/ApiKeysPage.tsx` | Gestion clés API |
| `packages/ui/src/dashboard/pages/PromptsPage.tsx` | Gestion prompts |
| `packages/ui/src/dashboard/pages/LoginPage.tsx` | Page login avec form + logo DomOS |

### Fichiers qui ne seront PAS modifiés

- `apps/dashboard/**` — hors scope, non touché
- `packages/core/src/**`
- `packages/react/src/**`
- `packages/vue/src/**`
- `packages/svelte/src/**`
- `packages/browser/src/**`
- `packages/server/**`
- `turbo.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`

---

## Implémentation

### Décisions techniques

| Décision | Choix | Raison |
|---|---|---|
| Runtime UI | Preact `^10.26.4` | Déjà présent dans `@domos/browser`, zéro runtime supplémentaire |
| Routing | Hash-based (`#/status`, `#/sessions`) | Pas de `react-router-dom`, pas de dépendance externe, montable n'importe où dans un DOM existant |
| Charts | SVG natif Preact | Zéro dépendance. `recharts` est exclu (React uniquement) |
| Auth storage | `sessionStorage` | Plus sécurisé que `localStorage` — le token n'est pas persisté entre onglets/redémarrages |
| Build | esbuild — même config que `@domos/browser` | Cohérence monorepo |
| Styles | CSS inline + CSS custom properties | Pas de Tailwind dans un package distribué — risque de collision avec le CSS de l'hôte |

### API publique

```typescript
// packages/ui/src/dashboard/index.ts

export interface DashboardConfig {
  /** URL de base du serveur DomOS */
  serverUrl: string;
  /** Token admin initial optionnel (sinon, login screen) */
  token?: string;
}

/** Monte le dashboard dans l'élément fourni */
export function mountDashboard(el: HTMLElement, config: DashboardConfig): void

/** Démonte proprement le dashboard */
export function unmountDashboard(el: HTMLElement): void
```

### Exemple d'utilisation (framework-agnostic)

```html
<!-- Vanilla JS / n'importe quel environnement -->
<div id="domos-dashboard"></div>
<script type="module">
  import { mountDashboard } from '@domos/ui/dashboard';
  mountDashboard(document.getElementById('domos-dashboard'), {
    serverUrl: 'https://my-server.com'
  });
</script>
```

### Étapes séquentielles

1. **Étape 1** — Scaffold du package : `package.json`, `tsconfig.json`, `esbuild.config.mjs` — Fichiers : configuration uniquement
2. **Étape 2** — `api.ts` + types — couche HTTP avec `sessionStorage`, fonctions fetch typées
3. **Étape 3** — `pages/*.tsx` — portage depuis `apps/dashboard/src/pages/`, adaptés à Preact + hash routing
4. **Étape 4** — `components/*.tsx` — Layout, MetricsChart SVG, SessionCard, ToolCallTimeline
5. **Étape 5** — `DashboardPanel.tsx` — composant racine avec router hash interne
6. **Étape 6** — `mountDashboard` / `unmountDashboard` — API impérative via `preact/render`
7. **Étape 7** — `src/index.ts` — exports du package
8. **Étape 8** — `pnpm build` sur `packages/ui`

---

## Tests

- [ ] `pnpm build` passe sur `packages/ui` sans erreur
- [ ] `mountDashboard` monte et démonte sans memory leak (vérif manuelle)
- [ ] Login → token stocké en `sessionStorage` (pas `localStorage`)
- [ ] Toutes les pages s'affichent correctement via hash routing
- [ ] Testé manuellement en montant dans `apps/demo` (React) sans conflit de runtime

---

## Critères d'acceptation

- [ ] `import { mountDashboard } from '@domos/ui/dashboard'` fonctionne sans config supplémentaire
- [ ] Aucune dépendance React dans `@domos/ui`
- [ ] Le package est bien listé dans le workspace pnpm (`packages/*` — automatique)
- [ ] `pnpm build` passe en CI sur les packages affectés
- [ ] La PR référence ce document : `feat: @domos/ui dashboard embarqué (ref feature_11)`
