# Issue #16 : Le bundle IIFE WooCommerce charge en script statique mais n'expose pas window.OwlLayerWoo

**Statut** : 🟢 Résolue  
**Priorite** : 🔴 Bloquant  
**Domaine** : woocommerce  
**Porteur** : @BorisBob  
**Date** : 2026-04-06  

---

## Resume

La feature 28 a livre un harness HTML statique dans [owllayer/packages/woocommerce/static-harness.html](owllayer/packages/woocommerce/static-harness.html), mais le bootstrap reel reste bloque avant tout appel reseau utile : le script [owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js](owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js) se charge bien en script classique, puis le global attendu `window.OwlLayerWoo` reste absent.

Impact utilisateur : dans le harness, le statut JS passe a `loaded`, puis `OwlLayerWoo.init(...)` ne peut pas demarrer. Ce bug sort du scope du harness lui-meme et ouvre un sujet WooCommerce separe, conforme a [owllayer/features/feature_28_woocommerce_static_harness.md](owllayer/features/feature_28_woocommerce_static_harness.md).

---

## Codes stables d'observation

| Code | Condition observee | Decision attendue |
| --- | --- | --- |
| `WOO-BUNDLE-GLOBAL-001` | le harness marque `Bundle script: loaded` | constater que le chargement reseau du script n'est pas le point de rupture |
| `WOO-BUNDLE-GLOBAL-002` | le harness marque `window.OwlLayerWoo: missing after script load` | ouvrir une issue WooCommerce dediee au bundle/global |
| `WOO-BUNDLE-GLOBAL-003` | `OwlLayerWoo.init(...)` reste bloque car le global est absent | ne pas etendre le scope du harness, investiguer le build/runtime WooCommerce |

---

## Reproduction

### Conditions

- Version affectee : etat courant de [owllayer/packages/woocommerce](owllayer/packages/woocommerce) au 2026-04-06
- Environnement : serveur statique minimal servant [owllayer/packages/woocommerce](owllayer/packages/woocommerce)
- Configuration : harness livre par la feature 28, bundle minifie deja genere dans [owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js](owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js)

### Scenario pas-a-pas

