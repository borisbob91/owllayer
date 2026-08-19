# Feature #25 : Bootstrap du domaine Angular SDK

**Statut** : 🟡 Validée  
**Domaine** : angular (nouveau domaine, distinct de ui)  
**Porteur** : @BorisBob  
**Validé par** : @BorisBob  
**Date** : 2026-04-06  

---

## Positionnement

Cette feature est une feature de cadrage et de bootstrap de domaine.

Elle ne lance pas l'implementation Angular. Elle ne cree pas de package Angular. Elle ne cree pas de demo Angular. Elle ne modifie pas le runtime partage ui. Elle fixe une frontiere de responsabilite et une sequence de livraison pour eviter un chantier flou.

La decision structurelle de cette feature est explicite :

- Angular devient un domaine OwlLayer distinct de ui.
- ui reste un runtime partage cross-framework.
- Toute question de bridge entre Angular et ui doit etre traitee dans une feature separee.
- Toute implementation Angular doit venir apres ce cadrage, puis apres le bridge ui separe si ce bridge est reellement necessaire, puis seulement apres en review/gate.

---

## Diagnostic actuel

L'etat actuel du repo est simple et ne laisse pas de marge d'interpretation utile :

- Le monorepo OwlLayer possede deja des domaines SDK et runtime distincts pour React, Vue, Svelte, Browser et ui.
- Le domaine ui existe deja comme runtime partage cross-framework et comme surface commune pour les outils embarques.
- Aucun package Angular dedie n'existe aujourd'hui dans le monorepo.
- Aucune app de demonstration Angular dediee n'existe aujourd'hui dans le monorepo.
- Aucune mention Angular ou `@owllayer/angular` n'existe aujourd'hui dans le repo OwlLayer.
- Les features ui recentes ont consolide ui comme domaine partage, pas comme point d'entree implicite pour tous les frameworks.

Le risque principal n'est donc pas un manque de code. Le risque principal est un mauvais cadrage : faire entrer Angular "par ui" ou melanger cadrage, bridge runtime, implementation SDK et review dans un seul chantier.

---

## Besoin

OwlLayer a besoin d'un cadrage explicite pour l'entree d'Angular dans le monorepo, afin d'eviter trois derives previsibles :

- confondre Angular avec une simple extension du domaine ui
- ouvrir une future PR multi-domaines sans frontiere claire
- figer trop tot une API Angular ou un bridge ui sans avoir isole le besoin reel

Le besoin de cette feature n'est pas de livrer du code Angular.

Le besoin est de rendre la suite gouvernable, sequentielle et verifiable.

### User story

> En tant que porteur OwlLayer, je veux cadrer Angular comme un domaine distinct de ui, afin d'eviter un chantier multi-domaines implicite et de pouvoir lancer ensuite un bridge eventuel, puis une implementation Angular, puis une review finale dans un ordre strict.

---

## Perimetre strict

### Ce que cette feature fait

- Formalise Angular comme un domaine OwlLayer distinct de ui.
- Fige la regle suivante : ui reste un runtime partage cross-framework et n'absorbe pas le domaine Angular.
- Definit la sequence de livraison obligatoire :
  1. cadrage Angular
  2. bridge ui separe si necessaire
  3. implementation Angular
  4. review et gate finale
- Cadre les documents de gouvernance a mettre a jour ou a creer avant toute implementation.
- Empeche explicitement qu'un futur chantier Angular demarre directement par des fichiers runtime ou SDK.

### Ce que cette feature ne fait PAS

- Ne cree aucun package Angular.
- Ne cree aucune demo Angular.
- Ne modifie aucun package existant.
- Ne modifie pas ui.
- Ne definit pas d'API publique Angular a ce stade.
- Ne definit pas de bridge runtime Angular/ui a ce stade.
- Ne modifie pas ADTP.
- Ne promet pas de compatibilite Angular tant qu'une feature d'implementation dediee n'a pas ete validee.
- Ne melange pas Angular avec react, vue, svelte, browser ou ui dans une meme phase d'implementation.

> Toute avancee hors de ce perimetre requiert une feature distincte.

---

## AVANT

- Angular n'existe pas comme domaine OwlLayer explicite.
- ui existe deja comme runtime partage cross-framework.
- Rien, dans l'etat actuel, ne protege formellement contre un faux raccourci consistant a traiter Angular comme une extension implicite de ui.
- Rien ne fige encore l'ordre de livraison entre cadrage Angular, bridge ui, implementation Angular et review.
- Une future implementation Angular pourrait donc partir dans plusieurs directions a la fois : runtime partage, SDK, demo, conventions d'integration et outillage, sans gate claire.

## APRES

- Angular est defini comme un domaine distinct de ui.
- ui conserve son role de runtime partage cross-framework.
- Le premier livrable Angular est un cadrage de domaine, pas du code.
- Le bridge ui eventuel est isole dans une feature separee, uniquement si le besoin est confirme.
- L'implementation Angular devient impossible a lancer proprement sans passer par la sequence validee.
- La review finale Angular devient une phase dediee et non un appendice improvise en fin d'implementation.

