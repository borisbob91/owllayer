# @domos/angular

`@domos/angular` est le SDK Angular de DomOS.

Son role n'est pas de remplacer Angular par une UI generée ni d'introduire une architecture parallele. Son role est de brancher une application Angular existante sur le runtime DomOS avec des primitives idiomatiques Angular : provider d'application, injection, signals, directives, composants standalone et effets de cycle de vie.

Concretement, ce package permet de :

- connecter une application Angular a un agent DomOS via un provider unique
- exposer des tools metier directement depuis les composants et le template
- injecter un contexte passif riche pour aider le LLM a comprendre l'ecran courant
- centraliser un groupe de tools avec le pattern resolver
- exposer une navigation standard et un outil d'etat UI local
- embarquer un widget chat/voix complet sans reconstruire toute l'interface
- monter les DevTools DomOS dans une application Angular
- rendre des composants declares par des plugins DomOS

L'idee cle est simple : dans Angular, les outils et le contexte vivent au rythme du cycle de vie Angular.

Si un composant standalone est monte, ses tools et son contexte peuvent exister.
S'il disparait, ils peuvent etre nettoyes proprement.

L'agent ne travaille donc pas sur une description abstraite de votre produit. Il travaille sur un front vivant, aligne sur l'etat reel de l'application et sur les invariants que vous avez choisis d'exposer.

```bash
pnpm add @domos/angular @domos/core zod
```

## Ce que le SDK Angular apporte

Sans `@domos/angular`, vous devriez assembler vous-meme plusieurs couches : creation du client DomOS, synchronisation d'etat, gestion de connexion, enregistrement/cleanup des tools, injection de contexte, patterns resolver, widget, DevTools et integration Angular-native.

Le package fournit deja cette couche d'integration :

- `provideDomOS()` pour declarer la connexion a l'echelle de l'application
- `injectDomOS()` pour recuperer la facade Angular-native sur le client
- `registerContext()` pour injecter du contexte passif, statique ou reactif
- `registerToolResolver()` pour enregistrer des familles de tools coherentes
- `registerNavigationTool()` et `registerViewStateTool()` pour les actions transverses classiques
- `DomOSToolDirective` et `DomOSToolButtonComponent` pour co-localiser tools et template
- `DomOSWidgetComponent` pour une integration chat/voix prete a l'emploi
- `injectDomOSDevTools()` pour le debug runtime
- `getPluginComponents()` et `DomOSPluginOutletComponent` pour les plugins UI

## Pour quels usages

`@domos/angular` est adapte si vous construisez par exemple :

- un back-office Angular ou l'agent assiste des actions guidees
- une application metier a navigation dense, avec contexte d'ecran explicite
- une marketplace ou un SaaS avec recherche, CRUD, favoris, filtres et parcours utilisateur
- une experience embarquee ou le widget par defaut suffit pour commencer vite
- une application ou certaines actions sensibles doivent passer par HITL

## Ce qui est specifique a Angular ici

Le SDK suit les conventions Angular au lieu de les contourner :

- l'initialisation se fait dans `ApplicationConfig` ou `bootstrapApplication`
- le service DomOS se recupere via `injectDomOS()`
- les effets reactifs s'appuient sur `signal`, `computed` et `effect`
- les outils template-bound s'appuient sur une directive standalone ou un composant standalone
- le pattern resolver reste compatible avec l'injection et le teardown Angular

Ce package ne porte pas le modele LLM ni la logique serveur. Le cerveau reste cote serveur DomOS. Angular gere ici la couche produit visible et actionnable : contexte, tools, UI, widget et garde-fous.

## Lecture rapide

| Si vous cherchez... | Commencez ici |
| --- | --- |
| Installer et brancher DomOS dans une app Angular | [Demarrage](./getting-started.md) |
| Exposer des tools, resolvers et contexte LLM | [Tools et contexte](./tools-and-context.md) |
| Utiliser les briques UI Angular du SDK | [Composants](./components.md) |
| Integrer le widget chat/voix officiel | [Widget](./widget.md) |

## Exports

### Bootstrap et service

| Export | Description |
| --- | --- |
| `provideDomOS` | Enregistre DomOS dans les providers Angular |
| `injectDomOS` | Injecte `DomOSAngularService` dans le contexte courant |
| `DomOSAngularService` | Facade Angular-native sur `DomOSClient` |

### Contexte et tools

| Export | Description |
| --- | --- |
| `registerContext` | Injecte du contexte passif statique ou reactif |
| `registerNavigationTool` | Expose un tool global `navigate` |
| `registerViewStateTool` | Expose un tool global `ui_state` |
| `registerToolResolver` | Enregistre un groupe structure de tools |
| `createResolverFromSwitch` | Convertit une map de handlers en config resolver |
| `createCRUDResolver` | Genere une famille CRUD standard |

### Composants et directive

| Export | Description |
| --- | --- |
| `DomOSToolDirective` | Directive pour attacher un tool a un element du template |
| `DomOSToolButtonComponent` | Bouton standalone qui enregistre puis invoque un tool |
| `DomOSWidgetComponent` | Widget officiel chat/voix Angular |
| `DomOSApprovalModalComponent` | Modal HITL utilisee par le widget |

### Debug et plugins

| Export | Description |
| --- | --- |
| `injectDomOSDevTools` | Monte le panneau DevTools DomOS dans l'application |
| `getPluginComponents` | Recupere la map de composants exposes par un plugin |
| `DomOSPluginOutletComponent` | Rend declarativement un composant plugin Angular |

## Guides

- [Demarrage](./getting-started.md)
- [Tools et contexte](./tools-and-context.md)
- [Composants](./components.md)
- [Widget](./widget.md)
