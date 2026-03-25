# Auto-discovery HTML — @domos/browser

L'auto-discovery permet d'exposer des éléments HTML comme tools agent sans écrire de JavaScript supplémentaire. Le SDK scanne le DOM pour trouver les éléments marqués avec `data-domos-tool`.

## Attributs supportés

| Attribut | Requis | Description |
|---|---|---|
| `data-domos-tool` | Oui | Nom unique du tool |
| `data-domos-description` | Non | Description pour le LLM |
| `data-domos-action` | Non | Action DOM à exécuter |
| `data-domos-risk` | Non | Niveau HITL |
| `data-domos-selector` | Non | Sélecteur CSS cible |
| `data-domos-target` | Non | ID cible |
| `data-domos-schema` | Non | JSON Schema sous forme de chaîne |
| `data-domos-context` | Non | Contexte JSON additionnel |
| `data-domos-value` | Non | Valeur à injecter pour `setValue` |

## Actions disponibles

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

```html
<button
  data-domos-tool="add_to_cart_casque"
  data-domos-description="Ajouter le Casque Bluetooth Pro au panier"
  data-domos-risk="low"
  data-domos-action="click"
>
  Ajouter au panier
</button>
```

## Exemple navigation

```html
<a href="/checkout.html"
  data-domos-tool="go_to_checkout"
  data-domos-description="Naviguer vers la page de commande"
  data-domos-risk="none"
  data-domos-action="click"
>
  Commander →
</a>
```

## Exemple formulaire

```html
<input
  id="field-firstName"
  type="text"
  placeholder="Jean"
  data-domos-tool="fill_firstName"
  data-domos-description="Remplir le champ Prénom du formulaire de livraison"
  data-domos-risk="low"
  data-domos-action="setValue"
/>
```

## Exemple avec contexte JSON

```html
<button
  data-domos-tool="apply_coupon"
  data-domos-description="Appliquer un code promo"
  data-domos-risk="low"
  data-domos-action="click"
  data-domos-context='{"page":"checkout","section":"coupon"}'
>
  Appliquer
</button>
```

## Bonnes pratiques

- Donner des noms explicites et stables aux tools.
- Écrire des descriptions orientées action utilisateur.
- Réserver `high` et `critical` aux actions réellement sensibles.
- Utiliser `setValue` pour les champs de formulaire plutôt qu'un `click` approximatif.
- Préférer `data-domos-context` pour apporter des précisions au LLM sans surcharger le nom du tool.

## Cycle de vie

- Le scan initial est fait au `DomOS.init()`.
- Les nouveaux éléments ajoutés au DOM sont détectés automatiquement via `MutationObserver`.
- Les éléments retirés du DOM sont désenregistrés automatiquement.
