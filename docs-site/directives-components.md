# Directives & Components

To build an Agentic UI, the Agentic UI SDK provides rich frontend primitives across all supported frameworks. These allow you to co-locate your tool declarations directly alongside your visual UI elements.

---

## The Co-Location Components

The primary way to expose actions to an agent is by declaring them right where the button or component lives in your code. This ensures your UI elements and agent abilities stay synchronized.

### 1. `OwlLayerTool` (Wrapper Component)
Use `OwlLayerTool` to wrap an **existing** custom UI element, button, or link. It registers the tool with the agent while keeping your exact layout intact.

### 2. `OwlLayerToolBtn` (Built-in Button Component)
Use `OwlLayerToolBtn` when you want a self-rendered HTML `<button>` that registers its tool capabilities automatically. This is ideal for adding standard action triggers without wrapping boilerplate.

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

### React (`@owllayer/react`)

```tsx
import { OwlLayerToolBtn, OwlLayerTool } from '@owllayer/react';
import { z } from 'zod';

const addToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().default(1)
});

export function ProductActions({ product }) {
  return (
    <div className="flex gap-4">
      {/* Example A: Using OwlLayerToolBtn (Self-rendered button) */}
      <OwlLayerToolBtn
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
      </OwlLayerToolBtn>

      {/* Example B: Wrapping an existing custom button with OwlLayerTool */}
      <OwlLayerTool
        name="trigger_wishlist"
        description="Save this product to the user wishlist."
        handler={() => addToWishlist(product.id)}
      >
        <MyCustomIconButton icon="heart">
          Save to Wishlist
        </MyCustomIconButton>
      </OwlLayerTool>
    </div>
  );
}
```

### Vue (`@owllayer/vue`)

```vue
<script setup>
import { OwlLayerToolBtn, OwlLayerTool } from '@owllayer/vue';
import { ref } from 'vue';

const props = defineProps(['product']);
</script>

<template>
  <div class="actions">
    <!-- Using OwlLayerToolBtn -->
    <OwlLayerToolBtn
      name="add_to_cart"
      description="Add the current item to the shopping cart."
      risk="low"
      class="btn-primary"
      :handler="() => console.log('Cart updated', props.product.id)"
    >
      Add to Cart
    </OwlLayerToolBtn>

    <!-- Wrapping with OwlLayerTool -->
    <OwlLayerTool
      name="bookmark_item"
      description="Add this item to bookmarks."
      :handler="() => console.log('Bookmarked!')"
    >
      <button class="custom-button-styling">⭐ Save</button>
    </OwlLayerTool>
  </div>
</template>
```

### Svelte (`@owllayer/svelte`)

```svelte
<script lang="ts">
  import { OwlLayerToolBtn, OwlLayerTool } from '@owllayer/svelte';
  export let product;
</script>

<div class="actions">
  <!-- Svelte self-rendered Button -->
  <OwlLayerToolBtn
    name="add_to_cart"
    description="Add the active product to the shopping cart."
    risk="low"
    class="btn-primary"
    handler={() => addToCart(product.id)}
  >
    Add to Cart
  </OwlLayerToolBtn>

  <!-- Wrapping arbitrary Svelte elements -->
  <OwlLayerTool
    name="remove_item"
    description="Remove this product from the shopping list."
    risk="high"
    handler={() => remove(product.id)}
  >
    <button class="btn-danger">Delete</button>
  </OwlLayerTool>
</div>
```

### Angular (`@owllayer/angular`)

In Angular, these co-location components are made available via directives and custom element tags matching the React pattern:

```html
<div class="actions">
  <!-- OwlLayerToolBtn tag in Angular templates -->
  <owllayer-tool-btn
    name="add_to_cart"
    description="Add the active item to the shopping cart."
    risk="low"
    class="btn-primary"
    [handler]="addToCartFn"
  >
    Add to Cart
  </owllayer-tool-btn>

  <!-- Wrapping existing DOM nodes using the directive style alternative -->
  <button 
    class="custom-button"
    [owllayerTool]="'trigger_wishlist'"
    [owllayerToolDescription]="'Save this item to user wishlist'"
    (click)="saveToWishlist()"
  >
    Save Wishlist
  </button>
</div>
```

---

## Vanilla / Browser JS (`@owllayer/browser`)

For lightweight script injections, Shopify, or plain HTML pages, co-location is handled natively using **HTML `data-*` attributes**.

The auto-discovery engine automatically scans the DOM for elements containing `data-owllayer-tool` and mounts them to the local agent instance in real-time.

```html
<!-- Example: Native HTML Button exposed directly to OwlLayer Agent -->
<button
  class="btn-add-cart"
  data-owllayer-tool="add_to_cart"
  data-owllayer-description="Add item to shopping cart"
  data-owllayer-schema='{"type": "object", "properties": {"quantity": {"type": "number"}}}'
  data-owllayer-risk="low"
  onclick="addToCart(789)"
>
  Add to Cart
</button>
```

When the agent triggers this tool, it fires a click event on the target element or invokes the registered listener directly:

```javascript
import { mountOwlLayer } from '@owllayer/browser';

// The browser engine discovers DOM attributes automatically
const client = mountOwlLayer({
  serverUrl: 'ws://localhost:3000/owllayer',
});
```

---

## Cross-SDK Component Parity Matrix

Here is how co-location primitives map across each package:

| Concept / Element | `@owllayer/react` | `@owllayer/vue` | `@owllayer/svelte` | `@owllayer/angular` | `@owllayer/browser` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Self-rendered Button** | `<OwlLayerToolBtn>` | `<OwlLayerToolBtn>` | `<OwlLayerToolBtn>` | `<owllayer-tool-btn>` | `data-owllayer-tool` |
| **Existing Element Wrapper** | `<OwlLayerTool>` | `<OwlLayerTool>` | `<OwlLayerTool>` | `[owllayerTool]` | `data-owllayer-tool` |
| **Custom Handler Registration** | `useAgentTool()` | `useAgentTool()` | `agentTool` action | `OwlLayerAngularService` | `client.registerTool()` |
| **Zod Schema support** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ JSON Schema only |
| **Shadow DOM isolation** | `<ShadowContainer>` | Built-in | Native encapsulation | Emulated/Shadow | Native |
