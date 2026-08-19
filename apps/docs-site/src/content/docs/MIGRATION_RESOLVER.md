---
title: "Guide de migration : Switch Case ? useAgentToolResolver"
description: Documentation OwlLayer.
---

# Guide de migration : Switch Case → useAgentToolResolver

Ce guide vous aide à migrer votre code depuis un switch case géant vers le pattern `useAgentToolResolver`.

## 🎯 Pourquoi migrer ?

### Avant (Switch Case)

```tsx
// ❌ Code à migrer : switch case géant, difficile à maintenir

if (msg.toolCall) {
  for (const fc of msg.toolCall.functionCalls) {
    let res = {};
    const args = fc.args as any;
    
    switch (fc.name) {
      case 'set_ui_view':
        setUiState(args.view);
        res = { result: "Vue changée" };
        break;
      
      case 'search_products':
        const results = await api.search(args.query);
        setProducts(results);
        setUiState('grid');
        res = { result: `${results.length} produits trouvés` };
        break;
      
      case 'add_to_cart':
        const pId = String(args.product_id);
        const qty = Number(args.quantity) || 1;
        // ... 15 lignes de logique
        res = { result: "Produit ajouté" };
        break;
      
      // ... 20+ cases
    }
    
    sessionPromise.then(s => 
      s.sendToolResponse({ 
        functionResponses: [{ id: fc.id, name: fc.name, response: res }] 
      })
    );
  }
}
```

**Problèmes** :
- ❌ Switch case de 200+ lignes
- ❌ Pas de typage des `args`
- ❌ Gestion manuelle de `sendToolResponse`
- ❌ Difficile à tester unitairement
- ❌ Code dupliqué (conversions, validation)

### Après (Resolver)

```tsx
// ✅ Code migré : propre, typé, structuré

useAgentToolResolver({
  navigation: {
    tools: {
      set_ui_view: {
        description: "Change la vue principale",
        schema: z.object({
          view: z.enum(['grid', 'detail', 'cart']),
        }),
        handler: async ({ view }) => {
          setUiState(view);
          return { result: "Vue changée" };
        },
      },
    },
  },
  
  catalog: {
    tools: {
      search_products: {
        description: "Rechercher des produits",
        schema: z.object({
          query: z.string(),
        }),
        handler: async ({ query }) => {
          const results = await api.search(query);
          setProducts(results);
          setUiState('grid');
          return { result: `${results.length} produits trouvés` };
        },
      },
    },
  },
  
  cart: {
    tools: {
      add_to_cart: {
        description: "Ajouter au panier",
        schema: z.object({
          product_id: z.string(),
          quantity: z.number().min(1).default(1),
        }),
        handler: async ({ product_id, quantity }) => {
          // ... votre logique
          return { result: "Produit ajouté" };
        },
      },
    },
  },
});
```

**Avantages** :
- ✅ Code organisé par domaine (navigation, catalog, cart)
- ✅ Typage complet (TypeScript infère les types)
- ✅ Pas de `sendToolResponse` manuel
- ✅ Testable facilement (chaque handler est isolé)
- ✅ 80% moins de code boilerplate

---

## 📋 Guide de migration étape par étape

### Étape 1 : Identifier les groupes logiques

Analysez votre switch actuel et regroupez les cases par domaine fonctionnel :

```typescript
switch (fc.name) {
  // 🔵 Groupe NAVIGATION
  case 'set_ui_view':
  case 'scroll_ui':
  case 'show_notification':
  
  // 🟢 Groupe CATALOG
  case 'search_products':
  case 'select_product':
  
  // 🟡 Groupe CART
  case 'add_to_cart':
  case 'update_cart_quantity':
  case 'remove_from_cart':
  case 'view_cart':
  
  // 🟠 Groupe CHECKOUT
  case 'set_shipping_info':
  case 'select_payment_method':
  case 'confirm_final_order':
}
```

### Étape 2 : Identifier les paramètres de chaque case

Pour chaque case, notez les paramètres utilisés :

```typescript
case 'add_to_cart':
  const pId = String(args.product_id);      // ← product_id: string
  const qty = Number(args.quantity) || 1;   // ← quantity: number (défaut 1)
  // ...
  break;
```

