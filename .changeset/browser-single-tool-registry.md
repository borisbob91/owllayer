---
"@owllayer/browser": patch
---

The browser SDK now keeps a single tool store — the core registry — instead of its own separate list (#152, #157).

- `OwlLayer.callTool()` now runs the same handler as a real call, so `onToolCall` callbacks fire during a simulation.
