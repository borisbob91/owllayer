# Feature #35 : Consignes d'outils par niveau de risque dans le prompt agent

**Statut** : Jaune - Validee  
**Domaine** : server (`packages/server`, `apps/demo-server`)  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-09-25  
**GitHub issue** : https://github.com/borisbob91/owllayer/issues/80

---

## Besoin

Les agents (texte et voix) ne savent pas comment se comporter avec les tools OwlLayer : confirmation orale avant une simple lecture, silence pendant une action plus longue, succes annonce avant le resultat, nouvelle tentative apres un refus HITL. Les guides OpenAI Realtime (1.5 et 2) recommandent des regles par tool (proactif, preambule, confirmation) et de n'annoncer une action qu'apres son succes. OwlLayer connait deja le niveau de risque HITL de chaque tool, mais le modele ne le voit pas.

### User story

> En tant qu'integrateur, je veux que l'agent adapte automatiquement son comportement au niveau de risque de chaque tool, afin d'obtenir une experience vocale fluide sans ecrire ces regles a la main pour chaque page.

---

## Perimetre strict

### Ce que cette feature fait

- Ajoute l'option serveur `toolGuidance` (desactivee par defaut).
- Ajoute un tag a la description de chaque tool envoye au LLM :
  - `none` -> `[PROACTIVE]` : appel des que l'intention et les valeurs requises sont claires, sans confirmation ni annonce ;
  - `low` -> `[PREAMBLE]` : une phrase courte decrivant l'action, puis appel immediat ;
  - `high` / `critical` -> `[SCREEN CONFIRMATION]` : resume de l'action et de sa consequence, invitation a confirmer a l'ecran, puis appel immediat. Pas de confirmation orale : la modale HITL est la seule validation (decision du porteur).
- Ajoute au prompt systeme une section fixe "Tool Behavior" (EN/FR selon `language` du serveur) qui explique les tags et les regles generales : tools de la liste courante uniquement, succes annonce seulement apres un resultat positif, pas de nouvel appel apres un refus, echecs expliques sans erreur brute.
- Applique ces consignes dans tous les modes : texte, hybride, live (creation et `updateTools`), snapshot des bridges.
- Active l'option dans `apps/demo-server`.

### Ce que cette feature ne fait pas

- Ne modifie pas l'application du HITL ni les niveaux de risque.
- Ne modifie pas la surface `tools_effective` envoyee au client (DevTools).
- N'ajoute pas de phrases d'exemple par tool ni de machine a etats conversationnelle.
- N'active pas l'option par defaut.

---

## Conception

Les tags voyagent avec les descriptions des tools : quand les tools changent (navigation), `getAvailableToolDeclarations()` et `updateTools()` transportent deja la nouvelle liste, donc les regles restent justes sans reecrire le prompt. Le prompt ne contient qu'une section generique, stable pendant toute la session live.

Fichiers :

- `packages/server/src/core/toolGuidance.ts` : tags, texte de la section, annotation des declarations.
- `packages/server/src/core/OwlLayerServer.ts` : option, annotation dans `getAvailableToolDeclarations()`, section ajoutee aux prompts, `updateTools()` sur la surface annotee.
- `packages/server/tests/toolGuidance.test.ts` : tests.
- `apps/demo-server/src/server.ts` : activation.

---

## Validation

- Tests unitaires : tags par risque, section EN/FR, option desactivee par defaut, surface client inchangee, prompt live et texte.
- `@owllayer/server` build, lint et tests.
- Verification manuelle dans la demo (voix et texte).