## POURQUOI

- Un domaine non cadre devient immediatement un chantier multi-domaines.
- ui a deja une responsabilite claire dans OwlLayer ; lui ajouter Angular "par defaut" brouillerait son perimetre.
- Angular merite sa propre lecture d'integration, pas une transposition rapide des patterns React ou Vue.
- Le cout principal a ce stade est un cout de gouvernance, pas un cout de code.
- La meilleure facon de limiter la dette ici est de refuser l'implementation tant que la frontiere de domaine et l'ordre de livraison ne sont pas ecrits noir sur blanc.

---

## Regles de design

- Angular est un domaine OwlLayer autonome.
- ui n'est pas le domaine Angular.
- ui reste strictement le runtime partage cross-framework et la couche commune deja cadree par les features ui existantes.
- Aucun futur document Angular ne doit redefinir ui pour justifier l'arrivee d'Angular.
- Aucun futur document Angular ne doit embarquer en une seule phase :
  - le cadrage de domaine
  - le bridge ui
  - l'implementation SDK
  - la review finale
- Si un besoin de bridge ui apparait, il doit etre documente separement, avec son propre perimetre, ses propres fichiers cibles et sa propre gate.
- Tant que le bridge ui separe n'est pas valide ou explicitement juge inutile, l'implementation Angular ne doit pas absorber cette discussion.

---

## Interface de service visee

Non applicable a cette phase.

Cette feature ne fige ni provider Angular, ni wrapper runtime, ni facade publique `@owllayer/angular`, ni API de bridge vers ui.

### Methodes de service

Non applicables a cette phase.

### startIndex

Non applicable a cette phase.

### Boilerplate libs

Non applicables a cette phase.  
Le choix d'un boilerplate Angular eventuel appartient a la future feature d'implementation Angular, pas a ce cadrage.

---

## Fichiers impactes

| Fichier | AVANT | APRES | POURQUOI |
| --- | --- | --- | --- |
| Ce document | absent | feature de cadrage Angular prete a validation | Poser la frontiere de domaine avant tout code |
| [../AGENTS.md](../AGENTS.md) | table des domaines sans Angular | ajout d'Angular comme domaine distinct, separe de ui | Aligner la gouvernance agent sur la nouvelle frontiere |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | workflow mono-domaine sans Angular explicite | ajout du domaine Angular et rappel de la sequence obligatoire Angular -> bridge ui eventuel -> implementation -> review | Empecher une future PR multi-domaines implicite |
| [README.md](README.md) | index des features sans feature 25 | ajout de la feature 25 dans l'index | Rendre le cadrage visible et tracable |
| Futur document feature dedie au bridge ui/Angular | absent | document separe, cree seulement si le besoin de bridge est confirme | Isoler le sujet ui au lieu de le dissoudre dans la feature Angular |
| Futur document feature dedie a l'implementation Angular | absent | document separe, cree apres validation du cadrage et apres le bridge ui si necessaire | Empecher de transformer ce cadrage en pseudo-feature de code |

---

## Ce qui ne sera pas modifie

- Aucun package SDK existant.
- Aucun package runtime existant.
- Aucune app de demonstration existante.
- Aucun fichier dans le protocole ADTP.
- Aucune feature ui existante, notamment :
  - [feature_12_ui_devtools_cross_framework.md](feature_12_ui_devtools_cross_framework.md)
  - [feature_19_ui_embedded_devtools_panel_parity.md](feature_19_ui_embedded_devtools_panel_parity.md)
  - [feature_23_react_ui_event_dx_adoption.md](feature_23_react_ui_event_dx_adoption.md)
- Aucune surface publique runtime dans ui.
- Aucun contrat d'integration Angular concret.
- Aucune dependance npm.

---

## Dependances

### References de gouvernance

- [../AGENTS.md](../AGENTS.md)
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
- [README.md](README.md)

### References de positionnement ui

- [feature_12_ui_devtools_cross_framework.md](feature_12_ui_devtools_cross_framework.md)
- [feature_19_ui_embedded_devtools_panel_parity.md](feature_19_ui_embedded_devtools_panel_parity.md)
- [feature_23_react_ui_event_dx_adoption.md](feature_23_react_ui_event_dx_adoption.md)

### Dependances de livraison

- Validation explicite du principe "Angular est distinct de ui".
- Validation explicite du principe "ui reste un runtime partage cross-framework".
- Decision ulterieure separee sur l'existence reelle d'un bridge ui/Angular.
- Creation ulterieure d'une feature d'implementation Angular dediee.
- Creation ulterieure d'une review/gate Angular dediee.

---

## Risques

