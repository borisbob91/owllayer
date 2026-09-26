---
"@owllayer/browser": minor
---

Add optional `hitl.labels` (`title`, `message`, `approve`, `deny`, `deniedMessage`, `toolLabels`) to `OwlLayer.init()`/`BrowserOwlLayer` to customize the built-in `HitlOverlay`; current texts remain the defaults and `getHitlLabels()` (also exposed on the CDN global `OwlLayer`) returns the configured labels (#94).
