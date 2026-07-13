# Tool Lifecycle & Best Practices

This page covers how tools live and die in DomOS, the execution contract they must respect, and common pitfalls to avoid.

---

## Dynamic Tool Lifecycle

Client tools are dynamic. They live at the rhythm of the interface:

| UI Cycle | DomOS Effect |
|---|---|
| Component mounted | Tool can be registered |
| Component destroyed | Tool must be removed |
| Navigation | Tool list changes |
| Context modified | Server receives a new `CONTEXT_UPDATE` |

This model prevents giving the LLM a global list of out-of-context actions. The agent sees only the actions relevant to the current screen.

---

## Component Lifecycle per SDK

| SDK | Declaration | Registration | Cleanup |
|---|---|---|---|
| React | `useAgentTool()` | `useEffect()` registers on mount | Hook cleanup, unless `global: true` |
| Vue | `useAgentTool()` | `onMounted()` registers | `onUnmounted()` removes, unless global |
| Svelte | `use:agentTool` | Svelte action registers on node | `destroy()` removes |
| Angular | service, directive, or resolver | Service registers in `DomOSClient` | `OnDestroy` / explicit cleanup |
| Browser | `DomOS.registerTool()` or auto-discovery | Runtime registers as global or DOM-discovered | `unregisterTool()` or DOM removal detected |

### Example: React

`useAgentTool()` follows the component lifecycle. When `ProductCard` renders, the tool `add_visible_product_to_cart` syncs with the server. When the card leaves the DOM, the hook cleans the local registry and the server receives a `CONTEXT_UPDATE` without that tool.

```tsx
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

export function ProductCard({ product }: { product: Product }) {
  useAgentTool({
    name: 'add_visible_product_to_cart',
    description: `Add the visible product "${product.name}" to cart.`,
    schema: z.object({
      quantity: z.number().min(1).default(1),
    }),
    risk: 'low',
  }, async ({ quantity }) => {
    await cartApi.add(product.id, quantity);
    return { added: true, productId: product.id, quantity };
  });

  return <article>{product.name}</article>;
}
```

The LLM doesn't see a generic "add any product" tool. It sees an action contextualized by the current interface: this specific product card, with its `product.id` captured by the React handler.

---

## Local vs Global Tools

Not all tools should follow a specific component.

A **local tool** must disappear with its component:
- `select_product_card`
- `edit_current_row`
- `open_visible_modal`

A **global tool** can survive navigation:
- `navigate`
- `open_cart`
- `set_theme`
- `logout`

Declare global tools explicitly as `global: true` or place them in a central resolver.

**Practical rule: if the user can no longer see the object or screen in question, the LLM should no longer see the corresponding tool.**

---

## Tool Execution Contract

When the server sends a `TOOL_CALL`, `DomOSClient` finds the matching local tool, executes its handler, and returns a `TOOL_RESULT`.

The key contract: **DomOS awaits only the Promise returned by the tool handler.**

All async work necessary for the result must be `await`ed or returned in that handler.

### Correct

```ts
domos.registerTool(
  { name: 'archive_ticket', description: 'Archive the current ticket' },
  async ({ ticketId }) => {
    const result = await api.archiveTicket(ticketId);
    return { archived: true, id: result.id };
  }
);
```

### Incorrect

```ts
domos.registerTool(
  { name: 'archive_ticket', description: 'Archive the current ticket' },
  ({ ticketId }) => {
    api.archiveTicket(ticketId); // detached!
    return { archived: true };
  }
);
```

In the second example, the API call is detached. DomOS may send `TOOL_RESULT` before the actual action completes.

### Angular & RxJS

The contract is identical across all SDKs. With RxJS, prefer an explicit Promise when the tool depends on the result:

```ts
import { firstValueFrom } from 'rxjs';

domos.registerTool(
  { name: 'load_order', description: 'Load the current order' },
  async ({ orderId }) => {
    const order = await firstValueFrom(orderService.load(orderId));
    return { orderId: order.id, status: order.status };
  }
);
```

### What to Avoid

- Promises launched without `return` or `await`
- RxJS `subscribe()` not converted to Promise when the result matters
- `setTimeout()` used as an un-awaited side effect
- State mutations triggered after the handler returns that are part of the expected result

---

## Anti-patterns

These practices weaken the DomOS model:

| Anti-pattern | Why it's bad |
|---|---|
| Declaring all tools globally at startup | LLM sees irrelevant actions, prompt bloat |
| Giving the LLM tools out of context | Agent attempts impossible actions |
| Using ambiguous tool names | Model picks wrong tool |
| Business logic in description instead of handler | Unreliable, non-verifiable |
| Returning success before async completes | Stale state, silent failures |
| Confusing passive context with action | Context should inform, not act |
| Exposing a risky action with `risk: 'none'` | Bypasses HITL safety |
| One tool per item in a long list | Prompt explosion, use parameterized tools instead |

DomOS works best when the application exposes **few actions, but accurate, contextualized, and verifiable ones**.
