---
mode: agent
description: >
  Sprint 18 - Aligner les pages d'entree de la documentation Astro sur la
  definition DomOS, ADTP et le contrat asynchrone reel des tools.
---

# Sprint 18 - Contrat editorial de la documentation

**Base :** `3f81007 docs(site): checkpoint current Astro documentation app`  
**Perimetre :** `apps/docs-site/src/content/docs/` uniquement pour le contenu  
**Reference :** `features/feature_32_docs_editorial_contract.md`

## Objectif

Donner au developpeur une lecture progressive : ce qu'est DomOS, ce qu'est ADTP, quelles actions l'agent peut realiser, quel role joue le serveur et quel resultat doit retourner un handler asynchrone.

## Fichiers cibles

| Fichier | Resultat attendu |
| --- | --- |
| `apps/docs-site/src/content/docs/index.mdx` | Positionnement public et portes d'entree |
| `apps/docs-site/src/content/docs/about.mdx` | Definition produit coherente |
| `apps/docs-site/src/content/docs/getting-started.mdx` | Contexte avant le code |
| `apps/docs-site/src/content/docs/core-concepts.mdx` | Glossaire et contrat tools |
| `apps/docs-site/src/content/docs/architecture.mdx` | Explication textuelle de l'architecture |
| `apps/docs-site/src/content/docs/adtp-protocol.mdx` | Definition et sequence des messages |
| `apps/docs-site/src/content/docs/server/index.mdx` | Role exact de `DomOSServer` |

## Gates

- [ ] Aucune affirmation de comportement n'est ajoutee sans ancrage dans le code actuel.
- [ ] Le passage Angular explique le contrat de Promise plutot qu'une hypothese sur Zone.js.
- [ ] Navigation de fin de page presente sur les pages d'entree.
- [ ] Verification du rendu local des routes modifiees.
- [ ] Resultat du build consigne dans `issues/issue_18_docs_site_404_static_build.md` tant que l'issue reste ouverte.