### Étape 3 : Créer le schéma Zod pour chaque tool

```typescript
add_to_cart: {
  description: "Ajouter un produit au panier",
  schema: z.object({
    product_id: z.string().describe("ID du produit"),
    quantity: z.number().min(1).default(1).describe("Quantité à ajouter"),
  }),
  // ...
}
```

### Étape 4 : Extraire la logique en handler

Copiez la logique du case dans le handler :

```typescript
// Avant
case 'add_to_cart':
  const pId = String(args.product_id);
  const qty = Number(args.quantity) || 1;
  const existingIdx = cartRef.current.findIndex(i => i.id === pId);
  
  if (existingIdx !== -1) {
    setCart(prev => prev.map((item, idx) =>
      idx === existingIdx ? { ...item, quantity: item.quantity + qty } : item
    ));
    res = { result: `Quantité augmentée (+${qty})` };
  } else {
    // ...
  }
  break;

// Après
add_to_cart: {
  handler: async ({ product_id, quantity }) => {  // ← args déjà typés !
    const existingIdx = cart.findIndex(i => i.id === product_id);
    
    if (existingIdx !== -1) {
      setCart(prev => prev.map((item, idx) =>
        idx === existingIdx ? { ...item, quantity: item.quantity + quantity } : item
      ));
      return { result: `Quantité augmentée (+${quantity})` };
    }
    // ...
  },
}
```

**Changements importants** :
- ✅ Plus besoin de `String()` ou `Number()` : Zod valide déjà
- ✅ `args.product_id` devient `product_id` (déstructuré)
- ✅ `res = { ... }` devient `return { ... }`
- ✅ Plus besoin de `break`

### Étape 5 : Définir le niveau de risque

```typescript
add_to_cart: {
  description: "Ajouter un produit au panier",
  schema: z.object({ /* ... */ }),
  risk: 'low',  // ← 'none' | 'low' | 'medium' | 'high' | 'critical'
  handler: async ({ product_id, quantity }) => { /* ... */ },
}
```

**Recommandations** :
- `none` : Lecture seule (get, list, view)
- `low` : Actions réversibles (add to cart, like)
- `medium` : Modifications importantes (update profile, change settings)
- `high` : Actions financières (confirm order, payment)
- `critical` : Actions irréversibles (delete account)

### Étape 6 : Assembler le resolver complet

```tsx
function ShoppingApp() {
  // Votre state
  const [uiState, setUiState] = useState('idle');
  const [cart, setCart] = useState([]);
  
  // ✅ Resolver (remplace le switch)
  useAgentToolResolver({
    navigation: {
      tools: {
        set_ui_view: { /* ... */ },
        scroll_ui: { /* ... */ },
      },
    },
    catalog: {
      tools: {
        search_products: { /* ... */ },
        select_product: { /* ... */ },
      },
    },
    cart: {
      tools: {
        add_to_cart: { /* ... */ },
        update_cart_quantity: { /* ... */ },
        remove_from_cart: { /* ... */ },
        view_cart: { /* ... */ },
      },
    },
  });
  
  return <div>{/* Votre UI */}</div>;
}
```

### Étape 7 : Supprimer l'ancien switch

1. Testez que tous les tools fonctionnent
2. Mettez en commentaire le switch
3. Testez à nouveau
4. Supprimez le switch et la gestion de `toolCall`

---

## 🛠️ Helper pour migration automatique

Si vous avez beaucoup de cases, utilisez `createResolverFromSwitch` :

```tsx
import { createResolverFromSwitch } from '@owllayer/react';

// Migration rapide (sans groupage)
const config = createResolverFromSwitch({
  set_ui_view: {
    description: "Change la vue",
    schema: z.object({ view: z.string() }),
    handler: (args) => {
      setView(args.view);
      return { result: "OK" };
    }
  },
  add_to_cart: {
    description: "Ajouter au panier",
    schema: z.object({ product_id: z.string(), quantity: z.number() }),
    handler: (args) => {
      addToCart(args.product_id, args.quantity);
      return { result: "Ajouté" };
    }
  },
  // ... tous vos cases
});

useAgentToolResolver(config);
```

**Note** : Cette approche est plus rapide mais perd le groupage logique. À utiliser pour une migration rapide, puis refactoriser.

