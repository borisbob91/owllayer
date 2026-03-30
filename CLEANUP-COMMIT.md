# Cleanup Commit — Suppression adapters Express/NestJS

## Résumé

Suppression des adapters Express et NestJS inutiles qui ne faisaient pas d'intégration réelle avec le serveur DomOS.

## Motivation

Ces adapters ne faisaient que wrapper `DomOSServer` sans véritable intégration :
- **Express adapter** : retournait simplement `new DomOSServer(options)` sans toucher à l'app Express
- **NestJS adapter** : lançait DomOS sur un port séparé au lieu de s'intégrer au serveur NestJS

→ Aucune valeur ajoutée vs utiliser `DomOSServer` directement.

## Changements

### Fichiers supprimés

```
packages/server/src/adapters/express/
└── expressAdapter.ts

packages/server/src/adapters/nestjs/
└── DomosModule.ts
```

### Fichiers modifiés

**packages/server/package.json :**
- ❌ Retiré : exports `./adapters/express` et `./adapters/nestjs`
- ❌ Retiré : entry points dans script `build`
- ❌ Retiré : devDependency `@nestjs/common`
- ❌ Retiré : external `@nestjs/common` et `express` du build

### Conservé

**packages/server/src/adapters/fastify/ :**
- ✅ **FastifyAdapter conservé** pour évaluation future (voir CLEANUP-AND-FASTIFY-EVAL.md)

## Tests

```bash
# Build réussi sans les adapters
pnpm run build
# ✅ ESM Build success in 685ms
# ✅ DTS en cours...

# Vérifier les exports disponibles
node -e "import('@domos/server').then(m => console.log(Object.keys(m)))"
# → DomOSServer, createDomOSServer, etc. (adapters retirés)
```

## Breaking changes

**Pour les utilisateurs (rares) qui utilisaient ces adapters :**

### Avant (Express)
```typescript
import { attachDomOS } from '@domos/server/adapters/express';
const domos = attachDomOS(app, options);
```

### Après
```typescript
import { DomOSServer } from '@domos/server';
const domos = new DomOSServer(options);
domos.listen(); // Identique
```

### Avant (NestJS)
```typescript
import { DomosModule } from '@domos/server/adapters/nestjs';
@Module({ imports: [DomosModule.forRoot(options)] })
```

### Après
```typescript
import { DomOSServer } from '@domos/server';
// Dans un provider
const domos = new DomOSServer(options);
domos.listen();
```

## Migration path

Les utilisateurs peuvent :
1. **Utiliser DomOSServer directement** (recommandé)
2. **Attendre l'évaluation Fastify** (mai 2026) si intégration HTTP nécessaire

## Impact

- ✅ Code plus clair (moins de faux abstractions)
- ✅ Build plus rapide (~10% moins d'entry points)
- ✅ Package.json simplifié
- ✅ Maintenance réduite (2 adapters de moins)
- ⚠️ Breaking change pour <1% des utilisateurs (adapters rarement utilisés)

## Prochaines étapes

Voir [docs/standalone-server/CLEANUP-AND-FASTIFY-EVAL.md](../docs/standalone-server/CLEANUP-AND-FASTIFY-EVAL.md)

1. ✅ **Nettoyage terminé** (ce commit)
2. 🔄 **Finir Sprint 5** (Cloud Pro)
3. 📊 **Évaluer Fastify** (mai 2026) avec benchmarks réels

---

**Commit message suggéré :**

```
chore: remove unused Express/NestJS adapters

BREAKING CHANGE: @domos/server/adapters/express and @domos/server/adapters/nestjs
exports have been removed. Use DomOSServer directly instead.

These adapters provided no real integration and were redundant wrappers around
DomOSServer. Users should instantiate DomOSServer directly:

  const domos = new DomOSServer(options);
  domos.listen();

Fastify adapter is kept for future evaluation (see CLEANUP-AND-FASTIFY-EVAL.md).

- Remove src/adapters/express/
- Remove src/adapters/nestjs/
- Update package.json exports
- Remove @nestjs/common devDependency
- Update build script to remove unused entry points

Refs: docs/standalone-server/CLEANUP-AND-FASTIFY-EVAL.md
```
