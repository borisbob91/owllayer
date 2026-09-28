# Tools Guide

A tool is a business action that the agent is authorized to trigger. This page covers how to write good tools, their lifecycle, and common mistakes to avoid.

---

## What Makes a Good Tool

A tool should have:

- A **stable name** (verb + noun, e.g. `add_to_cart`, `archive_ticket`)
- A **clear business description** (what it does for the user, not how it works internally)
- A **precise argument schema** (with Zod or equivalent)
- A **coherent HITL risk level** reflecting real user impact
- A **handler** that performs the action and returns a useful result

---

## Dynamic Lifecycle

Client tools are dynamic. They live at the rhythm of the interface:

| UI Cycle | Agentic UI SDK Effect |
|---|---|
| Component mounted | Tool can be registered |
| Component destroyed | Tool must be removed |
| Navigation | Tool list changes |
| Context modified | Server receives a new `CONTEXT_UPDATE` |

This model prevents giving the LLM a global list of out-of-context actions. The agent sees only the actions relevant to the current screen.

### Per-SDK Integration

| SDK | Declaration | Registration | Cleanup |
|---|---|---|---|
| React | `useAgentTool()` | `useEffect()` registers on mount | Hook cleanup, unless `global: true` |
| Vue | `useAgentTool()` | `onMounted()` registers | `onUnmounted()` removes, unless global |
| Svelte | `use:agentTool` | Svelte action registers on node | `destroy()` removes, unless `global: true` |
| Angular | service, directive, or resolver | Service registers in `OwlLayerClient` | `OnDestroy` / explicit cleanup, unless `global: true` |
| Browser | `OwlLayer.registerTool()` or auto-discovery | Runtime registers as global or DOM-discovered | `unregisterTool()` or DOM removal detected |

### Example: React

`useAgentTool()` follows the component lifecycle. When `ProductCard` renders, the tool `add_visible_product_to_cart` syncs with the server. When the card leaves the DOM, the hook cleans the local registry and the server receives a `CONTEXT_UPDATE` without that tool.

```tsx
import { useAgentTool } from '@owllayer/react';
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

A **local tool** must disappear with its component. Examples: `select_product_card`, `edit_current_row`, `open_visible_modal`.

A **global tool** can survive navigation. Examples: `navigate`, `open_cart`, `set_theme`, `logout`. Declare it explicitly as global or place it in a central resolver.

Practical rule: **if the user can no longer see the object or screen in question, the LLM should no longer see the corresponding tool.**

### Declaring a Global Tool

A global tool is not removed when its component unmounts. It stays registered until `unregisterTool(name)` is called or the client is destroyed.

| API | How to make it global |
|---|---|
| `useAgentTool` (React, Vue) | `useAgentTool({ name, description, global: true }, handler)` |
| `use:agentTool` (Svelte) | `global: true` in the action options, next to `name`, `description` and `handler` |
| `registerTool` (Angular service) | `owllayer.registerTool({ name, description, global: true }, handler)` |
| Resolvers (`useAgentToolResolver`, `agentToolResolver`, `registerToolResolver`) | option `{ global: true }`: applies to every tool of the resolver |
| `navigate` helpers (`useNavigationTool`, `navigateTool`, `registerNavigationTool`) | global by default; Svelte and Angular accept `global: false` |
| `ui_state` helpers (`useViewStateTool`, `uiStateTool`, `registerViewStateTool`) | local by default; Svelte and Angular accept `global: true` |
| `OwlLayer.registerTool()` (browser) | always global; `data-owllayer-tool` elements are removed with their element |

The declarative components (`OwlLayerTool`, `OwlLayerToolBtn`, the Angular `owllayerTool` directive and tool button) are always local: they follow the element they wrap.

---

## Execution Contract

When the server sends a `TOOL_CALL`, `OwlLayerClient` finds the matching local tool, applies the HITL policy, executes its handler, and returns a `TOOL_RESULT`. If the handler navigated to another page, the result is sent once the new page has registered its tools.

The key contract: **The client runtime awaits only the Promise returned by the tool handler.**

All async work necessary for the result must be `await`ed or returned in that handler.

### Correct

```ts
owllayer.registerTool(
  { name: 'archive_ticket', description: 'Archive the current ticket' },
  async ({ ticketId }) => {
    const result = await api.archiveTicket(ticketId);
    return { archived: true, id: result.id };
  }
);
```

### Incorrect

```ts
owllayer.registerTool(
  { name: 'archive_ticket', description: 'Archive the current ticket' },
  ({ ticketId }) => {
    api.archiveTicket(ticketId); // detached!
    return { archived: true };
  }
);
```

In the second example, the API call is detached. OwlLayer may send `TOOL_RESULT` before the actual action completes.

### Common Pitfalls

- Promises launched without `return` or `await`
- RxJS `subscribe()` not converted to Promise when the result matters
- `setTimeout()` used as an un-awaited side effect
- State mutations triggered after the handler returns that are part of the expected result

### Angular + RxJS

In Angular apps using RxJS, prefer an explicit Promise when the tool depends on the result:

```ts
import { firstValueFrom } from 'rxjs';

