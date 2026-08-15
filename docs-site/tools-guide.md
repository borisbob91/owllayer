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
| Svelte | `use:agentTool` | Svelte action registers on node | `destroy()` removes |
| Angular | service, directive, or resolver | Service registers in `DomOSClient` | `OnDestroy` / explicit cleanup |
| Browser | `DomOS.registerTool()` or auto-discovery | Runtime registers as global or DOM-discovered | `unregisterTool()` or DOM removal detected |

---

## Local vs Global Tools

Not all tools should follow a specific component.

A **local tool** must disappear with its component. Examples: `select_product_card`, `edit_current_row`, `open_visible_modal`.

A **global tool** can survive navigation. Examples: `navigate`, `open_cart`, `set_theme`, `logout`. Declare it explicitly as global or place it in a central resolver.

Practical rule: **if the user can no longer see the object or screen in question, the LLM should no longer see the corresponding tool.**

---

## Execution Contract

When the server sends a `TOOL_CALL`, `DomOSClient` finds the matching local tool, executes its handler, and returns a `TOOL_RESULT`.

The key contract: **The client runtime awaits only the Promise returned by the tool handler.**

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

In the second example, the API call is detached. The OwlLayer AI Runtime may send `TOOL_RESULT` before the actual action completes.

### Common Pitfalls

- Promises launched without `return` or `await`
- RxJS `subscribe()` not converted to Promise when the result matters
- `setTimeout()` used as an un-awaited side effect
- State mutations triggered after the handler returns that are part of the expected result

### Angular + RxJS

In Angular apps using RxJS, prefer an explicit Promise when the tool depends on the result:

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

All SDKs share the same execution contract: return a Promise that resolves only once the tool result is actually available.

---

## Anti-patterns

These practices weaken the Agentic UI model:

- **Declaring all tools globally at startup** instead of mounting them with their UI
- **Giving the LLM tools out of context** (tool for a modal that isn't open)
- **Ambiguous tool names** (`do_action`, `handle_click`)
- **Business logic in description** instead of the handler
- **Returning success before async completes**
- **Confusing context with action** (context is read-only, tools are actions)
- **Risky action with `risk: 'none'`** (payment without confirmation)
- **One tool per list item** instead of a parameterized tool (e.g. one `add_to_cart({ productId })` not 50 `add_product_123`)

The Agentic UI SDK works best when the application exposes **few actions, but accurate, contextualized, and verifiable ones**.
