# Feature #10 : Plugin Isolated Runtime — Rust + napi

**Statut** : 🔵 Roadmap  
**Domaine** : server  
**Porteur** : @BorisBob  
**Validé par** : —  
**Date** : 2026-03-26

---

## Besoin

La feature #09 introduit l'isolation des plugins `untrusted` via `worker_threads` Node.js. Cette approche couvre le filtrage d'env, le timeout et l'isolation des crashes. En revanche, elle ne peut pas garantir une vraie isolation réseau ou filesystem au niveau syscall : un worker Node.js partage le même runtime V8 et les mêmes interfaces OS que le process principal.

Cette feature remplace le `WorkerExecutor` TypeScript par un **addon natif Rust compilé via napi-rs** qui exécute les handlers dans un thread Rust isolé avec interception réelle des appels système.

> **Dépend de feature #09** — l'API publique `PluginRuntimeOptions` et `PluginCapabilities` ne changent pas. Seule l'implémentation interne de l'exécution `untrusted` est remplacée.

---

## Ce que cette feature fait

- Remplace `WorkerExecutor.ts` par un addon napi `@owllayer/plugin-runtime` écrit en Rust.
- Le handler plugin `untrusted` est sérialisé (args + capabilities) et envoyé au runtime Rust via napi.
- Le runtime Rust exécute le handler dans un thread dédié avec politique capabilities appliquée au niveau OS :
  - **réseau** : connexions TCP/UDP bloquées sauf allowDomains (résolution + filtrage pré-connexion)
  - **filesystem** : appels `open()` / `read()` / `write()` filtrés par allowlist de chemins
  - **env** : le thread ne voit que les variables d'env passées explicitement
  - **process** : `spawn()` bloqué si `allowSpawn: false`
- Le résultat (ou l'erreur) remonte via napi vers `ToolRouter` — même interface qu'aujourd'hui.
- Un crash dans le thread Rust est capturé et retourné comme erreur contrôlée — le process Node.js principal n'est pas affecté.

## Ce que cette feature ne fait PAS (hors scope)

- Aucun changement d'API publique : `PluginRuntimeOptions`, `PluginCapabilities`, `PluginMode` restent identiques.
- Aucune modification du mode `trusted` — il reste in-process TypeScript.
- Pas de conteneur Docker, VM, ou sandbox V8 (vm2, isolated-vm).
- Pas de marketplace ni de signature de plugins.
- Aucun changement dans `@owllayer/core` ou les SDKs client.

---

## Pourquoi Rust + napi

| Critère | worker_threads (feature #09) | Rust + napi (feature #10) |
|---|---|---|
| Isolation env | ✅ Filtrage manuel | ✅ Thread sans accès env hôte |
| Isolation réseau | ⚠️ Best-effort (fetch patché) | ✅ Interception pré-connexion OS |
| Isolation filesystem | ⚠️ Best-effort (fs patché) | ✅ Filtrage appels `open()` |
| Crash isolation | ✅ Worker terminé proprement | ✅ Thread Rust capturé |
| Overhead | Faible (thread V8) | Faible (thread natif, sans GC) |
| Dépendance build | Aucune | Rust toolchain + napi-rs |

---

## Architecture

```
installPlugin(plugin, config, { mode: 'untrusted' })
        │
        ▼
  WorkerExecutor (feature #09)       remplacé par ↓
  NapiPluginRuntime (feature #10)
        │
        │  napi call — serialize(handler, args, capabilities)
        ▼
  @owllayer/plugin-runtime (addon Rust)
        │
        │  thread isolé
        ▼
  handler exécuté avec politique capabilities
        │
        │  napi return — résultat sérialisé
        ▼
  ToolRouter → réponse LLM
```

## Nouveau package

| Package | Rôle |
|---|---|
| `packages/plugin-runtime/` | Addon Rust compilé via napi-rs — expose `executeIsolated(handlerSrc, args, capabilities)` |

## Fichiers touchés (indicatif — à préciser lors de la validation)

| Fichier | Nature |
|---|---|
| `packages/plugin-runtime/` | **Nouveau package** Rust + napi-rs |
| `packages/server/src/runtime/WorkerExecutor.ts` | Remplacé par `NapiPluginRuntime.ts` |
| `packages/server/src/runtime/NapiPluginRuntime.ts` | **Nouveau** — appel napi vers le runtime Rust |
| `packages/server/src/plugins/installServerPlugin.ts` | Switcher du `WorkerExecutor` vers `NapiPluginRuntime` |
| `packages/server/src/index.ts` | Aucun changement d'exports publics |
| `packages/server/tests/NapiPluginRuntime.test.ts` | Tests intégration avec le runtime Rust |
| `pnpm-workspace.yaml` | Ajouter `packages/plugin-runtime` |
| `turbo.json` | Pipeline build pour le package Rust |

---

## Critères d'acceptation

- [ ] `server.installPlugin(plugin, config, { mode: 'untrusted' })` continue de fonctionner sans changement pour l'installateur
- [ ] Une requête réseau vers un domaine hors `allowDomains` est bloquée au niveau OS (pas seulement patchée)
- [ ] Un accès filesystem hors paths autorisés lève une erreur au niveau OS
- [ ] Un crash dans le thread Rust n'affecte pas le process Node.js principal
- [ ] Les performances en mode `trusted` ne sont pas affectées (aucun overhead Rust pour ce mode)
- [ ] `pnpm build` et `pnpm test` passent avec le nouveau package Rust inclus
- [ ] La PR référence ce document : `feat: ... (ref feature_10)`

---

## Dépendances

- **Feature #09** ✅ doit être livrée — fournit `PluginCapabilities`, `PluginRuntimeOptions`, l'API installateur et les tests de base
- **Rust toolchain** + **napi-rs** — dépendances build ajoutées en feature #10
