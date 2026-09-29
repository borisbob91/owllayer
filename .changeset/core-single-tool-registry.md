---
"@owllayer/core": minor
---

`OwlLayerClient` now keeps its tools in a single `ToolRegistry` instead of scattered internal state (#152).

- New `ToolRegistry` API: `onChange`, `lastChangedAt`, `replaceAll`, `maxTools`, `setMaxTools`, `global` and `plugin` fields on a registered tool, and global tools are kept when `removeByComponent` runs.
- New `ToolLimitError`.
- Tool limit: no limit before the handshake, then the server's `maxActiveTools` (30 by default). Extra registrations are refused: `registerTool` returns `false`, a `tool.registry.limit` event fires, and `onError` is called.
- `HANDSHAKE_ACK` can carry an optional `maxActiveTools` (protocol version unchanged).
- Tool arguments are validated against the tool's Zod schema before the approval request is sent — invalid arguments never reach an approval, and the handler receives the parsed values. `callTool` validates the same way. `RegisteredTool` now has a `schema` field.
