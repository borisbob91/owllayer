# Feature 13 — Intégration `@owllayer/ui` dans `@owllayer/server`

**Domaine** : server  
**Statut** : 🟡 Validée  
**Porteur** : @BorisBob  
**Dépend de** : feature_11 (`@owllayer/ui` package)  
**Branch** : `feat/feature_11_12_ui_package` (même branch)

---

## Objectif

Permettre au développeur d'activer le dashboard embarqué (`@owllayer/ui`) directement depuis `OwlLayerServer`, par une option opt-in. Quand activé, le serveur sert lui-même l'interface admin sans infrastructure supplémentaire.

```ts
// DÉSACTIVÉ (défaut — zéro overhead)
new OwlLayerServer({ llm, port: 3000 })

// ACTIVÉ — dashboard disponible sur http://localhost:3000/owllayer-ui
new OwlLayerServer({
  llm,
  port: 3000,
  admin: { username: 'admin', password: '...', path: '/admin' },
  ui: { enabled: true },
})

// Chemin custom
new OwlLayerServer({
  llm,
  port: 3000,
  admin: { username: 'admin', password: '...', path: '/admin' },
  ui: { enabled: true, path: '/dashboard' },
})
```

---

## Principe technique

Le server utilise déjà un `httpHandler` natif Node.js (pattern `handleRequest(req, res): boolean`) pour router AdminAPI et VirtualLines. `DashboardUIHandler` suit le même pattern et est branché en dernier dans la chaîne.

**Le `DashboardUIHandler` sert :**
- `GET {path}` → HTML shell inliné (charge le bundle via `<script type="module">`)
- `GET {path}/bundle.js` → `readFileSync` sur `@owllayer/ui/dist/dashboard.esm.js`
- `GET {path}/bundle.js.map` → sourcemap (si présent)
- Toute autre sous-route → redirect → `{path}` (SPA hash routing)

**Auth :** le dashboard Preact appelle directement `/admin/login` (déjà protégé par `AdminAuthManager`). Le handler HTTP des assets est **sans auth** — le bundle JS + HTML ne contiennent aucune donnée sensible.

**Prérequis :** `options.admin` doit être configuré pour que le dashboard soit fonctionnel (sinon warning au démarrage).

---

## Fichiers modifiés

| Fichier | Type | Raison |
|---|---|---|
| `packages/server/package.json` | MODIFIÉ | Ajouter `@owllayer/ui workspace:*` en dep + `--external @owllayer/ui` au build |
| `packages/server/src/admin/DashboardUIHandler.ts` | CRÉÉ | Handler HTTP qui sert les assets du dashboard |
| `packages/server/src/core/OwlLayerServer.ts` | MODIFIÉ | Ajouter `ui?` dans `OwlLayerServerOptions`, champ private, instanciation, branchement httpHandler |
| `packages/server/src/index.ts` | MODIFIÉ | Exporter `DashboardUIOptions` |

**Fichiers non touchés :** `apps/dashboard`, `packages/ui`, protocol ADTP, `AdminAPI.ts`

---

## Interface publique

```ts
// Exporté depuis @owllayer/server
export interface DashboardUIOptions {
  /** Active le dashboard embarqué */
  enabled: boolean;
  /** Path HTTP (défaut: '/owllayer-ui') */
  path?: string;
}
```

---

## Comportement au démarrage

```
[OwlLayer:Server] Dashboard UI activé sur /owllayer-ui
[OwlLayer:Server] → http://localhost:3000/owllayer-ui
```

Si `options.admin` absent + `ui.enabled: true` :
```
[OwlLayer:Server] WARN: ui.enabled=true mais options.admin n'est pas configuré.
               Le dashboard nécessite une authentification admin.
```
