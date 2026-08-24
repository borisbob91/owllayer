# Issue #18 : Le build statique de la documentation echoue sur la route `/404`

**Statut** : Vert - Corrige  
**Priorite** : Jaune - Majeur  
**Domaine** : documentation (`apps/docs-site`)  
**Porteur** : @BorisBob  
**Date** : 2026-05-25

---

## Resume

L'application Astro/Starlight etait utilisable en mode developpement, mais son build statique echouait pendant la generation de `/404.html`. La correction stabilise la resolution de Zod dans l'application docs et permet de produire la sortie statique.

---

## Reproduction

### Conditions

- Version affectee : commit de reference `3f81007`
- Environnement : Windows, workspace pnpm
- Application : `apps/docs-site`

### Scenario pas-a-pas

1. Executer `pnpm --filter @owllayer/docs-site build` depuis la racine du monorepo.
2. Laisser Astro synchroniser la collection `docs`, construire les entrypoints et demarrer les routes statiques.
3. Observer le passage sur la route `/404`.
4. Resultat observe :

```text
Entry docs -> 404 was not found.
Cannot read properties of undefined (reading '_zod')
```

Un avertissement est egalement affiche parce que `apps/docs-site/src/content/i18n/` n'existe pas.

---

## Analyse technique

L'erreur survient pendant le rendu de la page statique `/404`. Le diagnostic doit distinguer le message de recherche d'entree de l'echec `_zod` qui arrete reellement le build.

### Constats confirmes

La version installee `@astrojs/starlight@0.32.6` execute, dans `utils/routing/data.ts`, la sequence suivante pour la route statique 404 :

```ts
const userEntry = await getEntry('docs', '404');
const entry = userEntry ? normalizeCollectionEntry(userEntry) : fallbackEntry;
```

L'application ne contient initialement aucune entree `docs/404`, ce qui explique le message `Entry docs -> 404 was not found.`. Un essai avec une entree `docs/404.mdx` explicite a supprime ce message, mais le build echoue encore sur `Cannot read properties of undefined (reading '_zod')`. L'absence d'une page 404 personnalisee n'est donc pas la cause racine.

La stack de l'echec chargeait `zod@4.3.6` depuis le projet parent `C:\Users\BorisBob\Downloads\autoflow-ai-hub (3)\node_modules`, alors que Astro/Starlight utilisent `zod@3.25.76`. Comme `apps/docs-site` ne declarait pas `zod` directement, la resolution Node pouvait remonter hors du workspace OwlLayer pour certains imports de configuration.

La correction consiste a declarer `zod@3.25.76` dans `apps/docs-site/package.json`, ce qui force la resolution locale attendue par Astro/Starlight.

### Fichiers inspectes

| Fichier | Observation |
| --- | --- |
| `apps/docs-site/astro.config.mjs` | Les locales configurent la documentation, sans fournir d'entree 404. |
| `apps/docs-site/src/content.config.ts` | La collection `docs` utilise `docsLoader()` et `docsSchema()`. |
| `apps/docs-site/package.json` | L'application declare Starlight et Astro. |
| `pnpm-lock.yaml` / installation locale | Versions effectives : `@astrojs/starlight@0.32.6`, `astro@5.18.1`. |
| `node_modules/@astrojs/starlight/utils/routing/data.ts` | `get404Route()` cherche explicitement `getEntry('docs', '404')`, mais possede un fallback. |
| Stack trace du build | La resolution en erreur pointe vers le `zod@4.3.6` du projet parent, hors installation `owllayer`. |
| `apps/docs-site/package.json` | L'application ne declarait pas `zod` directement avant correction. |

### Pourquoi c'est un bug

Une application de documentation destinee a publication doit produire une sortie statique. Le fait que le serveur de developpement rende les pages ne compense pas un `astro build` en echec.

---

## Solution

### Approche retenue

1. Conserver la reproduction sur le snapshot de reference.
2. Ne pas conserver l'entree `404.mdx` experimentale, puisqu'elle ne corrige pas l'echec.
3. Declarer `zod@3.25.76` dans `apps/docs-site`, la version attendue par Astro 5/Starlight dans cette installation.
4. Ajouter une entree i18n minimale pour supprimer le warning de collection vide.
5. Declarer `site` dans `astro.config.mjs` via `DOCS_SITE_URL`, avec fallback local pour les builds de developpement.
6. Ne pas conserver de page `404.mdx` : elle provoque un conflit entre le slug docs `/404` et la route native Starlight `/404`.
7. Verifier les routes documentaires et `/404`.

### Fichiers qui seront modifies

| Fichier | Type de modification | Risque |
| --- | --- | --- |
| `issues/issue_18_docs_site_404_static_build.md` | Diagnostic, solution et validation | Faible |
| `apps/docs-site/package.json` | Dependence directe `zod@3.25.76` pour stabiliser la resolution | Faible |
| `pnpm-lock.yaml` | Lockfile mis a jour pour l'importer docs | Faible |
| `apps/docs-site/astro.config.mjs` | `site` configure pour le sitemap | Faible |
| `apps/docs-site/src/content/i18n/fr.json` | Entree i18n minimale valide | Faible |

### Ce qui ne sera pas modifie

- Les packages runtime OwlLayer.
- Les pages de contenu pour masquer l'erreur.
- Les features editoriales ou visuelles de la documentation.
- Les packages runtime OwlLayer.
- Les pages de contenu editoriales non liees au build.

---

## Tests

- [x] La panne est reproduite avec `pnpm --filter @owllayer/docs-site build` sur le snapshot `3f81007`.
- [x] L'ajout d'une page `404.mdx` est invalide comme correctif : l'echec `_zod` persiste.
- [x] La cause racine de la resolution Zod externe est identifiee.
- [x] Le build statique genere `/404.html` et les routes docs avec un code de sortie `0`.
- [x] Le mode developpement continue de servir les pages francaises et anglaises attendues.
