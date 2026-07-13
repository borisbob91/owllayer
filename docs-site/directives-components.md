# Directives & Components

To build an Agentic UI, DomOS provides rich frontend primitives across all supported frameworks. These allow you to co-locate your tool declarations directly alongside your visual UI elements.

---

## The Co-Location Components

The primary way to expose actions to an agent is by declaring them right where the button or component lives in your code. This ensures your UI elements and agent abilities stay synchronized.

### 1. `DomOSTool` (Wrapper Component)
Use `DomOSTool` to wrap an **existing** custom UI element, button, or link. It registers the tool with the agent while keeping your exact layout intact.

### 2. `DomOSToolBtn` (Built-in Button Component)
Use `DomOSToolBtn` when you want a self-rendered HTML `<button>` that registers its tool capabilities automatically. This is ideal for adding standard action triggers without wrapping boilerplate.

#### Common Properties (Props)
Both components share the same API contracts across all SDKs:

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | *Required* | Unique identifier of the tool. |
| `description` | `string` | *Required* | Plain-text instructions explaining to the LLM when and how to call this tool. |
| `schema` | `ZodSchema \| object` | `undefined` | Optional Zod schema or JSON Schema defining the input parameters. |
| `handler` | `(args: any) => any` | *Required* | The actual frontend function executed when the agent or user invokes this action. |
| `risk` | `'none' \| 'low' \| 'high' \| 'critical'` | `'none'` | Controls human-in-the-loop (HITL) approval requirements. |
| `class` / `className` | `string` | `''` | Custom CSS class names applied to the element. |
| `disabled` | `boolean` | `false` | Disables both the visual button and agent accessibility when true. |

---

## Framework Implementations & Code Examples

### React (`@domos/react`)

```tsx
import { DomOSToolBtn, DomOSTool } from '@domos/react';
import { z } from 'zod';

const addToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().default(1)
});

export function ProductActions({ product }) {
  return (
    <div className="flex gap-4">
      {/* Example A: Using DomOSToolBtn (Self-rendered button) */}
      <DomOSToolBtn
        name="add_to_cart"
        description="Add the active item to the shopping cart."
        schema={addToCartSchema}
        risk="low"
        className="btn-primary"
        handler={(args) => {
          console.log('Adding to cart:', args);
        }}
      >
        Add to Cart
      </DomOSToolBtn>

      {/* Example B: Wrapping an existing custom button with DomOSTool */}
      <DomOSTool
        name="trigger_wishlist"
        description="Save this product to the user wishlist."
        handler={() => addToWishlist(product.id)}
      >
        <MyCustomIconButton icon="heart">
          Save to Wishlist
        </MyCustomIconButton>
      </DomOSTool>
    </div>
  );
}
```

### Vue (`@domos/vue`)

```vue
<script setup>
import { DomOSToolBtn, DomOSTool } from '@domos/vue';
import { ref } from 'vue';

const props = defineProps(['product']);
</script>

<template>
  <div class="actions">
    <!-- Using DomOSToolBtn -->
    <DomOSToolBtn
      name="add_to_cart"
      description="Add the current item to the shopping cart."
      risk="low"
      class="btn-primary"
      :handler="() => console.log('Cart updated', props.product.id)"
    >
      Add to Cart
    </DomOSToolBtn>

    <!-- Wrapping with DomOSTool -->
    <DomOSTool
      name="bookmark_item"
      description="Add this item to bookmarks."
      :handler="() => console.log('Bookmarked!')"
    >
      <button class="custom-button-styling">⭐ Save</button>
    </DomOSTool>
  </div>
</template>
```

### Svelte (`@domos/svelte`)

```svelte
<script lang="ts">
  import { DomOSToolBtn, DomOSTool } from '@domos/svelte';
  export let product;
</script>

<div class="actions">
  <!-- Svelte self-rendered Button -->
  <DomOSToolBtn
    name="add_to_cart"
    description="Add the active product to the shopping cart."
    risk="low"
    class="btn-primary"
    handler={() => addToCart(product.id)}
  >
    Add to Cart
  </DomOSToolBtn>

  <!-- Wrapping arbitrary Svelte elements -->
  <DomOSTool
    name="remove_item"
    description="Remove this product from the shopping list."
    risk="high"
    handler={() => remove(product.id)}
  >
    <button class="btn-danger">Delete</button>
  </DomOSTool>
</div>
```

### Angular (`@domos/angular`)

In Angular, these co-location components are made available via directives and custom element tags matching the React pattern:

```html
<div class="actions">
  <!-- DomOSToolBtn tag in Angular templates -->
  <domos-tool-btn
    name="add_to_cart"
    description="Add the active item to the shopping cart."
    risk="low"
    class="btn-primary"
    [handler]="addToCartFn"
  >
    Add to Cart
  </domos-tool-btn>

  <!-- Wrapping existing DOM nodes using the directive style alternative -->
  <button 
    class="custom-button"
    [domosTool]="'trigger_wishlist'"
    [domosToolDescription]="'Save this item to user wishlist'"
    (click)="saveToWishlist()"
  >
    Save Wishlist
  </button>
</div>
```

---

## Vanilla / Browser JS (`@domos/browser`)

For lightweight script injections, Shopify, or plain HTML pages, co-location is handled natively using **HTML `data-*` attributes**.

The auto-discovery engine automatically scans the DOM for elements containing `data-domos-tool` and mounts them to the local agent instance in real-time.

```html
<!-- Example: Native HTML Button exposed directly to DomOS Agent -->
<button
  class="btn-add-cart"
  data-domos-tool="add_to_cart"
  data-domos-description="Add item to shopping cart"
  data-domos-schema='{"type": "object", "properties": {"quantity": {"type": "number"}}}'
  data-domos-risk="low"
  onclick="addToCart(789)"
>
  Add to Cart
</button>
```

When the agent triggers this tool, it fires a click event on the target element or invokes the registered listener directly:

```javascript
import { mountDomOS } from '@domos/browser';

// The browser engine discovers DOM attributes automatically
const client = mountDomOS({
  serverUrl: 'ws://localhost:3000/domos',
});
```

---

## Cross-SDK Component Parity Matrix

Here is how co-location primitives map across each package:

| Concept / Element | `@domos/react` | `@domos/vue` | `@domos/svelte` | `@domos/angular` | `@domos/browser` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Self-rendered Button** | `<DomOSToolBtn>` | `<DomOSToolBtn>` | `<DomOSToolBtn>` | `<domos-tool-btn>` | `data-domos-tool` |
| **Existing Element Wrapper** | `<DomOSTool>` | `<DomOSTool>` | `<DomOSTool>` | `[domosTool]` | `data-domos-tool` |
| **Custom Handler Registration** | `useAgentTool()` | `useAgentTool()` | `agentTool` action | `DomOSAngularService` | `client.registerTool()` |
| **Zod Schema support** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ JSON Schema only |
| **Shadow DOM isolation** | `<ShadowContainer>` | Built-in | Native encapsulation | Emulated/Shadow | Native |
