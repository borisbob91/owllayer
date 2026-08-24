# @owllayer/woocommerce — Sprint 3
## Product Tools + NavigationTools

**Durée estimée :** 3-4 jours  
**Branche :** `feat/woo-sprint-3`  
**Dépendance :** Sprint 2 ✅  
**Révisé le :** 2026-03-23 — corrections issues de la vérification des sources PHP (`ProductSchema.php`, `Products.php`)

---

## Objectif

L'agent peut rechercher des produits WooCommerce, obtenir les détails d'un produit avec ses variations, et naviguer vers les pages produits/catégories.

---

## Corrections apportées (révision Sprint 3)

| # | Élément | Avant (incorrect) | Après (vérifié) |
|---|---|---|---|
| 1 | Endpoint variations | `GET /products/{id}/variations` | **N'existe pas** dans Store API v1 — les variations sont **embarquées** dans `GET /products/{id}` (champ `variations[]`) |
| 2 | Champ stock booléen | `inStock: boolean` | `is_in_stock: boolean` |
| 3 | Champ quantité stock | `stockQuantity: number \| null` | `low_stock_remaining: number \| null` (retourné uniquement si stock bas) |
| 4 | Champ statut stock | `stockStatus: string` | **Absent** — remplacé par `stock_availability: { text, class }` |
| 5 | Format `categories` | `string[]` | `Array<{ id, name, slug, link }>` (objets) |
| 6 | Format `attributes` | `Array<{ name, options: string[] }>` | `Array<{ id, name, taxonomy, has_variations, terms: [{ id, name, slug }] }>` |
| 7 | `min_price` / `max_price` | valeur en euros | **Minor units (centimes)** — `minPrice=50` → envoyer `min_price=5000` |
| 8 | Paramètre `category` | ID uniquement (implicite) | Accepte IDs **ou slugs** séparés par virgule |
| 9 | `navigate_to_product` | construction `/product/{slug}` | Préférer `permalink` (URL canonique fournie par l'API) — fallback `/product/{slug}` |

---

## Tâches

### 3.1 — Product Tools (`src/tools/ProductTools.ts`)

**API :** WooCommerce Store API v1 `GET /products`

#### `search_products`
- **Risk :** `none`
- **API :** `GET /products?search={query}&per_page={limit}&category={cat}&min_price={min}&max_price={max}&on_sale={bool}`
- **Params :** `query: string`, `limit?: number` (défaut: 5), `category?: string` (ID ou slug), `minPrice?: number` (en euros), `maxPrice?: number` (en euros), `onSale?: boolean`
- **⚠️ `minPrice`/`maxPrice` :** multiplier ×100 avant envoi (`minPrice=50` → `min_price=5000`)
- **Returns :**
```ts
{
  results: Array<{
    id: number,
    name: string,
    price: string,           // minor units string (ex: "4999" = 49,99 €)
    regularPrice: string,
    onSale: boolean,
    is_in_stock: boolean,
    low_stock_remaining: number | null,
    categories: Array<{ id: number, name: string, slug: string }>,
    permalink: string,
    shortDescription: string,
  }>
}
```

#### `get_product`
- **Risk :** `none`
- **API :** `GET /products/{id}` OU `GET /products?slug={slug}`
- **Params :** `id?: number`, `slug?: string`
- **Returns :** détails complets — les variations sont **embarquées dans la réponse produit** (pas d'appel supplémentaire) :
```ts
{
  id: number,
  name: string,
  type: string,              // "simple" | "variable" | "grouped" | "variation"
  price: string,
  regularPrice: string,
  priceRange: { min_amount: string, max_amount: string } | null,  // produits variables
  onSale: boolean,
  description: string,
  shortDescription: string,
  is_in_stock: boolean,
  is_on_backorder: boolean,
  low_stock_remaining: number | null,
  categories: Array<{ id: number, name: string, slug: string }>,
  attributes: Array<{
    id: number,
    name: string,            // ex: "Taille", "Couleur"
    has_variations: boolean,
    options: string[],       // noms des termes (ex: ["S", "M", "L", "XL"])
  }>,
  // Variations embarquées — IDs + combinaisons d'attributs (produits variables)
  variations: Array<{
    id: number,
    attributes: Record<string, string | null>,  // ex: { "Taille": "M", "Couleur": null (= any) }
  }>,
  permalink: string,
}
```

#### `navigate_to_product`
- **Risk :** `none`
- **Params :** `permalink: string` (préféré — URL canonique) OU `slug: string` (fallback → `/product/{slug}`)
- **Action :** `window.location.href = permalink ?? '/product/' + slug`

#### `navigate_to_category`
- **Risk :** `none`
- **Params :** `slug: string`
- **Action :** `window.location.href = '/product-category/{slug}'`

---

### 3.2 — Enrichissement du contexte produit dans WooContextBuilder

Enrichir le contexte produit injecté par le plugin PHP :

```php
// Dans le plugin WordPress (plugin/owllayer-woocommerce.php)
if (is_product()) {
    global $product;
    $context['product'] = [
        'id'              => $product->get_id(),
        'name'            => $product->get_name(),
        'price'           => wc_price($product->get_price()),
        'regularPrice'    => wc_price($product->get_regular_price()),
        'onSale'          => $product->is_on_sale(),
        'is_in_stock'     => $product->is_in_stock(),             // ⚠️ clé Store API v1
        'low_stock_remaining' => $product->get_stock_quantity(),  // ⚠️ clé Store API v1
        'categories'      => wp_get_post_terms($product->get_id(), 'product_cat', ['fields' => 'names']),
        'permalink'       => $product->get_permalink(),
        'type'            => $product->get_type(),   // simple, variable, ...
    ];
    $context['pageType'] = 'product';
    $context['availableActions'] = [
        'Ajouter au panier → add_to_cart(productId, qty)',
        'Voir les variations → get_product(id)',
        'Naviguer vers une catégorie → navigate_to_category(slug)',
    ];
}
```

- [ ] Mettre à jour le plugin PHP pour enrichir le contexte produit, catégorie et panier
- [ ] Implémenter les 4 tools JS

---

### 3.3 — Tests

- [ ] Tests unitaires ProductTools (StoreApiClient mocké)
- [ ] Tests NavigationTools (`vi.stubGlobal('window', { location: { href: '' } })`)

---

## Critères de succès

- [ ] L'agent peut chercher "robes d'été moins de 50€" → reçoit une liste de produits WooCommerce
- [ ] L'agent peut afficher les variantes (taille/couleur) d'un produit variable
- [ ] L'agent peut naviguer vers une catégorie ou un produit
- [ ] Tests passent

---

## Notes

- Store API `GET /products` nécessite que le WooCommerce Store API soit activé (activé par défaut depuis WC 6.x avec Gutenberg Blocks)
- **Les variations sont embarquées dans `GET /products/{id}`** — champ `variations[]` avec `{ id, attributes[] }`. Il n'existe pas d'endpoint `GET /products/{id}/variations` dans Store API v1.
- `min_price` / `max_price` sont en **minor units (centimes)** : `minPrice=50` (€) → `min_price=5000`
- `prices.price` dans la réponse est aussi une string en minor units (ex: `"4999"` = 49,99 €) — diviser par `10^currency_minor_unit` pour affichage
- Le paramètre `per_page` : défaut API = 10, max = 100. On utilise défaut = 5 pour les tools.
- `category` accepte IDs ou slugs séparés par virgule (ex: `category=robes,12,pantalons`)
- `type` dans la réponse : `"simple"`, `"variable"`, `"grouped"`, `"variation"` — utile pour adapter l'UI
- Sources vérifiées : `ProductSchema.php` (schéma réponse), `Products.php` (params requête)
