# Feature #32 : Contrat editorial de la documentation publiee DomOS

**Statut** : Jaune - Validee  
**Domaine** : documentation (`apps/docs-site`)  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-05-25

---

## Besoin

La documentation publiee doit expliquer DomOS avant de presenter ses API. Un developpeur doit comprendre la proposition de valeur, le role d'ADTP, la place du serveur et le contrat d'execution d'un tool sans deduire ces notions d'exemples disperses.

### Definition de reference

> DomOS est un SDK d'**AI-driven interfaces**, ou interfaces agentiques. Il permet a un agent IA d'agir dans une interface existante par des actions que le developpeur declare explicitement. L'application conserve sa logique metier et ses garde-fous ; l'agent recoit seulement le contexte utile et les tools disponibles sur l'ecran courant.

### User story

> En tant que developpeur integrateur, je veux comprendre le modele DomOS avant d'installer un SDK, afin d'exposer des tools fiables sans donner a l'agent un acces implicite a mon application.

---

## Perimetre strict

### Ce que cette feature fait

- Normalise la definition de DomOS et d'ADTP dans les pages d'entree.
- Explique le cycle contexte -> tool call -> resultat -> reponse.
- Documente le contrat asynchrone reel : le resultat depend de la Promise retournee par le handler.
- Situe Angular sans attribuer a Zone.js un comportement non demontre par le code.
- Presente le serveur comme orchestrateur de session et de modele, et non comme backend metier automatique.

### Ce que cette feature ne fait pas

- Ne modifie aucun package runtime ni exemple d'application.
- Ne change ni le protocole ADTP, ni les SDK, ni le serveur.
- Ne corrige pas le build statique `/404`, couvert par `issues/issue_18_docs_site_404_static_build.md`.
- Ne refond pas l'identite graphique, couverte par la feature #33.

---

## Sources techniques verifiees

| Sujet documente | Source de verite |
| --- | --- |
| Client commun, tool calls et resultats | `packages/core/src/client/DomOSClient.ts` |
| Messages ADTP | `packages/core/src/protocol/adtp.types.ts`, `adtp.serializer.ts` |
| Routage des tools cote serveur | `packages/server/src/core/ToolRouter.ts` |
| Transport WebSocket | `packages/server/src/transport/adtp.transport.ts` |

---

## Fichiers qui seront modifies

| Fichier | Nature de la modification |
| --- | --- |
| `features/feature_32_docs_editorial_contract.md` | Canvas de la feature |
| `sprints/SPRINT-18-docs-editorial-contract.md` | Plan executable et liste de controle |
| `apps/docs-site/src/content/docs/index.mdx` | Definition de reference et parcours de lecture |
| `apps/docs-site/src/content/docs/about.mdx` | Positionnement produit coherent |
| `apps/docs-site/src/content/docs/getting-started.mdx` | Introduction et contrat avant installation |
| `apps/docs-site/src/content/docs/core-concepts.mdx` | Definitions, tools et asynchronisme |
| `apps/docs-site/src/content/docs/architecture.mdx` | Architecture expliquee avant diagrammes |
| `apps/docs-site/src/content/docs/adtp-protocol.mdx` | Definition et sequence ADTP |
| `apps/docs-site/src/content/docs/server/index.mdx` | Role du serveur et articulation ADTP |

> Tout changement d'une autre page appartient a un sprint separe.

---

## Criteres d'acceptation

- [ ] La definition de reference apparait clairement sur la page d'accueil et reste coherente dans les pages de concepts et serveur.
- [ ] ADTP est defini avant que ses messages soient listes.
- [ ] Les pages distinguent contexte observable, tools autorises et logique metier.
- [ ] Le contrat asynchrone mentionne `return`/`await` et ne repose pas sur une explication speculative de Zone.js.
- [ ] Les pages se terminent par des cartes de navigation utiles.
- [ ] `pnpm --filter @domos/docs-site build` est execute ; toute panne preexistante est tracee dans l'issue dediee.

