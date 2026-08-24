# Tools et contexte - @owllayer/angular

Dans OwlLayer, un bon front agentique ne consiste pas a exposer beaucoup de tools. Il consiste a exposer les bons tools, avec le bon niveau de granularite, dans le bon contexte.

Dans Angular, cela passe par trois couches complementaires :

- le contexte passif, qui dit a l'agent ce que l'utilisateur regarde
- les tools ponctuels, qui representent des actions explicites
- les resolvers, qui permettent de structurer un domaine d'actions sans empiler des dizaines d'enregistrements manuels

## 1. `registerContext()`

### A quoi sert cette primitive

`registerContext()` injecte un contexte passif dans la session OwlLayer.

Ce contexte n'est pas un tool et n'est pas appele activement par l'agent. Il sert a enrichir la comprehension du modele : page courante, entite visible, filtres actifs, etape de workflow, selection courante, droits, statut, etc.

### Deux modes possibles

`registerContext()` accepte :

- un objet statique
- un getter reactif de type fonction, re-evalue par Angular

### Contexte statique

```ts
registerContext({
  page: 'settings',
  section: 'notifications',
});
```

### Contexte reactif

```ts
registerContext(() => ({
  page: currentPage(),
  filters: activeFilters(),
  selectedOrderId: selectedOrderId(),
}));
```

### Ce qu'un bon contexte doit contenir

Un bon contexte est :

- descriptif
- metier
- stable dans sa structure
- suffisamment riche pour orienter correctement le LLM

Exemple utile :

```ts
registerContext(() => ({
  page: 'listing-detail',
  listing: {
    id: listing()?.id,
    title: listing()?.title,
    price: listing()?.price,
    category: listing()?.category,
    seller: listing()?.seller,
  },
  favoritesCount: favoriteIds().length,
}));
```

Exemple pauvre :

```ts
registerContext({ page: 'detail' });
```

Le second exemple ne donne presque rien au modele. Il oblige le LLM a raisonner dans le vide.

## 2. `OwlLayerAngularService.registerTool()`

Si vous avez besoin d'un tool simple, ponctuel, local a un composant, `registerTool()` reste la solution la plus directe.

```ts
const owllayer = injectOwlLayer();

const dispose = owllayer.registerTool(
  {
    name: 'archive_ticket',
    description: 'Archiver le ticket support actuellement affiche',
    schema: z.object({
      reason: z.string().describe('Raison metier de l archivage'),
    }) as any,
    risk: 'high',
  },
  async ({ reason }: { reason: string }) => {
    await archiveCurrentTicket(reason);
    return { archived: true };
  }
);
```

### Quand utiliser cette approche

Utilisez `registerTool()` si :

- le tool n'a de sens que dans un composant precis
- vous n'avez pas besoin d'un groupe structure de tools
- vous voulez garder un couplage tres local avec le template ou la page

## 3. `registerToolResolver()`

Quand le domaine commence a contenir plusieurs tools coherents, il vaut mieux passer par un resolver.

Le pattern resolver permet de :

- regrouper des tools d'un meme domaine
- factoriser des hooks avant/apres si necessaire
- garder une cartographie claire du contrat LLM
- eviter une proliferation de `registerTool()` disperses

### Exemple

```ts
import { registerToolResolver } from '@owllayer/angular';

const handle = registerToolResolver({
  cart: {
    prefix: 'cart_',
    tools: {
      add_item: {
        description: 'Ajouter un article au panier courant',
        schema: z.object({
          productId: z.string().describe('Identifiant produit'),
          quantity: z.number().min(1).describe('Quantite a ajouter'),
        }) as any,
        handler: async ({ productId, quantity }: any) => {
          await addToCart(productId, quantity);
          return { ok: true };
        },
        risk: 'low',
      },
    },
  },
});

// plus tard si necessaire
handle.destroy();
```

### Ce que retourne le resolver

`registerToolResolver()` retourne un handle avec :

- `toolCount`
- `toolNames`
- `destroy()`

C'est utile si vous avez besoin d'un teardown manuel en dehors du cycle de vie automatique.

## 4. `createResolverFromSwitch()`

Ce helper sert quand vous avez deja une logique de type switch-case ou une map de handlers et que vous voulez la convertir rapidement en resolver lisible.

