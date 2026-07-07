---
mode: agent
description: >
  Sprint 14 - Deux patches chirurgicaux sur les helpers @domos/angular :
  options description/disabled/global sur registerViewStateTool,
  et disabled/global configurables sur registerNavigationTool.
tools:
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
---

# Sprint 14 — Angular helpers options patch

**Base :** Sprint 13 livré, surface SDK Angular validée  
**Périmètre :** `domos/packages/angular/` uniquement — 4 fichiers, 0 autre package  
**Référence :** Diagnostic défauts relevés post-Sprint 13 sur `registerViewStateTool` et `registerNavigationTool`

---

## Problème 1 — `registerViewStateTool` sans options

### AVANT

Fichier : `packages/angular/src/lib/navigation/registerViewStateTool.ts`

```ts
export function registerViewStateTool(handler: DomOSViewStateHandler): VoidFunction {
  assertInInjectionContext(registerViewStateTool);
  const domos = injectDomOS();
  const schema = z.object({
    viewId: z.string().min(1).describe('ID logique du view'),
    action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
    params: z.record(z.string(), z.unknown()).optional().describe('Parametres d action'),
  });
  return domos.registerTool(
    {
      name: 'ui_state',
      description: 'Changer un etat UI local (view) sans changer l URL.',
      schema,
      risk: 'none',
    },
    handler
  );
}
```

### POURQUOI c'est un défaut

- La description est hardcodée : une app multi-views ne peut pas distinguer ses tools `ui_state` au niveau LLM.
- Pas de `disabled` : impossible de désactiver conditionnellement le tool sans supprimer l'appel.
- Pas de `global` : le comportement de cycle de vie est imposé sans recours, alors que certains views persistants peuvent necessiter `global: true`.
- Le type `DomOSViewStateOptions` n'existe pas : le contrat est incomplet par rapport à `DomOSNavigationOptions`.

### APRÈS

Fichier : `packages/angular/src/lib/navigation/registerViewStateTool.ts`

```ts
export function registerViewStateTool(
  handler: DomOSViewStateHandler,
  options?: DomOSViewStateOptions
): VoidFunction {
  assertInInjectionContext(registerViewStateTool);

  if (options?.disabled) {
    return () => {};
  }

  const domos = injectDomOS();
  const schema = z.object({
    viewId: z.string().min(1).describe('ID logique du view'),
    action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
    params: z.record(z.string(), z.unknown()).optional().describe('Parametres d action'),
  });

  return domos.registerTool(
    {
      name: 'ui_state',
      description: options?.description ?? 'Changer un etat UI local (view) sans changer l URL.',
      schema,
      risk: 'none',
      global: options?.global ?? false,
    },
    handler
  );
}
```

---

## Problème 2 — `registerNavigationTool` incomplet

### AVANT

Fichier : `packages/angular/src/lib/navigation/registerNavigationTool.ts`

```ts
export function registerNavigationTool(
  handler: DomOSNavigationHandler,
  options?: DomOSNavigationOptions
): VoidFunction {
  assertInInjectionContext(registerNavigationTool);
  const domos = injectDomOS();
  const schema = z.object({...});
  return domos.registerTool(
    {
      name: 'navigate',
      description: options?.description ?? 'Naviguer vers une URL (navigation globale).',
      schema,
      risk: 'none',
      global: true,   // ← hardcodé, non configurable
    },
    handler
  );
  // ← pas de disabled
}
```

Fichier : `packages/angular/src/lib/types/types.ts`

```ts
export interface DomOSNavigationOptions {
  description?: string;
  // ← disabled et global manquants
}
```

### POURQUOI c'est un défaut

- `global: true` est hardcodé : une app qui registre la navigation par composant (cas multi-tenant) ne peut pas le surcharger.
- Pas de `disabled` : même problème que `registerViewStateTool` — désactiver le tool exige de retirer l'appel en entier.
- Le type `DomOSNavigationOptions` est tronqué : il ne documente pas les champs disponibles, ce qui casse la découvrabilité SDK.

### APRÈS

Fichier : `packages/angular/src/lib/navigation/registerNavigationTool.ts`

Ajouter le guard `disabled` avant le `const domos = injectDomOS()`, et rendre `global` configurable :