| Risque | Effet concret | Mitigation |
| --- | --- | --- |
| Confondre Angular avec ui | Ouverture d'un chantier multi-domaines des la premiere PR | Decision explicite : Angular est distinct de ui |
| Ouvrir un bridge ui dans la feature Angular | Perimetre flou et gouvernance impossible a relire | Bridge ui traite dans une feature separee uniquement |
| Promettre trop tot une API Angular | Contrat public fige avant l'audit reel des besoins Angular | Interface de service declaree non applicable a cette phase |
| Copier la logique d'un SDK existant sans audit Angular | Mauvaise integration et dette de domaine des le depart | Implementation Angular repoussee a une feature dediee |
| Melanger documentation, implementation et review | PR impossible a borner et a valider proprement | Sequence stricte en quatre etapes |
| Toucher ui trop tot | Regression sur le runtime partage pour un besoin encore non valide | ui reste hors scope de ce cadrage |

---

## Criteres d'acceptation verifiables

- [ ] Le document pose explicitement qu'Angular est un domaine distinct de ui.
- [ ] Le document pose explicitement que ui reste un runtime partage cross-framework.
- [ ] Le document interdit explicitement de lancer l'implementation Angular dans cette phase.
- [ ] Le document interdit explicitement de traiter le bridge ui dans la meme phase que le cadrage Angular.
- [ ] Le document impose un ordre de livraison strict en quatre etapes.
- [ ] Les fichiers cibles restent limites a la gouvernance et a la documentation.
- [ ] Aucun package ni aucune app n'entre dans le perimetre de cette feature.
- [ ] L'interface de service est marquee non applicable a cette phase.
- [ ] Les references de gouvernance et les features ui existantes sont prises en compte.
- [ ] Le document est directement exploitable comme base de validation avant toute feature Angular de code.

---

## Plan journalier

### Jour 1

- Relire la gouvernance OwlLayer et les features ui existantes.
- Figer la decision de domaine : Angular n'entre pas par ui.
- Figer le statut de la phase : cadrage uniquement, zero code.

### Jour 2

- Rediger et valider la feature de bootstrap Angular.
- Verifier que le perimetre reste documentaire et mono-domaine.
- Verifier que la sequence de livraison est explicite et non contournable.

### Jour 3

- Aligner les documents de gouvernance pour integrer Angular comme domaine distinct.
- Mettre a jour l'index des features pour rendre visible la feature 25.
- Verifier que ces mises a jour n'ouvrent aucune promesse d'implementation.

### Jour 4

- Decider si un bridge ui/Angular est reellement necessaire.
- Si oui, ouvrir un document feature separe de bridge.
- Si non, documenter explicitement que l'implementation Angular pourra demarrer sans bridge dedie.

### Jour 5

- Preparer la future feature d'implementation Angular, toujours separee du bridge.
- Lister son perimetre cible sans ecrire de code.
- Preparer la review/gate finale comme phase distincte et obligatoire.

---

## Gate fin de sprint

Le sprint est termine uniquement si :

1. Angular est officiellement cadre comme domaine distinct de ui.
2. ui reste explicitement decrit comme runtime partage cross-framework.
3. Aucun code Angular n'a ete promis ni lance dans cette phase.
4. Aucun fichier dans les packages ou les apps n'entre dans le perimetre de cette feature.
5. Les seuls impacts autorises sont des impacts de gouvernance et de documentation.
6. Le besoin eventuel de bridge ui/Angular est explicitement sorti dans une phase separee.
7. La future implementation Angular est explicitement repoussee a une feature dediee.
8. La review Angular finale est explicitement prevue comme une etape autonome.

---

## Hypotheses ouvertes

- Angular necessitera probablement un domaine SDK dedie, mais ce cadrage ne fige pas encore sa forme exacte.
- Un bridge ui/Angular ne sera pas forcement necessaire ; il doit etre justifie, pas presume.
- Les patterns des SDK existants peuvent servir de reference de lecture, mais pas de justification automatique pour la future API Angular.
- La future implementation Angular devra determiner separement :
  - la surface publique reellement utile
  - la strategie de demo
  - la compatibilite avec le runtime partage existant
- Si l'analyse d'implementation montre un impact sur core ou ui, cet impact devra etre traite dans des features sequentielles dediees, pas absorbe dans le domaine Angular.

---

## Ordre de livraison recommande

1. Feature 25 : cadrage du domaine Angular et validation de la frontiere Angular != ui.
2. Feature separee de bridge ui/Angular, uniquement si le besoin est demontre.
3. Feature separee d'implementation Angular.
4. Feature ou gate de review finale Angular.

---

## Ce qu'on ne fait pas

- creer un package Angular dans cette phase
- creer une app de demo Angular dans cette phase
- modifier ui pour "preparer" Angular sans document dedie
- figer une API publique Angular sans feature d'implementation
- ouvrir une PR multi-domaines Angular + ui + core par commodite
- considerer qu'un besoin de bridge ui existe tant qu'il n'est pas demontre
- confondre cadrage produit et debut d'implementation