1. Construire le package WooCommerce pour obtenir le bundle minifie courant.
2. Servir [owllayer/packages/woocommerce/static-harness.html](owllayer/packages/woocommerce/static-harness.html) via un serveur statique local.
3. Ouvrir la page et laisser le harness charger le script reference en [owllayer/packages/woocommerce/static-harness.html#L244](owllayer/packages/woocommerce/static-harness.html#L244).
4. Observer le handler `onload` du harness en [owllayer/packages/woocommerce/static-harness.html#L245](owllayer/packages/woocommerce/static-harness.html#L245), qui confirme d'abord `Bundle script: loaded`, puis teste la presence de `window.OwlLayerWoo`.
5. Constater que le log du harness passe par le chemin `window.OwlLayerWoo missing after script load`, puis que l'appel d'init est bloque par la garde definie en [owllayer/packages/woocommerce/static-harness.html#L199](owllayer/packages/woocommerce/static-harness.html#L199).
6. → Bug observe : le bundle est charge par un script classique, mais le global attendu n'est pas expose et `OwlLayerWoo.init(...)` ne demarre pas.
7. → Observation complementaire : le blocage survient avant les appels reseau WooCommerce attendus ; le defaut n'est donc pas un probleme Store API ou WordPress dans cette reproduction.

---

## Analyse technique

### Cause racine presommee

Le point d'entree source exporte bien `OwlLayerWoo` depuis [owllayer/packages/woocommerce/src/index.ts](owllayer/packages/woocommerce/src/index.ts), donc le probleme n'est pas borne a l'API publique TypeScript en elle-meme.

La cause racine la plus probable est le shim de build IIFE defini dans [owllayer/packages/woocommerce/esbuild.config.mjs#L45-L51](owllayer/packages/woocommerce/esbuild.config.mjs#L45-L51). Cette configuration force :

- un `globalName: 'OwlLayerWooExports'`
- un `banner` commencant par `var _exports =`
- un `footer` terminant par `g.OwlLayerWoo = _exports.OwlLayerWoo`

Or l'artefact genere commence reellement par :

- [owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js#L1](owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js#L1) : `(function(g){ var _exports =`
- [owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js#L2](owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js#L2) : `"use strict";var OwlLayerWooExports=...`

Sur cet artefact, `_exports` n'apparait pas comme le resultat de l'IIFE exportee, mais comme une variable ouverte juste avant la directive `"use strict"`. Dans ce cas, l'affectation finale vers `g.OwlLayerWoo = _exports.OwlLayerWoo` a de fortes chances de dereferencer une valeur incorrecte et d'exposer `undefined` au lieu de `OwlLayerWoo`.

### Niveau de preuve

Confiance : **elevee** sur un defaut borne au shim de build IIFE, car :

- le harness constate bien `script loaded` puis `global missing`
- [owllayer/packages/woocommerce/src/index.ts](owllayer/packages/woocommerce/src/index.ts) exporte deja `OwlLayerWoo`
- le bundle genere montre un prefixe incompatible avec l'intention du shim de build

Limite restante : la correction exacte n'est pas encore prouvee tant qu'une regeneration du bundle n'a pas valide le retour de `window.OwlLayerWoo` dans le harness. L'issue doit donc rester formulee comme bug de build/global expose, pas comme correctif deja acquis.

### Pourquoi c'est un bug (et pas un comportement attendu)

La feature 28 visait explicitement un harness statique capable de charger [owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js](owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js) via script classique puis d'appeler `OwlLayerWoo.init(...)`. Dans ce contrat, un script `loaded` sans `window.OwlLayerWoo` disponible est un echec de bootstrap du bundle, pas une limite acceptable du harness.

Le defaut intervient avant tout appel reseau WooCommerce, avant Store API, avant WordPress et avant toute logique metier de [owllayer/packages/woocommerce/src/OwlLayerWoo.ts](owllayer/packages/woocommerce/src/OwlLayerWoo.ts). Le scope du bug est donc bien le packaging/runtime global du bundle WooCommerce.

---

## Solution

### Approche retenue

**AVANT**

Le bundle IIFE WooCommerce depend d'un shim `banner/footer` custom dans [owllayer/packages/woocommerce/esbuild.config.mjs](owllayer/packages/woocommerce/esbuild.config.mjs) pour exposer `OwlLayerWoo` sur le global navigateur.

**APRES**

Le futur correctif devra retablir une exposition deterministe de `OwlLayerWoo` pour les consommateurs en script classique, puis regenerer uniquement les artefacts WooCommerce derives de ce build.

**POURQUOI**

Le bug est deja observable sans WordPress ni Store API. Corriger le harness, [owllayer/packages/woocommerce/src/OwlLayerWoo.ts](owllayer/packages/woocommerce/src/OwlLayerWoo.ts) ou la logique reseau ne traiterait pas la rupture reelle documentee ici.

### Fichiers potentiellement a modifier

| Fichier | AVANT | APRES | POURQUOI | Risque |
| --- | --- | --- | --- | --- |
| [owllayer/packages/woocommerce/esbuild.config.mjs](owllayer/packages/woocommerce/esbuild.config.mjs) | shim IIFE custom reposant sur `banner/footer` pour exposer `OwlLayerWoo` | ajuster uniquement la strategie d'exposition globale du bundle classique | la cause racine presommee est bornee a cette couche de build | Moyen |
| [owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js](owllayer/packages/woocommerce/dist/owllayer-woocommerce.min.js) | artefact genere qui ne fournit pas `window.OwlLayerWoo` dans le harness statique | regenerer l'artefact apres correction du build | l'issue porte sur le bundle livre effectivement au navigateur | Faible |
| [owllayer/packages/woocommerce/plugin/assets/owllayer-woocommerce.min.js](owllayer/packages/woocommerce/plugin/assets/owllayer-woocommerce.min.js) | copie plugin du meme bundle minifie | realigner la copie plugin si l'artefact build est regenere | eviter une divergence entre bundle package et bundle plugin | Faible |

> ⚠️ Tout fichier modifie en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifie

- [owllayer/packages/woocommerce/static-harness.html](owllayer/packages/woocommerce/static-harness.html) : hors scope, il sert de reproduction et non de source du bug
- [owllayer/packages/woocommerce/src/index.ts](owllayer/packages/woocommerce/src/index.ts) : hors scope a ce stade, l'export source de `OwlLayerWoo` existe deja
- [owllayer/packages/woocommerce/src/OwlLayerWoo.ts](owllayer/packages/woocommerce/src/OwlLayerWoo.ts) : hors scope tant qu'aucune preuve ne montre un defaut interne a `init(...)`
- [owllayer/packages/woocommerce/plugin/owllayer-woocommerce.php](owllayer/packages/woocommerce/plugin/owllayer-woocommerce.php) : hors scope, le bug observe ici apparait hors WordPress avant toute integration PHP

---

## Tests

- [ ] verification manuelle : [owllayer/packages/woocommerce/static-harness.html](owllayer/packages/woocommerce/static-harness.html) affiche toujours `Bundle script: loaded`
- [ ] verification manuelle : [owllayer/packages/woocommerce/static-harness.html](owllayer/packages/woocommerce/static-harness.html) affiche apres correctif `window.OwlLayerWoo: available`
- [ ] verification manuelle : `OwlLayerWoo.init(...)` n'est plus bloque faute de global manquant
- [ ] verification manuelle : le blocage bootstrap ne survient plus avant les appels reseau attendus
- [ ] `pnpm --filter @owllayer/woocommerce build` passe
- [ ] si [owllayer/packages/woocommerce/plugin/assets/owllayer-woocommerce.min.js](owllayer/packages/woocommerce/plugin/assets/owllayer-woocommerce.min.js) reste versionne, son contenu est realigne avec l'artefact regenere

---

**Résolu le** : 2026-04-06 — Fix esbuild.config.mjs : banner supprimé, footer corrigé. Confirmé par @BorisBob via static-harness.html.