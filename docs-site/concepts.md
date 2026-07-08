# Core Concepts

DomOS relies on key abstractions to sync client interfaces with LLM-orchestrated backends. Understanding these concepts will help you build robust Agentic UIs.

---

## 1. DomOSClient

`DomOSClient` is the framework-agnostic client engine provided by `@domos/core`. All integration SDKs (React, Vue, Svelte, Angular, Browser) wrap this engine.

It manages:
- **WebSocket ADTP transport**: Opening, authenticating, and recovering the connection.
- **Dynamic Tool Registry**: Keeping track of active tools available on the page.
- **Shadow Context States**: Building and synchronizing the passives states of the DOM.
- **Tool execution handling**: Executing local callback handlers, protecting them with timeouts, and forwarding results.

---

## 2. Dynamic Tools Registry

In DomOS, tools are **dynamic** and tied to the component lifecycle.
* **Component Mount**: Declares its tools to the local client registry.
* **Handshake/Sync**: An updated `CONTEXT_UPDATE` message is dispatched to the server.
* **Component Unmount**: The tools are automatically removed from the registry, followed by another sync.

This paradigm ensures the AI model **only sees tools relevant to the active viewport**. It prevents prompt bloat and prevents the model from attempting actions out of context.

### The Tool Contract

A tool handler must return a `Promise` resolving to the result of the action. DomOS waits for this promise to resolve before returning a response to the server.

> [!WARNING]
> Do not trigger detached side-effects inside a tool handler (e.g. fire-and-forget API calls without `await` or `return`). If the promise resolves before the side-effect completes, errors will not be caught, and the LLM will proceed with obsolete state data.

```ts
// CORRECT: DomOS awaits the API response
async ({ productId }) => {
  const result = await api.addItemToCart(productId);
  return { success: true, cart: result };
}

// INCORRECT: DomOS returns instantly, ignoring API failures or delays
({ productId }) => {
  api.addItemToCart(productId); // detached promise
  return { success: true };
}
```

---

## 3. Shadow Context

The **Shadow Context** is a lightweight, read-only representation of the application's current state.

It does **not** copy the raw DOM structure. Instead, it aggregates relevant metadata declared by active components, such as:
- **URL path** (e.g., `/product/keyboard-mechanical`)
- **Visual page context** (e.g., `page: "detail"`)
- **Loaded metadata** (e.g., `productId: "kb-99"`, `price: 89.99`, `stock: 4`)
- **User status** (e.g., `isLoggedIn: true`, `plan: "premium"`)

The LLM consumes this context continuously to understand what the user is looking at, enabling it to personalize response prompts and choose the right tools.

---

## 4. HITL Security (Human-in-the-Loop)

Security is built directly into the protocol. Tools declare their risk classification when registered:

| Risk Level | Behavior | Example Use Case |
|---|---|---|
| `none` | Executed instantly without warning. | `search_products`, `get_cart` |
| `low` | Executed instantly, triggers a silent UI notification. | `add_to_cart`, `like_product` |
| `high` | Suspends execution and triggers a **confirmation modal**. | `clear_cart`, `remove_from_cart` |
| `critical` | Suspends execution, shows **reinforced approval UI**. | `confirm_order`, `delete_account` |

High and critical tools cannot execute until the user physically clicks "Approve" on the overlay. The confirmation interface is rendered inside a closed **Shadow DOM** to prevent the AI from trying to select or click the approval buttons programmatically.
