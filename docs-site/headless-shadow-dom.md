# Headless Browser SDK & Shadow DOM Isolation

The Vanilla JavaScript browser SDK allows you to inject the OwlLayer agent chat widget into any website, blog, CMS, or static HTML page without using React, Vue, or Svelte frameworks.

To prevent theme conflicts and protect styles in third-party environments, the widget renders inside a **Shadow DOM**.

---

## 1. Quick Setup (Vanilla JS)

To load and instantiate the widget using a standard script tag, import the bundled IIFE script:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Storefront Portal</title>
</head>
<body>
  <h1>Welcome to our Store</h1>

  <!-- Include OwlLayer browser bundle -->
  <script src="https://cdn.owllayer.dev/browser/owllayer-browser.min.js"></script>
  
  <script>
    // Initialize the Vanilla SDK
    OwlLayer.init({
      apiKey: 'pk_live_xxxx',
      endpoint: 'wss://api.owllayer.dev/owllayer',
      widget: {
        enabled: true,
        config: {
          agentName: 'Assistant',
          agentTitle: 'Live support',
          stylePreset: 'chat',
          mode: 'audio'
        }
      }
    });
  </script>
</body>
</html>
```

---

## 2. Preventing CSS Collisions with Shadow DOM

In third-party integrations (such as e-commerce widgets or embed blocks), the parent website CSS rules can interfere with the widget's layout. To solve this, the widget wraps its internal UI inside a **Shadow Root**.

```
Document HTML (Host Page)
   └── Main Page DOM (e.g. style reset rules)
   └── <owllayer-widget-root> (Custom Web Component)
         └── Shadow Root (#shadow-root)
               ├── <style> (Isolated CSS variables)
               └── <div class="widget-panel"> (Protected UI)
```

By rendering inside a `#shadow-root (open)` element, the widget guarantees:
- **Style Encapsulation**: Website styles (like general `div { padding: 10px; }` or standard resets) cannot penetrate the shadow boundary.
- **Theme Protection**: Internal widget style classes cannot bleed out and affect the parent site layout.

---

## 3. Styling Configuration & Theme Generator (`generateWidgetStyles`)

Because the Shadow DOM blocks external stylesheets, you cannot override widget colors using standard CSS. Instead, custom styles must be injected directly into the shadow root during initialization using the **`generateWidgetStyles`** helper.

### Styles Generator API
The helper utility compiles a custom theme object into CSS custom property variables target-bound to the context:

```typescript
import { generateWidgetStyles } from '@owllayer/core';

const theme = {
  primaryColor: '#1d4ed8',     // Brand accent
  backgroundColor: '#1e293b',  // Dark panel background
  textColor: '#f8fafc',        // White-ish text
  borderRadius: '16px'         // Curved corners
};

// Generates CSS variables scoped to ':host' (for Shadow DOM) or '.owllayer-root' (for Light DOM)
const cssStyles = generateWidgetStyles(theme, 'chat', ':host');
```

### Context Selectors Rules
When customizing the generator selector target, apply these rules:
- **React (Shadow DOM)**: Use `:host` (Default). This applies variables directly to the shadow root container.
- **Vue / Svelte (Light DOM)**: Use `.owllayer-widget-root` wrapper class. Do not use `:host` as these SDKs render in the main DOM tree.
- **CMS Integrations (Shopify / WooCommerce)**: Use `:host` if loading via standard web components script tag.
