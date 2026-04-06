# Issue #16 : Le bundle IIFE WooCommerce charge en script statique mais n'expose pas window.DomOSWoo

**Statut** : 🟢 Résolue  
**Priorite** : 🔴 Bloquant  
**Domaine** : woocommerce  
**Porteur** : @BorisBob  
**Date** : 2026-04-06  

---

## Resume

La feature 28 a livre un harness HTML statique dans [domos/packages/woocommerce/static-harness.html](domos/packages/woocommerce/static-harness.html), mais le bootstrap reel reste bloque avant tout appel reseau utile : le script [domos/packages/woocommerce/dist/domos-woocommerce.min.js](domos/packages/woocommerce/dist/domos-woocommerce.min.js) se charge bien en script classique, puis le global attendu `window.DomOSWoo` reste absent.

Impact utilisateur : dans le harness, le statut JS passe a `loaded`, puis `DomOSWoo.init(...)` ne peut pas demarrer. Ce bug sort du scope du harness lui-meme et ouvre un sujet WooCommerce separe, conforme a [domos/features/feature_28_woocommerce_static_harness.md](domos/features/feature_28_woocommerce_static_harness.md).

---

## Codes stables d'observation

| Code | Condition observee | Decision attendue |
| --- | --- | --- |
| `WOO-BUNDLE-GLOBAL-001` | le harness marque `Bundle script: loaded` | constater que le chargement reseau du script n'est pas le point de rupture |
| `WOO-BUNDLE-GLOBAL-002` | le harness marque `window.DomOSWoo: missing after script load` | ouvrir une issue WooCommerce dediee au bundle/global |
| `WOO-BUNDLE-GLOBAL-003` | `DomOSWoo.init(...)` reste bloque car le global est absent | ne pas etendre le scope du harness, investiguer le build/runtime WooCommerce |

---

## Reproduction

### Conditions

- Version affectee : etat courant de [domos/packages/woocommerce](domos/packages/woocommerce) au 2026-04-06
- Environnement : serveur statique minimal servant [domos/packages/woocommerce](domos/packages/woocommerce)
- Configuration : harness livre par la feature 28, bundle minifie deja genere dans [domos/packages/woocommerce/dist/domos-woocommerce.min.js](domos/packages/woocommerce/dist/domos-woocommerce.min.js)

### Scenario pas-a-pas

