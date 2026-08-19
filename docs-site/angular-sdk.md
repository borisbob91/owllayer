# Angular SDK Integration

The `@owllayer/angular` package provides enterprise-grade Angular bindings for the Agentic UI SDK, featuring dependency injection, custom directives, resolvers, and standalone components.

---

## 1. Setup (`provideOwlLayer`)

Register the Agentic UI SDK providers inside your root application config file (`app.config.ts` or `main.ts`):

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideOwlLayer } from '@owllayer/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOwlLayer({
      endpoint: 'wss://api.owllayer.dev/owllayer',
      apiKey: 'pk_live_xxxx',
      debug: true
    })
  ]
};
```

---

## 2. Dynamic Tool Injection (`OwlLayerClient` Service)

Inject the `OwlLayerClient` service to register and unregister tools inside Angular components:

```typescript
import { Component, OnInit, OnDestroy, inject, input } from '@angular/core';
import { OwlLayerClient } from '@owllayer/angular';
import { z } from 'zod';

@Component({
  selector: 'app-product-card',
  standalone: true,
  template: `
    <div class="card">
      <h4>{{ productName() }}</h4>
    </div>
  `
})
export class ProductCardComponent implements OnInit, OnDestroy {
  private owllayer = inject(OwlLayerClient);
  
  productName = input.required<string>();
  productId = input.required<string>();

  ngOnInit() {
    // Registers the tool when component initializes
    this.owllayer.registerTool({
      declaration: {
        name: `select_product_${this.productId()}`,
        description: `Select the product card for ${this.productName()}`,
        parameters: z.object({}),
        risk: 'none'
      },
      handler: async () => {
        this.triggerCardClick();
        return { status: 'selected', id: this.productId() };
      }
    });
  }

  ngOnDestroy() {
    // Deregister the tool to avoid memory leaks or ghost calls
    this.owllayer.unregisterTool(`select_product_${this.productId()}`);
  }

  private triggerCardClick() {
    // Visual logic here
  }
}
```

---

## 3. Angular Directives (`owllayerTool` & `owllayerContext`)

You can register tools and contextual data declaratively in templates using custom directives:

```html
<!-- Tool click action mapping -->
<button
  [owllayerTool]="'open_support_portal'"
  owllayerDescription="Opens the client customer support chat portal"
  owllayerRisk="none"
  owllayerAction="click"
  (click)="support.open()"
>
  Open Support
</button>

<!-- Context syncing -->
<div 
  [owllayerContext]="{ section: 'billing', plan: 'enterprise' }"
  class="billing-container"
>
  <!-- content -->
</div>
```

---

## 4. Resolvers for Centralized Tool Management

Angular routes can leverage resolvers to structure globally accessible tools for specific layout trees:

```typescript
import { Route } from '@angular/router';
import { owllayerResolver } from '@owllayer/angular';
import { z } from 'zod';

export const routes: Route[] = [
  {
    path: 'checkout',
    loadComponent: () => import('./checkout.component').then(c => c.CheckoutComponent),
    resolve: {
      owllayerTools: owllayerResolver(() => ({
        checkout: {
          tools: {
            submit_payment: {
              description: "Finalize the purchase order and charge the payment card",
              schema: z.object({
                paymentMethodId: z.string()
              }),
              risk: 'critical',
              handler: async ({ paymentMethodId }) => {
                const invoice = await api.pay(paymentMethodId);
                return { success: true, invoiceId: invoice.id };
              }
            }
          }
        }
      }))
    }
  }
];
```

---

## 5. Standard Widget component

You can embed the pre-built widget component inside standalone components:

```typescript
import { Component } from '@angular/core';
import { OwlLayerWidgetComponent } from '@owllayer/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [OwlLayerWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <owllayer-widget
      apiKey="pk_live_xxxx"
      endpoint="wss://api.owllayer.dev/owllayer"
      [config]="{ agentName: 'Alex', voice: true }"
    ></owllayer-widget>
  `
})
export class AppComponent {}
```