owllayer.registerTool(
  { name: 'load_order', description: 'Load the current order' },
  async ({ orderId }) => {
    const order = await firstValueFrom(orderService.load(orderId));
    return { orderId: order.id, status: order.status };
  }
);
```

All SDKs share the same execution contract: return a Promise that resolves only once the tool result is actually available.

---

## Argument Validation

When a tool has a Zod `schema`, `OwlLayerClient` validates the arguments of each `TOOL_CALL` **before** the HITL policy and before the handler:

- Invalid arguments: no approval is requested and the handler is not called. The client returns a `TOOL_RESULT` error `Validation args "<name>": <first issue>`, so the model can correct its call.
- Valid arguments: the handler receives the parsed values, with the schema defaults applied (`z.number().default(1)`).

This covers `useAgentTool`, the resolvers, the declarative components and the Angular API: every SDK passes its schema to the client, and none validates again in its own wrapper. A resolver does not call its hooks (`onBeforeCall`, `onError`, `onErrorAnyCall`…) for an invalid call; errors thrown by the handler still reach `onError` and `onErrorAnyCall`.

`client.callTool(name, args)` (DevTools simulation) validates the same way.

Tools of the browser SDK are described with JSON Schema (`OwlLayer.registerTool(name, { parameters })`, `data-owllayer-schema`), not Zod: the client does not validate them. Check their arguments in the handler.

---

## Tool Limit

A session accepts at most **30 active tools** by default. More tools make the prompt larger and the model's choice less reliable.

The limit is set on the server with `maxActiveTools` (a positive integer, otherwise the constructor throws):

```ts
const server = new OwlLayerServer({
  llm,
  maxActiveTools: 50,
});
```

The server sends the limit to the client in `HANDSHAKE_ACK`, and the client applies it:

- Before the handshake, the client accepts every tool: components often mount before the connection. When the `HANDSHAKE_ACK` arrives, the client keeps the first tools in registration order up to the limit and removes the others. A server that does not send `maxActiveTools` gets the default of 30.
- Above the limit, `registerTool` refuses the tool and returns `false`. Replacing a tool with the same name is always accepted.
- Every refusal is reported: the client emits the `tool.registry.limit` event with `{ refused, limit }` (the names of the refused tools) and calls `onError` with a `ToolLimitError`.

```ts
client.onEvent('tool.registry.limit', ({ refused, limit }) => {
  console.warn(`${refused.join(', ')} not registered, limit ${limit}`);
});
```

On the server, a `CONTEXT_UPDATE` with more tools than the limit (sent by an older client) does not change the session's tool list: the page URL and the context are updated, the previous tools are kept, and the server answers with a `SYSTEM_EVENT` of type `error`.

The client and the server keep their tools in the same `ToolRegistry` class of `@owllayer/core`: replacement by name, component ownership, `global` protection and the limit follow the same rules on both sides.

---

## Anti-patterns

These practices weaken the Agentic UI model:

| Anti-pattern | Why it's bad |
|---|---|
| Declaring all tools globally at startup | LLM sees irrelevant actions, prompt bloat |
| Giving the LLM tools out of context (a tool for a modal that isn't open) | Agent attempts impossible actions |
| Ambiguous tool names (`do_action`, `handle_click`) | Model picks the wrong tool |
| Business logic in the description instead of the handler | Unreliable, non-verifiable |
| Returning success before async work completes | Stale state, silent failures |
| Confusing passive context with action | Context should inform, not act |
| Exposing a risky action with `risk: 'none'` (payment without confirmation) | Bypasses HITL safety |
| One tool per list item instead of a parameterized tool (one `add_to_cart({ productId })`, not 50 `add_product_123`) | Prompt explosion |

The Agentic UI SDK works best when the application exposes **few actions, but accurate, contextualized, and verifiable ones**.
