---
"@owllayer/vue": minor
---

The texts of the built-in approval modal and banner can now be customized (#91).

- New optional `hitl.labels` option of `OwlLayerPlugin`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool, shown in the banner).
- Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
- `useApproval()` returns the configured labels for custom approval UIs.