```ts
export function registerNavigationTool(
  handler: DomOSNavigationHandler,
  options?: DomOSNavigationOptions
): VoidFunction {
  assertInInjectionContext(registerNavigationTool);

  if (options?.disabled) {
    return () => {};
  }

  const domos = injectDomOS();
  const schema = z.object({...});
  return domos.registerTool(
    {
      name: 'navigate',
      description: options?.description ?? 'Naviguer vers une URL (navigation globale).',
      schema,
      risk: 'none',
      global: options?.global ?? true,
    },
    handler
  );
}
```

---

## Périmètre strict

### Ce que Sprint 14 fait

- Ajoute le type `DomOSViewStateOptions` dans `types.ts`
- Étend `DomOSNavigationOptions` avec `disabled` et `global` dans `types.ts`
- Met à jour `registerViewStateTool` pour accepter `options?: DomOSViewStateOptions`
- Met à jour `registerNavigationTool` pour respecter `options?.disabled` et `options?.global`
- Exporte `DomOSViewStateOptions` depuis `public-api.ts`

### Ce que Sprint 14 ne fait pas

- Ne touche pas `packages/core/**`
- Ne touche pas `packages/react/**` ni `packages/vue/**`
- Ne touche pas `apps/demo-angular/**` ni aucune autre app
- Ne modifie pas le schéma Zod des tools (les paramètres LLM restent identiques)
- N'ajoute pas de nouvelles primitives au-delà des options manquantes
- N'ouvre pas de refactor sur d'autres helpers Angular

---

## Fichiers touchés

| Fichier | Nature de la modification |
|---|---|
| `packages/angular/src/lib/types/types.ts` | Ajouter `DomOSViewStateOptions` ; étendre `DomOSNavigationOptions` avec `disabled` et `global` |
| `packages/angular/src/lib/navigation/registerViewStateTool.ts` | Ajouter `options?: DomOSViewStateOptions`, guard `disabled`, `description` et `global` configurables |
| `packages/angular/src/lib/navigation/registerNavigationTool.ts` | Ajouter guard `disabled` ; rendre `global` configurable via `options?.global ?? true` |
| `packages/angular/src/public-api.ts` | Exporter `DomOSViewStateOptions` |

---

## Plan de correction

### Fichier 1 — `packages/angular/src/lib/types/types.ts`

#### AVANT

```ts
export interface DomOSNavigationOptions {
  description?: string;
}
```

