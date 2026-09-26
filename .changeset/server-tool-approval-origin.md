---
"@owllayer/server": patch
---

Fixed: after the user approves a high or critical server tool, the result now goes back to the model that called it (#128).

- Typed request while voice mode is on: the text agent now receives the result and answers. Before, the result was sent to the voice provider with an id it did not know, and the user got no answer.
- Voice request, voice session closed before the approval: the action still runs, but its result is no longer shown to the user as raw JSON.