```ts
const config = createResolverFromSwitch({
  search_products: {
    description: 'Rechercher des produits dans le catalogue visible',
    schema: z.object({
      query: z.string().describe('Mots-cles produit ou categorie'),
    }) as any,
    handler: async ({ query }: any) => searchProducts(query),
    risk: 'none',
  },
  reset_filters: {
    description: 'Reinitialiser les filtres de la vue catalogue',
    schema: z.object({}) as any,
    handler: async () => resetFilters(),
    risk: 'none',
  },
});

registerToolResolver({
  catalog: config.main,
});
```

### Quand c'est utile

- migration d'une demo ou d'un ancien code procedural
- premiers prototypes avec plusieurs handlers simples
- reduction du bruit quand vous n'avez pas besoin d'une grosse structure de config

## 5. `createCRUDResolver()`

Ce helper genere une famille CRUD standard sur une ressource.

```ts
const orderResolver = createCRUDResolver('order', {
  onCreate: async (data) => createOrder(data),
  onUpdate: async (id, data) => updateOrder(id, data),
  onDelete: async (id) => deleteOrder(id),
  onRead: async (id) => getOrder(id),
  onList: async (filters) => listOrders(filters),
});

registerToolResolver({
  orders: orderResolver.main,
});
```

### Ce que le helper cree

Il peut generer jusqu'a 5 tools :

- `create_<entity>`
- `update_<entity>`
- `delete_<entity>`
- `read_<entity>`
- `list_<entity>`

C'est pratique pour une demo, un back-office, une CRUD lineaire ou un SDK interne. En revanche, si votre domaine a des regles metier plus fines, mieux vaut ecrire des tools explicites que simuler tout via CRUD generique.

## 6. `registerNavigationTool()`

Cette primitive expose un tool standard `navigate`.

Elle est utile quand l'agent doit pouvoir changer d'ecran sans que vous reinventiez un tool de navigation a chaque page.

```ts
registerNavigationTool(async ({ url, replace, state }) => {
  await router.navigateByUrl(url, {
    state,
    replaceUrl: !!replace,
  });

  return { navigatedTo: url };
}, {
  description: 'Naviguer vers une page de l application Angular',
});
```

### Pourquoi c'est utile

Cela donne a l'agent un point d'entree de navigation stable et global, plutot que de dependre d'un grand nombre de tools ad hoc du type `go_to_cart`, `go_to_pricing`, `go_to_profile`, etc.

## 7. `registerViewStateTool()`

Cette primitive expose un tool standard `ui_state` pour les actions UI locales qui ne meritent pas un changement d'URL.

```ts
registerViewStateTool(async ({ viewId, action, params }) => {
  if (viewId === 'filters-panel' && action === 'open') {
    openFiltersPanel();
  }

  return { ok: true, viewId, action, params };
});
```

### Exemples d'usage

- ouvrir ou fermer un panneau
- changer d'onglet
- basculer une vue liste / grille
- selectionner un segment d'interface
- ouvrir un drawer ou un panneau de details

## 8. Regles concretes pour une bonne doc LLM

Le LLM travaille beaucoup mieux si vos tools sont decrits comme un contrat metier, pas comme une signature technique.

### A faire

- choisir un nom metier explicite
- decrire l'effet reel du tool
- decrire chaque parametre important dans le schema
- inclure dans le contexte la page, l'entite courante, les filtres, l'etat du workflow

### A eviter

- noms trop generiques comme `update`, `action`, `run`
- descriptions vagues comme `Execute la logique`
- schemas sans `.describe()`
- contexte trop pauvre ou trop technique

## 9. Evenements runtime et debug

`OwlLayerAngularService` expose aussi :

- `subscribeEvent(type, listener)`
- `subscribeAnyEvent(listener)`
- `getRegisteredTools()`
- `callTool(name, args)`

Ces methodes sont utiles pour :

- journaliser les appels outils
- brancher un panneau debug
- tester un tool sans passer par le LLM
- instrumenter une demo ou une sandbox interne

## Ligne directrice

Si vous devez retenir une seule regle :

Les tools decrivent ce que l'agent peut faire.
Le contexte decrit ce que l'agent doit comprendre.

Si l'un des deux est pauvre, l'experience se degrade vite. En Angular, la bonne pratique est donc de garder tools et contexte proches du cycle de vie reel de la page, du composant et du parcours utilisateur.