1. Construire le package WooCommerce pour obtenir le bundle minifie courant.
2. Servir [domos/packages/woocommerce/static-harness.html](domos/packages/woocommerce/static-harness.html) via un serveur statique local.
3. Ouvrir la page et laisser le harness charger le script reference en [domos/packages/woocommerce/static-harness.html#L244](domos/packages/woocommerce/static-harness.html#L244).
4. Observer le handler `onload` du harness en [domos/packages/woocommerce/static-harness.html#L245](domos/packages/woocommerce/static-harness.html#L245), qui confirme d'abord `Bundle script: loaded`, puis teste la presence de `window.DomOSWoo`.
5. Constater que le log du harness passe par le chemin `window.DomOSWoo missing after script load`, puis que l'appel d'init est bloque par la garde definie en [domos/packages/woocommerce/static-harness.html#L199](domos/packages/woocommerce/static-harness.html#L199).
6. → Bug observe : le bundle est charge par un script classique, mais le global attendu n'est pas expose et `DomOSWoo.init(...)` ne demarre pas.
7. → Observation complementaire : le blocage survient avant les appels reseau WooCommerce attendus ; le defaut n'est donc pas un probleme Store API ou WordPress dans cette reproduction.

---

## Analyse technique

### Cause racine presommee

Le point d'entree source exporte bien `DomOSWoo` depuis [domos/packages/woocommerce/src/index.ts](domos/packages/woocommerce/src/index.ts), donc le probleme n'est pas borne a l'API publique TypeScript en elle-meme.

La cause racine la plus probable est le shim de build IIFE defini dans [domos/packages/woocommerce/esbuild.config.mjs#L45-L51](domos/packages/woocommerce/esbuild.config.mjs#L45-L51). Cette configuration force :

- un `globalName: 'DomOSWooExports'`
- un `banner` commencant par `var _exports =`
- un `footer` terminant par `g.DomOSWoo = _exports.DomOSWoo`

Or l'artefact genere commence reellement par :

- [domos/packages/woocommerce/dist/domos-woocommerce.min.js#L1](domos/packages/woocommerce/dist/domos-woocommerce.min.js#L1) : `(function(g){ var _exports =`
- [domos/packages/woocommerce/dist/domos-woocommerce.min.js#L2](domos/packages/woocommerce/dist/domos-woocommerce.min.js#L2) : `"use strict";var DomOSWooExports=...`

Sur cet artefact, `_exports` n'apparait pas comme le resultat de l'IIFE exportee, mais comme une variable ouverte juste avant la directive `"use strict"`. Dans ce cas, l'affectation finale vers `g.DomOSWoo = _exports.DomOSWoo` a de fortes chances de dereferencer une valeur incorrecte et d'exposer `undefined` au lieu de `DomOSWoo`.

### Niveau de preuve

Confiance : **elevee** sur un defaut borne au shim de build IIFE, car :

- le harness constate bien `script loaded` puis `global missing`
- [domos/packages/woocommerce/src/index.ts](domos/packages/woocommerce/src/index.ts) exporte deja `DomOSWoo`
- le bundle genere montre un prefixe incompatible avec l'intention du shim de build

Limite restante : la correction exacte n'est pas encore prouvee tant qu'une regeneration du bundle n'a pas valide le retour de `window.DomOSWoo` dans le harness. L'issue doit donc rester formulee comme bug de build/global expose, pas comme correctif deja acquis.

### Pourquoi c'est un bug (et pas un comportement attendu)

La feature 28 visait explicitement un harness statique capable de charger [domos/packages/woocommerce/dist/domos-woocommerce.min.js](domos/packages/woocommerce/dist/domos-woocommerce.min.js) via script classique puis d'appeler `DomOSWoo.init(...)`. Dans ce contrat, un script `loaded` sans `window.DomOSWoo` disponible est un echec de bootstrap du bundle, pas une limite acceptable du harness.

Le defaut intervient avant tout appel reseau WooCommerce, avant Store API, avant WordPress et avant toute logique metier de [domos/packages/woocommerce/src/DomOSWoo.ts](domos/packages/woocommerce/src/DomOSWoo.ts). Le scope du bug est donc bien le packaging/runtime global du bundle WooCommerce.

---

## Solution

### Approche retenue

**AVANT**

Le bundle IIFE WooCommerce depend d'un shim `banner/footer` custom dans [domos/packages/woocommerce/esbuild.config.mjs](domos/packages/woocommerce/esbuild.config.mjs) pour exposer `DomOSWoo` sur le global navigateur.

**APRES**

Le futur correctif devra retablir une exposition deterministe de `DomOSWoo` pour les consommateurs en script classique, puis regenerer uniquement les artefacts WooCommerce derives de ce build.

**POURQUOI**

Le bug est deja observable sans WordPress ni Store API. Corriger le harness, [domos/packages/woocommerce/src/DomOSWoo.ts](domos/packages/woocommerce/src/DomOSWoo.ts) ou la logique reseau ne traiterait pas la rupture reelle documentee ici.

### Fichiers potentiellement a modifier

| Fichier | AVANT | APRES | POURQUOI | Risque |
| --- | --- | --- | --- | --- |
| [domos/packages/woocommerce/esbuild.config.mjs](domos/packages/woocommerce/esbuild.config.mjs) | shim IIFE custom reposant sur `banner/footer` pour exposer `DomOSWoo` | ajuster uniquement la strategie d'exposition globale du bundle classique | la cause racine presommee est bornee a cette couche de build | Moyen |
| [domos/packages/woocommerce/dist/domos-woocommerce.min.js](domos/packages/woocommerce/dist/domos-woocommerce.min.js) | artefact genere qui ne fournit pas `window.DomOSWoo` dans le harness statique | regenerer l'artefact apres correction du build | l'issue porte sur le bundle livre effectivement au navigateur | Faible |
| [domos/packages/woocommerce/plugin/assets/domos-woocommerce.min.js](domos/packages/woocommerce/plugin/assets/domos-woocommerce.min.js) | copie plugin du meme bundle minifie | realigner la copie plugin si l'artefact build est regenere | eviter une divergence entre bundle package et bundle plugin | Faible |

> ⚠️ Tout fichier modifie en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifie

- [domos/packages/woocommerce/static-harness.html](domos/packages/woocommerce/static-harness.html) : hors scope, il sert de reproduction et non de source du bug
- [domos/packages/woocommerce/src/index.ts](domos/packages/woocommerce/src/index.ts) : hors scope a ce stade, l'export source de `DomOSWoo` existe deja
- [domos/packages/woocommerce/src/DomOSWoo.ts](domos/packages/woocommerce/src/DomOSWoo.ts) : hors scope tant qu'aucune preuve ne montre un defaut interne a `init(...)`
- [domos/packages/woocommerce/plugin/domos-woocommerce.php](domos/packages/woocommerce/plugin/domos-woocommerce.php) : hors scope, le bug observe ici apparait hors WordPress avant toute integration PHP

---

## Tests

- [ ] verification manuelle : [domos/packages/woocommerce/static-harness.html](domos/packages/woocommerce/static-harness.html) affiche toujours `Bundle script: loaded`
- [ ] verification manuelle : [domos/packages/woocommerce/static-harness.html](domos/packages/woocommerce/static-harness.html) affiche apres correctif `window.DomOSWoo: available`
- [ ] verification manuelle : `DomOSWoo.init(...)` n'est plus bloque faute de global manquant
- [ ] verification manuelle : le blocage bootstrap ne survient plus avant les appels reseau attendus
- [ ] `pnpm --filter @domos/woocommerce build` passe
- [ ] si [domos/packages/woocommerce/plugin/assets/domos-woocommerce.min.js](domos/packages/woocommerce/plugin/assets/domos-woocommerce.min.js) reste versionne, son contenu est realigne avec l'artefact regenere

---

**Résolu le** : 2026-04-06 — Fix esbuild.config.mjs : banner supprimé, footer corrigé. Confirmé par @BorisBob via static-harness.html.