# Feature #33 : Systeme visuel et diagrammes de la documentation DomOS

**Statut** : Jaune - Validee  
**Domaine** : documentation (`apps/docs-site`)  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-05-25

---

## Besoin

La documentation dispose du logo DomOS et de schemas d'architecture fondes sur le produit. Le rendu doit les integrer avec une hierarchie lisible et des diagrammes utiles, sans illustrations generiques ni cartes collees les unes aux autres.

### User story

> En tant que developpeur lisant l'architecture, je veux des schemas lisibles sur fond clair et des flux relies au texte, afin de comprendre rapidement ou s'executent le client, le serveur, le modele et HITL.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute une couche CSS legere compatible Starlight, basee sur les couleurs du logo.
- Rend les diagrammes statiques confortables a lire sur desktop et mobile.
- Harmonise l'explorateur interactif d'architecture sur fond clair.
- Ameliore l'espacement des groupes de navigation de fin de page.
- Utilise uniquement des schemas techniques correspondant au runtime documente.

### Ce que cette feature ne fait pas

- N'ajoute pas d'illustrations decoratives generees.
- Ne modifie pas le logo original.
- Ne remplace pas Starlight par un design system maison.
- Ne change aucune logique du SDK ou du serveur.

---

## Fichiers qui seront modifies

| Fichier | Nature de la modification |
| --- | --- |
| `features/feature_33_docs_visual_system_and_diagrams.md` | Canvas de la feature |
| `sprints/SPRINT-19-docs-visual-system.md` | Plan executable |
| `apps/docs-site/astro.config.mjs` | Charger la feuille de styles personnalisee |
| `apps/docs-site/src/styles/domos-docs.css` | Styles de lecture, schemas et cartes |
| `apps/docs-site/src/content/docs/index.mdx` | Classes de composition d'accueil si necessaire |
| `apps/docs-site/src/content/docs/architecture.mdx` | Cadre responsive du schema et de l'iframe |
| `apps/docs-site/src/content/docs/server/index.mdx` | Cadre du schema global |
| `apps/docs-site/src/content/docs/server/runtime-and-tools.mdx` | Cadre du flux runtime |
| `apps/docs-site/src/content/docs/server/security-and-storage.mdx` | Cadre du schema securite |
| `apps/docs-site/public/interactive/domos-schemas.html` | Theme clair et presentation interactive |
| `apps/docs-site/src/assets/docs/domos-architecture-globale.svg` | Espacement des noeuds qui se chevauchent |
| `apps/docs-site/src/assets/docs/server-runtime-flow.svg` | Lisibilite et proportions si necessaire |
| `apps/docs-site/src/assets/docs/server-security-storage.svg` | Lisibilite et proportions si necessaire |

---

## Criteres d'acceptation

- [ ] Le logo reste le signal visuel principal de l'accueil.
- [ ] Les diagrammes n'affichent aucun recouvrement de noeuds ou de libelles.
- [ ] Les schemas sont des representations techniques du code, pas des images d'ambiance.
- [ ] L'iframe interactive adopte le meme fond clair et reste exploitable sur mobile.
- [ ] Les cartes de navigation de fin de page ont un espacement regulier.
- [ ] Verification visuelle realisee sur l'accueil, l'architecture et une page serveur.

