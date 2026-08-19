---
title: "Demarrage - @owllayer/angular"
description: Documentation OwlLayer.
---

# Demarrage - @owllayer/angular

Ce guide montre comment brancher OwlLayer dans une application Angular de maniere progressive, sans casser l'architecture de l'application.

L'idee est simple :

1. declarer OwlLayer dans les providers de l'application
2. injecter le service OwlLayer la ou il est utile
3. exposer des tools metier explicites
4. fournir un contexte passif utile au LLM
5. monter un widget ou une UI Angular maison

Autrement dit : on connecte d'abord l'application, puis on rend certaines actions et certains etats comprehensibles par l'agent.

## 1. Installer le SDK

```bash
pnpm add @owllayer/angular @owllayer/core zod
```

Si vous utilisez le widget Angular ou certains composants standalone, vous aurez generalement aussi besoin des dependances Angular standard deja presentes dans votre app, notamment `@angular/common` et `@angular/forms`.

## 2. Declarer OwlLayer dans l'application

### Ce que cette etape fait

`provideOwlLayer()` enregistre la configuration OwlLayer dans l'environment injector Angular et construit une instance de `OwlLayerAngularService` partagee par l'application.

Sans ce provider, vous ne pouvez ni injecter le service OwlLayer, ni enregistrer de tools avec les helpers Angular, ni utiliser proprement le widget du SDK.

### Exemple avec `app.config.ts`

```ts
import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideOwlLayer } from '@owllayer/angular';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideOwlLayer({
      endpoint: 'ws://localhost:4001/owllayer',
      apiKey: 'pk_dev_123',
      debug: true,
      componentId: 'my-angular-app',
    }),
  ],
};
```

### A quoi sert `componentId`

`componentId` permet de marquer la provenance des tools enregistres par ce front. C'est utile si vous voulez tracer la source des tools ou distinguer plusieurs surfaces dans des DevTools ou des plugins.

## 3. Injecter et connecter le service OwlLayer

### Ce que fournit `injectOwlLayer()`

`injectOwlLayer()` retourne une instance de `OwlLayerAngularService`, une facade Angular-native sur `OwlLayerClient`.

Cette facade expose :

- des signaux de connexion (`state`, `sessionId`, `isConnected`)
- les methodes de transport (`connect`, `disconnect`, `sendText`)
- les primitives de contexte et de tools (`updateContext`, `registerTool`, `callTool`)
- l'abonnement aux evenements runtime (`subscribeEvent`, `subscribeAnyEvent`)
- l'acces aux infos debug (`getRegisteredTools`, `getInstalledPlugins`, `getAgentState`)

### Exemple dans un composant shell

```ts
import { Component, signal } from '@angular/core';
import { injectOwlLayer } from '@owllayer/angular';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `
    <button (click)="connect()" [disabled]="connected()">Connecter</button>
    <p>Etat: {{ owllayer.state() }}</p>
  `,
})
export class AppComponent {
  readonly owllayer = injectOwlLayer();
  readonly connected = signal(false);

  async connect(): Promise<void> {
    await this.owllayer.connect();
    this.connected.set(this.owllayer.isConnected());
  }
}
```

### Point important

`provideOwlLayer()` installe le service, mais il ne force pas la connexion reseau a un moment donne. Vous gardez donc le controle sur le moment ou l'application se connecte reellement.

## 4. Premier tool Angular

### Pourquoi un tool explicite est indispensable

Un agent ne doit pas deviner comment agir sur l'application. Il doit utiliser des points d'entree metier explicites, auditable et limits par votre equipe.

### Exemple direct via `registerTool()`

