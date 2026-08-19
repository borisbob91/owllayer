# Auto-discovery HTML — @owllayer/browser

L'auto-discovery permet d'exposer des éléments HTML comme tools agent sans écrire de JavaScript supplémentaire. Le SDK scanne le DOM pour trouver les éléments marqués avec `data-owllayer-tool`.

C'est l'une des forces du SDK Browser : vous pouvez rendre une page "agentique" en enrichissant simplement le HTML existant.

Autrement dit, un bouton, un lien ou un champ peut devenir une action compréhensible par l'agent sans devoir ecrire un wrapper JavaScript complet.

Cette approche est particulierement utile pour :

- des pages statiques
- des templates serveur
- des CMS
- des themes e-commerce
- des integrateurs qui veulent aller vite

## Attributs supportés

Ces attributs forment le contrat entre votre HTML et l'agent.

| Attribut | Requis | Description |
|---|---|---|
| `data-owllayer-tool` | Oui | Nom unique du tool |
| `data-owllayer-description` | Non | Description pour le LLM |
| `data-owllayer-action` | Non | Action DOM à exécuter |
| `data-owllayer-risk` | Non | Niveau HITL |
| `data-owllayer-selector` | Non | Sélecteur CSS cible |
| `data-owllayer-target` | Non | ID cible |
| `data-owllayer-schema` | Non | JSON Schema sous forme de chaîne |
| `data-owllayer-context` | Non | Contexte JSON additionnel |
| `data-owllayer-value` | Non | Valeur à injecter pour `setValue` |

## Actions disponibles

Chaque action correspond a une intention DOM simple que l'agent peut declencher.

| Valeur | Description |
|---|---|
| `click` | Déclenche un clic |
| `focus` | Place le focus |
| `scrollIntoView` | Scrolle jusqu'à l'élément |
| `setValue` | Écrit une valeur dans un input ou un select |
| `show` | Affiche l'élément |
| `hide` | Masque l'élément |
| `addClass` | Ajoute des classes CSS |
| `removeClass` | Retire des classes CSS |

## Exemple simple

Ce premier exemple montre le cas le plus courant : rendre un bouton produit activable par l'agent.

```html
<button
  data-owllayer-tool="add_to_cart_casque"
  data-owllayer-description="Ajouter le Casque Bluetooth Pro au panier"
  data-owllayer-risk="low"
  data-owllayer-action="click"
>
  Ajouter au panier
</button>
```

## Exemple navigation

Ici, l'agent peut guider l'utilisateur vers l'etape suivante du parcours.

```html
<a href="/checkout.html"
  data-owllayer-tool="go_to_checkout"
  data-owllayer-description="Naviguer vers la page de commande"
  data-owllayer-risk="none"
  data-owllayer-action="click"
>
  Commander →
</a>
```

## Exemple formulaire

Cet exemple est utile pour les formulaires, parcours de commande ou assistants de saisie.

```html
<input
  id="field-firstName"
  type="text"
  placeholder="Jean"
  data-owllayer-tool="fill_firstName"
  data-owllayer-description="Remplir le champ Prénom du formulaire de livraison"
  data-owllayer-risk="low"
  data-owllayer-action="setValue"
/>
```

## Exemple avec contexte JSON

Le contexte JSON permet d'ajouter des details sans alourdir le nom du tool.

```html
<button
  data-owllayer-tool="apply_coupon"
  data-owllayer-description="Appliquer un code promo"
  data-owllayer-risk="low"
  data-owllayer-action="click"
  data-owllayer-context='{"page":"checkout","section":"coupon"}'
>
  Appliquer
</button>
```

## Bonnes pratiques

- Donner des noms explicites et stables aux tools.
- Écrire des descriptions orientées action utilisateur.
- Réserver `high` et `critical` aux actions réellement sensibles.
- Utiliser `setValue` pour les champs de formulaire plutôt qu'un `click` approximatif.
- Préférer `data-owllayer-context` pour apporter des précisions au LLM sans surcharger le nom du tool.

## Cycle de vie

- Le scan initial est fait au `OwlLayer.init()`.
- Les nouveaux éléments ajoutés au DOM sont détectés automatiquement via `MutationObserver`.
- Les éléments retirés du DOM sont désenregistrés automatiquement.

En pratique, cela veut dire que l'auto-discovery fonctionne bien meme si votre page n'est pas totalement statique, tant que les elements apparaissent dans le DOM classique du navigateur.
