---
"@owllayer/angular": minor
---

Add optional `hitl.labels` (`title`, `message`, `approve`, `deny`, `deniedMessage`, `toolLabels`) to `provideOwlLayer` to customize the built-in `owllayer-approval-modal`, plus an optional `@Input() labels` on `OwlLayerApprovalModalComponent`; current texts remain the defaults and `OwlLayerAngularService.hitlLabels` exposes the configured labels (#93).
