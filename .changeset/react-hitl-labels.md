---
"@owllayer/react": minor
---

The texts of the built-in approval modal and banner can now be customized (#84).

- New optional `config.hitl.labels`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool).
- Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
- `useApproval()` returns the configured labels for custom approval UIs.
