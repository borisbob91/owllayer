# Feature #09 : Plugin Capabilities & Controlled Execution (TypeScript)

**Statut** : 🟡 Validée  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-03-26

---

## Besoin

Le système `DomOSServerPlugin` (feature #08) permet d'installer des plugins serveur avec namespace, collision explicite et désinstallation ciblée. Cependant, tout plugin s'exécute dans le même processus Node.js que `DomOSServer` : accès libre au réseau, au système de fichiers, aux variables d'environnement et aux privilèges du processus hôte.

Cette feature introduit deux choses :

1. Un **manifeste de capabilities** déclaré par l'auteur dans `meta.capabilities` — ce dont le plugin a besoin pour fonctionner.
2. Un **mode d'exécution** choisi par l'installateur : `trusted` (in-process, comportement actuel) ou `untrusted` (isolation via `worker_threads` avec capabilities appliquées).

Ce modèle est **rétro-compatible** : sans options, le comportement est identique à feature #08.

> L'isolation réseau et syscall réelle fera l'objet de la feature #10 (runtime Rust + napi). Cette feature pose les bases de l'API et de l'isolation via worker_threads Node.js natif.

### User story

> En tant que développeur installant un plugin tiers, je veux pouvoir déclarer que ce plugin s'exécute dans un contexte isolé avec des accès restreints, sans modifier le fonctionnement des plugins de confiance déjà en place.

---

## Périmètre strict

### Ce que cette feature fait

- Ajoute `capabilities?: PluginCapabilities` dans `DomOSServerPlugin.meta` — manifeste déclaré par l'auteur.
- Ajoute un troisième argument optionnel `PluginRuntimeOptions` à `server.installPlugin()` — choix de l'installateur.
- Introduit le mode `trusted` (défaut, in-process, aucun overhead) et `untrusted` (isolation via `worker_threads`).
- En mode `untrusted` : filtre `process.env` aux `allowKeys` déclarées, timeout dur avec `worker.terminate()`, crash worker isolé du process principal.
- Applique la règle d'intersection : l'installateur peut **restreindre** les capabilities du meta, jamais les élargir.
- Exporte publiquement les nouveaux types depuis `@domos/server`.

### Ce que cette feature ne fait PAS (hors scope)

- Pas de vraie isolation réseau ou syscall — cela requiert feature #10 (Rust + napi). La restriction réseau en mode `untrusted` est documentée comme best-effort (fetch patché dans le worker).
- Aucun changement dans `@domos/core` ou les SDKs client.
- Pas de marketplace, registre ni signature de plugins.
- Pas de conteneur Docker ou VM.
- Pas de hot-reload automatique.

> ⚠️ Toute fonctionnalité hors de ce périmètre requiert une nouvelle feature.

---

## Modèle auteur / installateur

### L'auteur déclare dans le plugin

```typescript
export const AcmePlugin: DomOSServerPlugin<{ apiKey: string }> = {
  meta: {
    name: '@acme/crm',
    version: '1.0.0',
    capabilities: {
      network:     { allowDomains: ['api.acme.com'] },
      filesystem:  { readAllowPaths: ['/app/data/templates'], writeAllowPaths: ['/app/data/tmp'] },
      env:         { allowKeys: ['ACME_API_KEY'] },
      process:     { allowSpawn: false },
    },
  },
  setup(ctx, config) { … },
}
```

### L'installateur choisit le mode

```typescript
// trusted (défaut) — in-process, aucun overhead, rétro-compatible
server.installPlugin(AcmePlugin, config)

// untrusted — capabilities du meta appliquées dans un worker_threads isolé
server.installPlugin(AcmePlugin, config, { mode: 'untrusted' })

// untrusted + restriction installateur (intersecte avec meta.capabilities)
server.installPlugin(AcmePlugin, config, {
  mode: 'untrusted',
  capabilities: { network: { allowDomains: [] } }, // zéro réseau accordé
  timeoutMs: 3000,
})
```

**Règle d'intersection** : si l'installateur ne passe pas de `capabilities`, celles du `meta` s'appliquent. L'installateur ne peut accorder que ce que l'auteur a déclaré — toute tentative d'élargissement est ignorée silencieusement.

---

## Types

```typescript
export type PluginMode = 'trusted' | 'untrusted';

export interface PluginCapabilities {
  network?:     { allowDomains?: string[] };
  filesystem?:  { readAllowPaths?: string[]; writeAllowPaths?: string[] };
  env?:         { allowKeys?: string[] };
  process?:     { allowSpawn?: boolean };
}

export interface PluginRuntimeOptions {
  mode?:          PluginMode;           // défaut : 'trusted'
  capabilities?:  PluginCapabilities;   // restreint les capabilities du meta
  timeoutMs?:     number;
}
```

`DomOSServerPlugin.meta` est étendu :

```typescript
meta: {
  name: string;
  version: string;
  description?: string;
  capabilities?: PluginCapabilities; // nouveau — optionnel
}
```

---

## Analyse d'impact

### Packages touchés

| Package | Modification | Rétro-compatibilité |
|---|---|---|
| `@domos/server` | Nouveaux types + WorkerExecutor + capabilityIntersect | ✅ Oui — mode `trusted` = aucun changement |

### Fichiers qui seront modifiés

| Fichier | Nature de la modification |
|---|---|
| `packages/server/src/plugins/plugin.types.ts` | Ajouter `capabilities?` dans meta + types `PluginMode`, `PluginCapabilities`, `PluginRuntimeOptions` |
| `packages/server/src/plugins/installServerPlugin.ts` | Accepter `PluginRuntimeOptions` en 3e arg, brancher sur `WorkerExecutor` si `untrusted` |
| `packages/server/src/core/DomOSServer.ts` | Passer `PluginRuntimeOptions` optionnel à `installServerPlugin` |
| `packages/server/src/runtime/WorkerExecutor.ts` | **Nouveau** — exécute handler dans `worker_threads`, env filtré, timeout + terminate |
| `packages/server/src/runtime/capabilityIntersect.ts` | **Nouveau** — calcule intersection `meta.capabilities` ∩ `options.capabilities` |
| `packages/server/src/index.ts` | Exporter `PluginMode`, `PluginCapabilities`, `PluginRuntimeOptions` |
| `packages/server/tests/capabilityIntersect.test.ts` | Tests unitaires intersection capabilities |
| `packages/server/tests/WorkerExecutor.test.ts` | Tests unitaires worker — timeout, crash, env filtré |
| `packages/server/tests/installServerPlugin.capabilities.test.ts` | Tests intégration plugin + `PluginRuntimeOptions` |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Fichiers qui ne seront PAS modifiés

- `packages/core/*`, `packages/react/*`, `packages/vue/*`, `packages/svelte/*`, `packages/browser/*`
- `packages/server/src/core/ToolRouter.ts`
- `packages/server/src/persistence/*`, `packages/server/src/llm/*`, `packages/server/src/admin/*`, `packages/server/src/auth/*`

---

## Implémentation

### Étapes séquentielles

1. **Étape 1** — Définir les types dans `plugin.types.ts` : `PluginMode`, `PluginCapabilities`, `PluginRuntimeOptions`, étendre `meta`.
2. **Étape 2** — Créer `capabilityIntersect.ts` — calcule l'intersection meta ∩ options.
3. **Étape 3** — Créer `WorkerExecutor.ts` — exécution dans `worker_threads` avec env filtré, timeout dur, terminate propre.
4. **Étape 4** — Modifier `installServerPlugin.ts` — accepter `PluginRuntimeOptions`, brancher sur `WorkerExecutor` si `mode === 'untrusted'`.
5. **Étape 5** — Modifier `DomOSServer.ts` — transmettre `PluginRuntimeOptions` optionnel.
6. **Étape 6** — Exporter les nouveaux types publics depuis `packages/server/src/index.ts`.
7. **Étape 7** — Tests unitaires (`capabilityIntersect`, `WorkerExecutor`) + tests intégration.
8. **Étape 8** — `pnpm build` + `pnpm test`.

---

## Tests

- [ ] `capabilityIntersect` : intersection vide si installateur accorde domaine hors meta
- [ ] `capabilityIntersect` : installateur peut restreindre (sous-ensemble du meta)
- [ ] `WorkerExecutor` : handler bloqué > `timeoutMs` → `worker.terminate()` + erreur contrôlée
- [ ] `WorkerExecutor` : crash dans worker n'arrête pas le process principal
- [ ] `WorkerExecutor` : `process.env` dans le worker limité aux `allowKeys`
- [ ] `installPlugin` sans options → comportement identique à feature #08
- [ ] `installPlugin` mode `untrusted` → exécution via `WorkerExecutor`
- [ ] `pnpm build` passe sur `packages/server`
- [ ] `pnpm test` ne régresse pas (tous les tests feature #08 passent)

---

## Critères d'acceptation

- [ ] `server.installPlugin(plugin, config)` sans options = comportement identique à aujourd'hui
- [ ] `server.installPlugin(plugin, config, { mode: 'untrusted' })` exécute le handler dans un worker isolé
- [ ] Un crash dans le worker n'affecte pas `DomOSServer`
- [ ] Un handler bloqué est terminé proprement après `timeoutMs`
- [ ] L'env dans le worker est limité aux `allowKeys` déclarées
- [ ] L'installateur ne peut pas accorder plus que ce que le meta déclare
- [ ] Les types `PluginMode`, `PluginCapabilities`, `PluginRuntimeOptions` sont exportés publiquement
- [ ] La PR référence ce document : `feat: ... (ref feature_09)`

---

## Dépendances

- **Feature #08** ✅ Livrée — `DomOSServerPlugin`, `installServerPlugin`, `ToolRouter`
- **Feature #10** (future) — migrera `WorkerExecutor` vers un addon Rust + napi pour une vraie isolation syscall, sans changer l'API publique `PluginRuntimeOptions`

