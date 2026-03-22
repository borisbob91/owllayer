# @domos/woocommerce — Sprint 3
## Product Tools + NavigationTools

**Durée estimée :** 3-4 jours  
**Branche :** `feat/woo-sprint-3`  
**Dépendance :** Sprint 2 ✅

---

## Objectif

L'agent peut rechercher des produits WooCommerce, obtenir les détails d'un produit avec ses variations, et naviguer vers les pages produits/catégories.

---

## Tâches

### 3.1 — Product Tools (`src/tools/ProductTools.ts`)

**API :** WooCommerce Store API v1 `GET /products`

#### `search_products`
- **Risk :** `none`
- **API :** `GET /products?search={query}&per_page={limit}&category={cat}&min_price={min}&max_price={max}`
- **Params :** `query: string`, `limit?: number` (default 5), `category?: string`, `minPrice?: number`, `maxPrice?: number`, `onSale?: boolean`
- **Returns :**
```ts
{
  results: Array<{
    id: number,
    name: string,
    price: string,
    regularPrice: string,
    onSale: boolean,
    inStock: boolean,
    stockQuantity: number | null,
    categories: string[],
    permalink: string,
    shortDescription: string,
  }>
}
```

#### `get_product`
- **Risk :** `none`
- **API :** `GET /products/{id}` OU `GET /products?slug={slug}`
- **Params :** `id?: number`, `slug?: string`
- **Returns :** détails complets + variations disponibles :
```ts
{
  id, name, price, regularPrice, onSale,
  description, shortDescription,
  inStock, stockQuantity, stockStatus,
  categories: string[],
  attributes: Array<{ name: string, options: string[] }>,   // ex: Taille: [S, M, L, XL]
  variations: Array<{ id, attributes: Record<string, string>, price, inStock }>,
  permalink: string,
}
```

#### `navigate_to_product`
- **Risk :** `none`
- **Params :** `permalink: string` OU `slug: string`
- **Action :** `window.location.href`

#### `navigate_to_category`
- **Risk :** `none`
- **Params :** `slug: string`
- **Action :** `window.location.href = '/product-category/{slug}'`

### 3.2 — Enrichissement du contexte produit dans WooContextBuilder

Enrichir le contexte produit injecté par le plugin PHP :

```php
// Dans le plugin WordPress (plugin/domos-woocommerce.php)
if (is_product()) {
    global $product;
    $context['product'] = [
        'id'              => $product->get_id(),
        'name'            => $product->get_name(),
        'price'           => wc_price($product->get_price()),
        'regularPrice'    => wc_price($product->get_regular_price()),
        'onSale'          => $product->is_on_sale(),
        'inStock'         => $product->is_in_stock(),
        'stockQuantity'   => $product->get_stock_quantity(),
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

### 3.3 — Tests

- [ ] Tests unitaires ProductTools (StoreApiClient mocké)
- [ ] Tests NavigationTools (window.location mocké)

---

## Critères de succès

- [ ] L'agent peut chercher "robes d'été moins de 50€" → reçoit une liste de produits WooCommerce
- [ ] L'agent peut afficher les variantes (taille/couleur) d'un produit variable
- [ ] L'agent peut naviguer vers une catégorie ou un produit
- [ ] Tests passent

---

## Notes

- Store API `GET /products` nécessite que le WooCommerce Store API soit activé (activé par défaut depuis WC 6.x avec Gutenberg Blocks)
- Les attributs `type: variable` ont des variations récupérables via `GET /products/{id}/variations` (endpoint Store API v1)
- WooCommerce encode les prix en string avec centimes — convertir avec soin selon la devise
