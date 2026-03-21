# @domos/browser

SDK DomOS universel pour les applications web sans framework frontend (HTML, Laravel Blade, Shopify Liquid, WordPress).

## Installation

```bash
pnpm add @domos/browser @domos/core
```

## Usage ESM

```ts
import { DomOS } from '@domos/browser';

await DomOS.init({
  apiKey: 'pk_dev_123',
  endpoint: 'ws://localhost:3000/domos',
  widget: { enabled: true },
  hitl: { enabled: true },
  autoDiscovery: { enabled: true },
  sessionPersistence: { enabled: true, ttlMs: 1800000 },
});

DomOS.registerTool('highlight_section', {
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
<script src="https://cdn.domos.dev/browser@1.0.0/domos.min.js"></script>
<script>
  DomOS.init({
    apiKey: 'pk_live_xxx',
    endpoint: 'wss://cloud.domos.dev/domos'
  });
</script>
```

## Auto-discovery HTML

```html
<button
  data-domos-tool="open_contact_form"
  data-domos-description="Ouvrir le formulaire de contact"
  data-domos-risk="none"
  data-domos-action="click"
  data-domos-selector="#contact-button"
>
  Contact
</button>
```

Attributs MVP:
- `data-domos-tool`
- `data-domos-description`
- `data-domos-risk`
- `data-domos-action` (`click`, `focus`, `scrollIntoView`, `setValue`)
- `data-domos-selector` (optionnel)

## API publique

- `DomOS.init(config)`
- `DomOS.registerTool(name, definition)`
- `DomOS.unregisterTool(name)`
- `DomOS.updateContext(data)`
- `DomOS.sendText(text)`
- `DomOS.destroy()`
