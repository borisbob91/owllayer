---
"@owllayer/browser": minor
---

The texts of the built-in approval overlay can now be customized (#94).

- New optional `hitl.labels` option: `title`, `message`, `approve`, `deny`, `deniedMessage` and `toolLabels` (display name per tool, shown in the overlay).
- Without configuration, the current texts are unchanged. The HITL policy message stays displayed unless `message` is set.
- `getHitlLabels()`, also available on the CDN global `OwlLayer`, returns the configured labels for custom approval UIs.
