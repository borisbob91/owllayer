---
"@owllayer/server": patch
---

Fixed: high and critical client tools now show the approval UI when a live voice session is active (#72).

- The tool call is always forwarded to the browser, so the approval modal or banner appears.
- The live voice provider receives a single response, with its own call id.
