# @owllayer/angular

Angular 19+ SDK for **OwlLayer AI**. Build Agentic UI applications with Angular standalone providers, injectable services, directives, components, real-time voice mode, and Human-in-the-Loop (HITL) security.

---

## Features

- **Standalone Provider (`provideOwlLayer`)**: First-class support for Angular standalone bootstrap and dependency injection.
- **`OwlLayerAngularService`**: Injectable facade managing connection, session state, message dispatching, and tool registrations.
- **`OwlLayerVoiceService`**: Real-time voice mode service with microphone capture and PCM streaming.
- **`OwlLayerToolDirective`**: Declarative directive for registering tools directly in Angular templates.
- **`OwlLayerWidgetComponent`**: Ready-to-use assistant chat & voice widget component.
- **Human-in-the-Loop (HITL)**: `OwlLayerApprovalModalComponent` for securing critical actions.

---

## Installation

```bash
# pnpm
pnpm add @owllayer/angular @owllayer/core @angular/core @angular/common @angular/forms rxjs

# npm
npm install @owllayer/angular @owllayer/core @angular/core @angular/common @angular/forms rxjs

# yarn
yarn add @owllayer/angular @owllayer/core @angular/core @angular/common @angular/forms rxjs
```

---

## Quick Start

### 1. Configure the Provider

In your `app.config.ts` (standalone bootstrap):

```ts
import { ApplicationConfig } from '@angular/core';
import { provideOwlLayer } from '@owllayer/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOwlLayer({
      endpoint: 'ws://localhost:3001/owllayer',
      apiKey: 'pk_dev_xxxx',
    }),
  ],
};
```

### 2. Embed the Assistant Widget

In your root template (`app.component.html`):

```html
<router-outlet></router-outlet>
<owllayer-widget [agentName]="'Léa'" [agentTitle]="'Assistant'"></owllayer-widget>
```

In `app.component.ts`:

```ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OwlLayerWidgetComponent } from '@owllayer/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, OwlLayerWidgetComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {}
```

### 3. Register Tools via Service or Directive

#### In Component TypeScript:

```ts
import { Component, OnInit, inject } from '@angular/core';
import { OwlLayerAngularService } from '@owllayer/angular';

@Component({
  selector: 'app-product-details',
  standalone: true,
  template: `<div>{{ product.name }}</div>`,
})
export class ProductDetailsComponent implements OnInit {
  private owllayer = inject(OwlLayerAngularService);
  product = { id: 'prod_1', name: 'Premium Headphones' };

  ngOnInit() {
    this.owllayer.registerTool(
      'get_current_product',
      {
        description: 'Get product information currently displayed on screen',
        risk: 'none',
      },
      async () => ({ product: this.product })
    );
  }
}
```

#### In Template Directive:

```html
<button
  owllayerTool="add_to_wishlist"
  [toolDescription]="'Add current item to user wishlist'"
  [toolRisk]="'none'"
  (toolExecuted)="onAddToWishlist($event)"
>
  Add to Wishlist
</button>
```

### 4. Voice Mode Service

```ts
import { Component, inject } from '@angular/core';
import { OwlLayerVoiceService } from '@owllayer/angular';

@Component({
  selector: 'app-voice-button',
  standalone: true,
  template: `
    <button (click)="toggleVoice()">
      {{ voiceService.isCapturing() ? 'Stop Voice' : 'Start Voice' }}
    </button>
  `,
})
export class VoiceButtonComponent {
  protected voiceService = inject(OwlLayerVoiceService);

  toggleVoice() {
    if (this.voiceService.isCapturing()) {
      this.voiceService.stopVoice();
    } else {
      this.voiceService.startVoice();
    }
  }
}
```

---

## Core APIs

| API | Purpose |
|---|---|
| `provideOwlLayer(config)` | Angular provider function configuring the OwlLayer client. |
| `OwlLayerAngularService` | Core service for managing tools, context, and connection. |
| `OwlLayerVoiceService` | Service for managing voice recording, streaming, and audio playback. |
| `registerNavigationTool(...)` | Helper connecting Angular Router navigation to AI tools. |
| `OwlLayerToolDirective` | Declarative directive for template-based tool registration. |
| `OwlLayerWidgetComponent` | Standalone chat/voice widget component. |
| `OwlLayerApprovalModalComponent` | Standalone HITL approval modal component. |

---

## License

MIT © OwlLayer
