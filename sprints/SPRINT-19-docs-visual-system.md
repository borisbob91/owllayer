---
mode: agent
description: >
  Sprint 19 - Stabiliser le rendu visuel clair de la documentation et des
  schemas techniques deja relies au fonctionnement DomOS.
---

# Sprint 19 - Systeme visuel et schemas techniques

**Base :** Sprint 18 editorial  
**Perimetre :** `apps/docs-site/` uniquement  
**Reference :** `features/feature_33_docs_visual_system_and_diagrams.md`

## Objectif

Transformer les schemas fournis en supports de comprehension confortables : noeuds espaces, contraste clair, dimension responsive, integration Starlight sobre et explorateur interactif coherent.

## Fichiers cibles

| Fichier | Resultat attendu |
| --- | --- |
| `apps/docs-site/astro.config.mjs` | CSS personnalisee chargee |
| `apps/docs-site/src/styles/domos-docs.css` | Regles globales documentaires limitees |
| `apps/docs-site/src/content/docs/index.mdx` | Composition d'accueil si necessaire |
| `apps/docs-site/src/content/docs/architecture.mdx` | Cadres de schemas reutilisables |
| `apps/docs-site/src/content/docs/server/index.mdx` | Schema global integre |
| `apps/docs-site/src/content/docs/server/runtime-and-tools.mdx` | Schema runtime integre |
| `apps/docs-site/src/content/docs/server/security-and-storage.mdx` | Schema securite integre |
| `apps/docs-site/public/interactive/domos-schemas.html` | Vue interactive claire et lisible |
| `apps/docs-site/src/assets/docs/domos-architecture-globale.svg` | Collision de noeuds corrigee |
| `apps/docs-site/src/assets/docs/server-runtime-flow.svg` | Ajustement de lisibilite si requis |
| `apps/docs-site/src/assets/docs/server-security-storage.svg` | Ajustement de lisibilite si requis |

## Gates

- [ ] Aucune illustration decorative ou fausse architecture.
- [ ] Diagrammes lisibles a largeur desktop et mobile.
- [ ] Verification visuelle navigateur sur les pages modifiees.
- [ ] Aucun changement de logique applicative.