_(Le type `DomOSViewStateOptions` n'existe pas.)_

#### APRÈS

Après la définition de `DomOSViewStateHandler`, ajouter :

```ts
export interface DomOSViewStateOptions {
  /** Description du tool exposée au LLM. Par défaut : description générique. */
  description?: string;
  /** Si true, le tool ne s'enregistre pas. */
  disabled?: boolean;
  /**
   * Si true, le tool persiste après le démontage du composant.
   * Défaut : false (ui_state est local par nature).
   */
  global?: boolean;
}
```

Et remplacer `DomOSNavigationOptions` par :

```ts
export interface DomOSNavigationOptions {
  description?: string;
  /** Si true, le tool ne s'enregistre pas. */
  disabled?: boolean;
  /**
   * Si true, le tool persiste après le démontage du composant.
   * Défaut : true (la navigation est globale par nature).
   */
  global?: boolean;
}
```

#### POURQUOI

Les deux types doivent documenter le contrat complet. Sans `disabled` et `global` dans l'interface, les options existent dans le code mais sont invisibles pour les consommateurs du SDK.

---

### Fichier 2 — `packages/angular/src/lib/navigation/registerViewStateTool.ts`

#### AVANT

```ts
export function registerViewStateTool(handler: DomOSViewStateHandler): VoidFunction {
  assertInInjectionContext(registerViewStateTool);
  const domos = injectDomOS();
  const schema = z.object({
    viewId: z.string().min(1).describe('ID logique du view'),
    action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
    params: z.record(z.string(), z.unknown()).optional().describe('Parametres d action'),
  });
  return domos.registerTool(
    {
      name: 'ui_state',
      description: 'Changer un etat UI local (view) sans changer l URL.',
      schema,
      risk: 'none',
    },
    handler
  );
}
```

#### APRÈS

```ts
export function registerViewStateTool(
  handler: DomOSViewStateHandler,
  options?: DomOSViewStateOptions
): VoidFunction {
  assertInInjectionContext(registerViewStateTool);

  if (options?.disabled) {
    return () => {};
  }

  const domos = injectDomOS();
  const schema = z.object({
    viewId: z.string().min(1).describe('ID logique du view'),
    action: z.string().min(1).describe('Action (open, close, set_tab, select, etc.)'),
    params: z.record(z.string(), z.unknown()).optional().describe('Parametres d action'),
  });

  return domos.registerTool(
    {
      name: 'ui_state',
      description: options?.description ?? 'Changer un etat UI local (view) sans changer l URL.',
      schema,
      risk: 'none',
      global: options?.global ?? false,
    },
    handler
  );
}
```

#### POURQUOI

- Le guard `disabled` doit preceder `injectDomOS()` : appeler `injectDomOS` en dehors d'un contexte d'injection actif — ce qui peut arriver si `disabled` est calculé dynamiquement — serait une erreur runtime Angular. Le guard court-circuite avant tout inject.
- `global: false` par défaut est correct : `ui_state` est sémantiquement local à un composant.
- Rétrocompatible : l'appel sans `options` continue de fonctionner exactement comme avant.

---

### Fichier 3 — `packages/angular/src/lib/navigation/registerNavigationTool.ts`

#### AVANT

Dans le corps de la fonction, après `assertInInjectionContext` :

```ts
  const domos = injectDomOS();
```

Et dans `registerTool` :

```ts
      global: true,
```

_(Pas de guard `disabled`.)_

#### APRÈS

Insérer avant `const domos = injectDomOS()` :

```ts
  if (options?.disabled) {
    return () => {};
  }
```

Remplacer `global: true` par :

```ts
      global: options?.global ?? true,
```

#### POURQUOI

- Même logique de guard que Fichier 2 : le guard précède `injectDomOS()`.
- `global: true` par défaut est maintenu : la navigation est globale par nature — le changement de défaut est un breaking change non demandé.
- Rétrocompatible : les callsites existants sans `options` gardent le même comportement.

---

### Fichier 4 — `packages/angular/src/public-api.ts`

#### AVANT

```ts
export type { DomOSNavigationOptions, DomOSViewStateArgs, DomOSViewStateHandler } from './lib/types/types';
```

_(ou équivalent — `DomOSViewStateOptions` absent de l'export.)_

#### APRÈS

```ts
export type { DomOSNavigationOptions, DomOSViewStateArgs, DomOSViewStateHandler, DomOSViewStateOptions } from './lib/types/types';
```

#### POURQUOI

Un type défini mais non exporté n'est pas un type public. Les consommateurs du package ne peuvent pas typer l'argument `options` sans cet export.

---

## Gate de validation

- [ ] `pnpm --filter @domos/angular build` se termine avec exit code 0
- [ ] `pnpm --filter @domos/angular test` : 5/5 tests passent (ou N/N si le count diffère — aucun test en régression)
- [ ] `registerViewStateTool(handler, { disabled: true })` retourne `() => {}` sans lever d'erreur Angular injection
- [ ] `registerViewStateTool(handler, { global: true })` appelle `registerTool` avec `global: true`
- [ ] `registerViewStateTool(handler)` appelle `registerTool` avec `global: false` (défaut inchangé)
- [ ] `registerNavigationTool(handler, { disabled: true })` retourne `() => {}` sans appeler `injectDomOS`
- [ ] `registerNavigationTool(handler, { global: false })` appelle `registerTool` avec `global: false`
- [ ] `registerNavigationTool(handler)` appelle `registerTool` avec `global: true` (défaut inchangé)
- [ ] `DomOSViewStateOptions` est importable depuis `@domos/angular` dans un consommateur externe
- [ ] Aucune modification hors `packages/angular/` dans le diff final

---

## Note compatibilité arrière

Ces deux patches sont strictement rétrocompatibles :

- `registerViewStateTool(handler)` sans second argument continue de fonctionner à l'identique.
- `registerNavigationTool(handler, { description: '...' })` sans `disabled` ni `global` continue de fonctionner à l'identique.
- Les valeurs par défaut (`global: false` pour `ui_state`, `global: true` pour `navigate`) reconstituent exactement le comportement actuel hardcodé.
- Aucun import existant dans `apps/demo-angular` ou ailleurs n'est cassé.