```ts
import { Component } from '@angular/core';
import { injectOwlLayer } from '@owllayer/angular';
import { z } from 'zod';

@Component({
  standalone: true,
  selector: 'app-product-page',
  template: `<button (click)="addNow()">Ajouter</button>`,
})
export class ProductPageComponent {
  private readonly owllayer = injectOwlLayer();
  private disposeTool: VoidFunction = () => {};

  ngOnInit(): void {
    this.disposeTool = this.owllayer.registerTool(
      {
        name: 'add_to_cart',
        description: 'Ajouter le produit courant au panier',
        schema: z.object({
          quantity: z.number().min(1).describe('Quantite a ajouter au panier'),
        }) as any,
        risk: 'low',
      },
      async ({ quantity }: { quantity: number }) => {
        await addToCart(quantity);
        return { ok: true };
      }
    );
  }

  ngOnDestroy(): void {
    this.disposeTool();
  }

  addNow(): void {
    void addToCart(1);
  }
}
```

Le point important ici n'est pas seulement le code. C'est le contrat : le nom du tool, sa description et son schema doivent expliquer clairement au LLM ce que l'action fait, ce qu'elle attend et dans quel contexte elle est legitime.

## 5. Injecter du contexte utile au LLM

### Pourquoi le contexte passif compte autant que les tools

Les tools disent a l'agent ce qu'il peut faire. Le contexte passif lui dit ou il se trouve, ce que l'utilisateur regarde et quelles contraintes de parcours s'appliquent.

Un bon contexte permet d'eviter les appels de tools absurdes ou mal cibles.

### Exemple avec `registerContext()`

```ts
import { Component, computed, effect, signal } from '@angular/core';
import { registerContext } from '@owllayer/angular';

@Component({
  standalone: true,
  selector: 'app-detail',
  template: `<h1>{{ title() }}</h1>`,
})
export class DetailComponent {
  readonly title = signal('Velo vintage');
  readonly price = signal(180);
  readonly category = signal('sport');

  constructor() {
    effect(() => {
      registerContext({
        page: 'listing-detail',
        listing: {
          title: this.title(),
          price: this.price(),
          category: this.category(),
        },
      });
    });
  }
}
```

### Regle simple

Un contexte utile n'est pas un slug sec du type `{ page: 'detail' }`.
Un contexte utile est descriptif, metier, et assez riche pour orienter correctement le raisonnement du modele.

## 6. Monter le widget officiel

Si vous voulez une integration rapide, le widget Angular du SDK suffit pour exposer une interface texte/voix complete.

```ts
import { Component } from '@angular/core';
import { OwlLayerWidgetComponent } from '@owllayer/angular';

@Component({
  standalone: true,
  imports: [OwlLayerWidgetComponent],
  template: `
    <owllayer-widget
      [endpoint]="'ws://localhost:4001/owllayer'"
      [apiKey]="'pk_dev_123'"
      [config]="{
        agentName: 'Milo',
        agentTitle: 'Assistant produit',
        mode: 'text'
      }"
    />
  `,
})
export class ShellComponent {}
```

Le widget peut aussi recevoir un `client` deja instancie si vous voulez partager exactement la meme connexion OwlLayer avec le reste de l'application.

## 7. Monter les DevTools en developpement

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

Les DevTools sont charges dynamiquement. Ils servent surtout a inspecter les tools enregistres, l'etat agent, les plugins exposes et certains evenements runtime.

## Contraintes d'integration

Ces regles evitent les erreurs les plus frequentes :

- `registerContext()`, `registerToolResolver()`, `registerNavigationTool()` et `registerViewStateTool()` s'appuient sur l'injection Angular et doivent etre appeles dans un contexte d'injection valide
- les descriptions de tools doivent etre metier, pas techniques
- un schema Zod doit decrire chaque parametre important pour le LLM
- un widget sans endpoint/apiKey ou sans client fourni echoue a l'initialisation
- `OwlLayerToolDirective` et `OwlLayerToolButtonComponent` suivent le cycle de vie Angular : montage = enregistrement, destruction = cleanup

## Et ensuite

Une fois le socle pose, la suite logique est :

- structurer les tools par domaines via `registerToolResolver()`
- centraliser navigation et etat UI standard
- ajouter le widget ou une UI custom selon votre produit
- brancher un contexte riche par page, panier, dossier, etape ou entite courante

La suite est detaillee dans [Tools et contexte](./tools-and-context.md), [Composants](./components.md) et [Widget](./widget.md).
