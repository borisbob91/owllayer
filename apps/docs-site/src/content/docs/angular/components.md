---
title: "Composants - @owllayer/angular"
description: Documentation OwlLayer.
---

# Composants - @owllayer/angular

Le SDK Angular fournit peu de primitives UI, mais elles couvrent des besoins tres concrets : attacher un tool au template, exposer un bouton agentique, monter des DevTools, afficher un widget et rendre des composants de plugins.

Le but n'est pas de fournir un design system Angular complet. Le but est de vous donner les points de raccord minimaux entre votre UI Angular et le runtime OwlLayer.

## `OwlLayerToolDirective`

### A quoi sert cette directive

`OwlLayerToolDirective` permet de co-localiser un tool directement sur un element du template Angular.

Le tool est enregistre au `ngOnInit` et desenregistre au `ngOnDestroy`, ce qui aligne le contrat agent sur le cycle de vie Angular reel du template.

### Exemple - Directive

```html
<button
  [owllayerToolName]="'add_to_cart'"
  [owllayerToolDescription]="'Ajouter le produit courant au panier'"
  [owllayerToolSchema]="addToCartSchema"
  [owllayerToolRisk]="'low'"
  [owllayerToolHandler]="onAddToCart"
>
  Ajouter
</button>
```

### Inputs - Directive

| Input | Description |
| --- | --- |
| `owllayerToolName` | Nom unique du tool |
| `owllayerToolDescription` | Description metier pour le LLM |
| `owllayerToolHandler` | Handler appele lors de l'invocation |
| `owllayerToolSchema` | Schema de validation optionnel |
| `owllayerToolRisk` | Niveau de risque HITL (`none`, `low`, `high`, `critical`) |

### Quand utiliser la directive

Utilisez cette directive si :

- votre element HTML existe deja
- vous voulez eviter un composant wrapper supplementaire
- l'action est naturellement liee a un element de template precis

## `OwlLayerToolButtonComponent`

### A quoi sert ce composant

`OwlLayerToolButtonComponent` est un bouton standalone qui enregistre un tool puis peut l'invoquer lui-meme.

Il est utile pour :

- valider rapidement un tool pendant le developpement
- exposer un point d'action manuel simple partage entre utilisateur et agent
- construire une demo ou une sandbox sans surcouche UI complexe

### Exemple - Bouton

```html
<owllayer-tool-button
  [name]="'search_products'"
  [description]="'Rechercher des produits dans le catalogue visible'"
  [handler]="onSearchProducts"
  [schema]="searchSchema"
  [risk]="'none'"
  label="Rechercher"
/>
```

### Inputs - Bouton

| Input | Description |
| --- | --- |
| `name` | Nom unique du tool |
| `description` | Description metier |
| `handler` | Fonction appelee par le tool |
| `label` | Libelle du bouton rendu |
| `schema` | Schema optionnel |
| `risk` | Niveau de risque |

### Limite a connaitre

Le composant appelle `callTool(this.name, {})` lors du clic. Si votre tool attend des arguments, il faut soit encapsuler ces arguments dans le handler et l'exposition du tool, soit preferer une integration plus specifique.

## `injectOwlLayerDevTools()`

### Ce que cette primitive apporte

`injectOwlLayerDevTools()` monte le panneau DevTools `@owllayer/ui` dans une application Angular.

Le chargement est dynamique, ce qui permet d'eviter de penaliser inutilement le bundle de production.

### Exemple

```ts
import { Component } from '@angular/core';
import { injectOwlLayerDevTools } from '@owllayer/angular';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `<router-outlet />`,
})
export class AppComponent {
  constructor() {
    if (import.meta.env.DEV) {
      injectOwlLayerDevTools();
    }
  }
}
```

### Option disponible

| Option | Description |
| --- | --- |
| `container` | Element DOM cible. Par defaut, un conteneur est ajoute au `body` |

### Ce qu'on peut y inspecter

- tools enregistres
- etat courant de l'agent
- session active
- plugins exposes
- certains evenements runtime

## `getPluginComponents()`

Cette fonction lit la map `plugin.ui.components` d'un plugin OwlLayer et retourne les composants Angular exposes.

Elle n'a pas d'effet de bord. Elle ne depend pas du contexte d'injection Angular.

```ts
import { getPluginComponents } from '@owllayer/angular';
import type { Type } from '@angular/core';

const { SalesChart } = getPluginComponents<{ SalesChart: Type<any> }>(MyPlugin);
```

### Quand utiliser `getPluginComponents()`

- si vous voulez un acces direct et type a des composants plugin
- si vous avez besoin de composer vous-meme leur rendu
- si vous ne voulez pas passer par un outlet declaratif

## `OwlLayerPluginOutletComponent`

### A quoi sert cet outlet

`OwlLayerPluginOutletComponent` est un raccourci declaratif pour rendre un composant plugin Angular via `NgComponentOutlet`.

Si le plugin ne declare pas le composant demande, l'outlet rend simplement un hote vide.

### Exemple - Outlet plugin

```html
<owllayer-plugin-outlet
  [plugin]="analyticsPlugin"
  component="SalesChart"
  [inputs]="{ title: 'Ventes', data: salesData }"
/>
```

### Inputs - Outlet plugin

| Input | Description |
| --- | --- |
| `plugin` | Plugin OwlLayer cible |
| `component` | Nom du composant a resoudre dans `plugin.ui.components` |
| `inputs` | Inputs passes au composant rendu |

### Quand utiliser l'outlet

Utilisez l'outlet si vous voulez :

- un rendu declaratif dans le template
- brancher vite une UI plugin sur une page Angular
- eviter d'ecrire la logique `getPluginComponents()` + `NgComponentOutlet` a la main

## `OwlLayerApprovalModalComponent`

Cette modal fait partie de la surface publique Angular, mais dans la pratique elle est surtout utile comme brique du widget Angular. Elle sert a gerer une demande HITL en attente avec approbation ou refus.

Si vous avez une UI HITL totalement sur mesure, vous pouvez vous en inspirer ou l'utiliser, mais la plupart des integrations Angular passeront d'abord par le widget officiel ou par leur propre couche produit.

## Ligne directrice

Dans Angular, les composants et directives OwlLayer servent surtout a deux choses :

- garder les tools proches du template et du cycle de vie reel
- brancher vite des surfaces UI deja pretes quand vous ne voulez pas reimplementer tout le runtime visuel

Si vous avez surtout besoin d'une interface conversationnelle complete, passez a [Widget](./widget.md). Si vous cherchez surtout a modeliser proprement les actions et le contexte, voyez [Tools et contexte](./tools-and-context.md).
