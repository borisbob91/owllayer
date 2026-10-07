---
"@owllayer/svelte": minor
---

The texts of the built-in approval modal and banner can now be customized (#92).

- New optional `hitl.labels` option of `initOwlLayer`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool, shown in the banner).
- Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
- The new `hitlLabels` store returns the configured labels for custom approval UIs.