---

## 🧪 Tester la migration

### Test 1 : Vérifier le nombre de tools

```tsx
const { toolCount, toolNames } = useAgentToolResolver(config);

console.log(`${toolCount} tools enregistrés:`, toolNames);
// Devrait afficher : 15 tools enregistrés: ['set_ui_view', 'scroll_ui', ...]
```

### Test 2 : Tester chaque handler individuellement

```tsx
// Extraire un handler pour le tester
const addToCartHandler = async ({ product_id, quantity }) => {
  // ... logique
  return { result: "OK" };
};

// Test unitaire
test('add_to_cart ajoute au panier', async () => {
  const result = await addToCartHandler({ product_id: '123', quantity: 2 });
  expect(result.result).toBe("OK");
});
```

### Test 3 : Vérifier les logs en debug mode

```tsx
useAgentToolResolver(config, {
  debug: true,
  onBeforeCall: (name, args) => console.log('Before:', name, args),
  onAfterCall: (name, result, duration) => console.log('After:', name, duration),
});
```

---

## ⚠️ Pièges courants

### Piège 1 : Références au state stale

```tsx
// ❌ MAUVAIS : utilise cartRef.current
handler: async ({ product_id }) => {
  const item = cartRef.current.find(i => i.id === product_id);  // Stale !
  // ...
}

// ✅ BON : utilise cart directement
handler: async ({ product_id }) => {
  const item = cart.find(i => i.id === product_id);  // Fresh !
  // ...
}
```

**Solution** : N'utilisez pas de refs, utilisez le state directement. Le hook se re-enregistre quand les dépendances changent.

### Piège 2 : Oublier le `return`

```tsx
// ❌ MAUVAIS : pas de return
handler: async ({ view }) => {
  setUiState(view);
  // Oublié le return !
}

// ✅ BON : toujours retourner quelque chose
handler: async ({ view }) => {
  setUiState(view);
  return { result: "Vue changée" };
}
```

### Piège 3 : Schéma trop strict

```tsx
// ❌ MAUVAIS : quantity obligatoire
schema: z.object({
  product_id: z.string(),
  quantity: z.number(),  // Obligatoire !
})

// ✅ BON : valeur par défaut
schema: z.object({
  product_id: z.string(),
  quantity: z.number().default(1),  // Optionnel avec défaut
})
```

---

## 📚 Ressources

- [Exemple complet](../apps/demo/src/ShoppingAppWithResolver.example.tsx)
- [Documentation API](../packages/react/src/types/resolver.ts)
- [Issue #02 - Tool Resolver Pattern](../issues/issue_02_tool_resolver_pattern.md)

---

**Besoin d'aide ?** Ouvrez une issue sur GitHub avec le tag `migration`.
---

## 📦 Multi-Framework Support

Cette fonctionnalité est disponible dans **tous les SDKs OwlLayer** :

### React (`@owllayer/react`)
```tsx
import { useAgentToolResolver, createResolverFromSwitch, createCRUDResolver } from '@owllayer/react';
useAgentToolResolver(config);
```

### Vue (`@owllayer/vue`)
```vue
<script setup>
import { useAgentToolResolver, createResolverFromSwitch, createCRUDResolver } from '@owllayer/vue';
useAgentToolResolver(config);
</script>
```

### Svelte (`@owllayer/svelte`)
```svelte
<script>
import { agentToolResolver, createResolverFromSwitch, createCRUDResolver } from '@owllayer/svelte';
</script>

<div use:agentToolResolver={{ config }}>
  <!-- UI -->
</div>
```

**API identique** : Les types, helpers et comportements sont identiques dans les 3 frameworks.

**Exemples complets disponibles** :
- [ShoppingAppWithResolver.example.tsx](../apps/demo/src/ShoppingAppWithResolver.example.tsx) (React)
- [ShoppingAppWithResolver.vue.example](../apps/demo/src/ShoppingAppWithResolver.vue.example) (Vue)
- [ShoppingAppWithResolver.svelte.example](../apps/demo/src/ShoppingAppWithResolver.svelte.example) (Svelte)

---

**Créé** : 12 février 2026  
**Dernière mise à jour** : 12 février 2026