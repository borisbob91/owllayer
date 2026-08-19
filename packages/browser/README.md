# @owllayer/browser

SDK OwlLayer universel pour les applications web sans framework frontend (HTML, Laravel Blade, Shopify Liquid, WordPress).

## Installation

```bash
pnpm add @owllayer/browser @owllayer/core
```

## Usage ESM

```ts
import { OwlLayer } from '@owllayer/browser';

await OwlLayer.init({
  apiKey: 'pk_dev_123',
  endpoint: 'ws://localhost:3000/owllayer',
  widget: { enabled: true },
  hitl: { enabled: true },
  autoDiscovery: { enabled: true },
  sessionPersistence: { enabled: true, ttlMs: 1800000 },
});

OwlLayer.registerTool('highlight_section', {
  description: 'Mettre en evidence une section de la page',
  risk: 'none',
  handler: ({ selector }) => {
    const el = document.querySelector(String(selector));
    if (el) (el as HTMLElement).style.outline = '2px solid #22c55e';
    return { ok: true };
  },
});
```

## Usage CDN

```html
<script src="https://cdn.owllayer.dev/browser@1.0.0/owllayer.min.js"></script>
<script>
  OwlLayer.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://cloud.owllayer.dev/owllayer'
  });
</script>
```

## Auto-discovery HTML

```html
<button
  data-owllayer-tool="open_contact_form"
  data-owllayer-description="Ouvrir le formulaire de contact"
  data-owllayer-risk="none"
  data-owllayer-action="click"
  data-owllayer-selector="#contact-button"
>
  Contact
</button>
```

Attributs MVP:
- `data-owllayer-tool`
- `data-owllayer-description`
- `data-owllayer-risk`
- `data-owllayer-action` (`click`, `focus`, `scrollIntoView`, `setValue`)
- `data-owllayer-selector` (optionnel)

## API publique

- `OwlLayer.init(config)`
- `OwlLayer.registerTool(name, definition)`
- `OwlLayer.unregisterTool(name)`
- `OwlLayer.updateContext(data)`
- `OwlLayer.sendText(text)`
- `OwlLayer.destroy()`
