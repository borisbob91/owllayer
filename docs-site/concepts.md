# Core Concepts

DomOS is an **AI-driven interface SDK** (Agentic UI). It does not replace your interface or generate a new UI on top of your product. It lets an AI agent act within your existing interface through explicit actions, observable context, and guardrails.

---

## Agentic UI

An agentic interface is one that an agent can drive through explicit entry points.

The agent does not freely manipulate the DOM. It does not guess which buttons to click. It receives a structured context and a list of tools declared by the application, then acts only through those tools.

This distinguishes DomOS from two related approaches:

- A **classic chatbot**, which mostly responds with text.
- A **Generative UI**, which fabricates a new interface rather than driving the existing one.

In DomOS, the application remains the owner of its business logic. The agent only calls actions the product explicitly chooses to expose.

---

## Neural-DOM Binding

The **Neural-DOM Binding** is the central architectural concept of DomOS. It describes the controlled link between an existing interface, the context that interface agrees to share, and the reasoning of an AI agent.

The model does not receive free access to the DOM. It receives a contract: a structured **Shadow Context**, a list of active tools, and an exchange protocol. When it wants to act, it does not click directly in the interface; it requests execution of a tool declared by the application.

The principle reads in three layers:

| Layer | Role | DomOS Rule |
|---|---|---|
| Visible DOM | What the user sees and manipulates | The agent does not freely browse it |
| Shadow Context | Useful representation of the screen, visible data, and mounted tools | Only this context is synchronized with the server |
| Agentic Session | Server runtime, LLM adapter, and tool call decisions | The LLM only sees tools present in the current session |

The word **Binding** matters: the link is not static. When a page, product card, modal, or form appears, its tools can enter the Shadow Context. When that UI disappears, its tools must be removed and the server must receive a new `CONTEXT_UPDATE`. This prevents out-of-context actions.

The word **Neural** designates the decision-making part: the model reasons on the authorized context, then optionally chooses a tool. But execution stays in application code, with schemas, permissions, HITL validations, and handlers defined by the product.

---

## DomOSClient

`DomOSClient` is the front-end core of DomOS. The framework SDKs add ergonomics suited to their environment, but they share the same runtime.

| SDK | Primary Integration | Runtime |
|---|---|---|
| React | `DomOSProvider`, hooks, components | `DomOSClient` |
| Vue | plugin, composables, components | `DomOSClient` |
| Svelte | stores, actions, components | `DomOSClient` |
| Angular | provider, injection, signals, directives | `DomOSClient` |
| Browser | Direct JavaScript API, HTML auto-discovery | `DomOSClient` |

What the client shares across all frameworks:

- WebSocket ADTP connection
- Local tool registry
- Context synchronization
- Tool call execution
- Tool result emission
- Session state and runtime events

React, Vue, Svelte, Angular, and Browser change how tools are declared. They do not change the protocol.

---

## ADTP

ADTP stands for **Agent-to-DOM Transfer Protocol**.

It is the JSON-over-WebSocket protocol that connects DomOSClient to DomOSServer.

| Message | Direction | Role |
|---|---|---|
| `HANDSHAKE_INIT` | Client → Server | Announces SDK and protocol versions at socket open |
| `HANDSHAKE_ACK` | Server → Client | Confirms session created after authentication |
| `CONTEXT_UPDATE` | Client → Server | Synchronizes URL, context, and active tools |
| `USER_INPUT` | Client → Server | Sends a user text or audio message |
| `TOOL_CALL` | Server → Client | Requests execution of a client tool |
| `TOOL_RESULT` | Client → Server | Returns the tool's result |
| `AGENT_RESPONSE` | Server → Client | Transmits the agent's response |
| `SYSTEM_EVENT` | Bidirectional | Signals errors, notifications, or runtime control |

The server can only call tools known in the current session context.

---

## Shadow Context

The Shadow Context is the lightweight representation of the interface's useful state.

It does not copy the entire DOM. It contains only the information the application chooses to expose:

- Current URL and title
- Active page or view
- Visible entity
- Current selection
- Active filters
- Cart, folder, workflow step, or other useful business data
- List of active tools

Passive context helps the model understand the situation. It does not create actions. Actions are carried by tools.

---

## Tools

A tool is a business action that the agent is authorized to trigger.

A good tool has:

- A stable name
- A clear business description
- A precise argument schema
- A coherent HITL risk level
- A handler that performs the action and returns a useful result

Tools are dynamic: they appear and disappear with the interface components that declare them. See [Tool Lifecycle & Best Practices](/tool-lifecycle) for the full component lifecycle, execution contract, and anti-patterns.

---

## HITL (Human-in-the-Loop)

DomOS classifies tools by risk level:

| Risk | Expected Behavior | Example |
|---|---|---|
| `none` | Direct execution | `search_products` |
| `low` | Direct execution with optional notification | `add_to_cart` |
| `high` | User confirmation required | `clear_cart` |
| `critical` | Reinforced user confirmation required | `process_payment` |

Risk should reflect the real user impact, not the technical complexity of the handler.

High and critical tools cannot execute until the user physically clicks "Approve". The confirmation interface is rendered inside a closed Shadow DOM to prevent the AI from attempting to click approval buttons programmatically.
