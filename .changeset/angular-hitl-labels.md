---
"@owllayer/angular": minor
---

The texts of the built-in approval modal can now be customized (#93).

- New optional `hitl.labels` option of `provideOwlLayer`: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels`.
- `owllayer-approval-modal` accepts a `labels` input. The widget passes the configured labels to it.
- Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
- `OwlLayerAngularService.hitlLabels` returns the configured labels for custom approval UIs.
