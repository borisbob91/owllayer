# Angular SDK Integration

The `@domos/angular` package provides enterprise-grade Angular bindings featuring dependency injection, custom directives, resolvers, and standalone components.

---

## 1. Setup (`provideDomOS`)

Register the DomOS providers inside your root application config file (`app.config.ts` or `main.ts`):

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideDomOS } from '@domos/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideDomOS({
      endpoint: 'wss://api.domos.dev/domos',
      apiKey: 'pk_live_xxxx',
      debug: true
    })
  ]
};
```

---

## 2. Dynamic Tool Injection (`DomOSClient` Service)

Inject the `DomOSClient` service to register and unregister tools inside Angular components:

```typescript
import { Component, OnInit, OnDestroy, inject, input } from '@angular/core';
import { DomOSClient } from '@domos/angular';
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
  private domos = inject(DomOSClient);
  
  productName = input.required<string>();
  productId = input.required<string>();

  ngOnInit() {
    // Registers the tool when component initializes
    this.domos.registerTool({
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
    this.domos.unregisterTool(`select_product_${this.productId()}`);
  }

  private triggerCardClick() {
    // Visual logic here
  }
}
```

---

## 3. Angular Directives (`domosTool` & `domosContext`)

You can register tools and contextual data declaratively in templates using custom directives:

```html
<!-- Tool click action mapping -->
<button
  [domosTool]="'open_support_portal'"
  domosDescription="Opens the client customer support chat portal"
  domosRisk="none"
  domosAction="click"
  (click)="support.open()"
>
  Open Support
</button>

<!-- Context syncing -->
<div 
  [domosContext]="{ section: 'billing', plan: 'enterprise' }"
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
import { domosResolver } from '@domos/angular';
import { z } from 'zod';

export const routes: Route[] = [
  {
    path: 'checkout',
    loadComponent: () => import('./checkout.component').then(c => c.CheckoutComponent),
    resolve: {
      domosTools: domosResolver(() => ({
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
import { DomOSWidgetComponent } from '@domos/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DomOSWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <domos-widget
      apiKey="pk_live_xxxx"
      endpoint="wss://api.domos.dev/domos"
      [config]="{ agentName: 'Alex', voice: true }"
    ></domos-widget>
  `
})
export class AppComponent {}
```
