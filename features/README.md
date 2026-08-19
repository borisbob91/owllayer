# OwlLayer — Features

Ce dossier contient les documents de spécification de chaque nouvelle fonctionnalité du framework OwlLayer.

**⚠️ Toute nouvelle feature doit avoir son document ici AVANT que le code soit écrit.**  
Voir [CONTRIBUTING.md](../CONTRIBUTING.md) pour le process complet et le canvas à respecter.

## Convention de nommage

```
feature_XX_nom_descriptif.md
```

- **XX** : Numéro séquentiel (01, 02, 03...)
- **nom_descriptif** : Nom court en snake_case décrivant la feature

## Statuts

| Icône | Statut | Signification |
|---|---|---|
| 🔵 | Proposition | En cours de discussion, pas encore validée |
| 🔵 | Roadmap | Piste planifiée, non encore validée pour implémentation |
| 🟡 | Validée | Approuvée par le porteur du projet, implémentation autorisée |
| 🟢 | Livrée | Implémentée, testée, mergée |
| 🔴 | Rejetée | Refusée — raison documentée dans le fichier |

## Index

| # | Feature | Domaine | Statut | Porteur |
|---|---|---|---|---|
| 01 | [Déplacement MemoryManager → persistence/](feature_01_memory_manager_persistence_move.md) | server | 🟡 Validée | @BorisBob |
| 05 | [Système de plugins client-side](feature_05_client_plugin_system.md) | core + react + vue + svelte | 🟢 Livrée | @BorisBob |
| 07 | [Plugin UI Capabilities](feature_07_plugin_ui_capabilities.md) | core + react + vue + svelte | 🔵 Proposition | @BorisBob |
| 08 | [OwlLayerServerPlugin — Système de plugins côté serveur](feature_08_owllayer_server_plugin.md) | server | 🔵 Proposition | @BorisBob |
| 09 | [Plugin Capabilities & Controlled Execution (TypeScript)](feature_09_safe_plugin_runtime.md) | server | 🟡 Validée | @BorisBob |
| 10 | [Plugin Isolated Runtime — Rust + napi](feature_10_rust_napi_runtime.md) | server | 🔵 Roadmap | @BorisBob |
| 11 | [Dashboard Embarqué — `@owllayer/ui/dashboard`](feature_11_ui_dashboard_embarque.md) | ui | 🔵 Proposition | @BorisBob |
| 12 | [DevTools Cross-Framework — `@owllayer/ui/devtools`](feature_12_ui_devtools_cross_framework.md) | ui | 🔵 Proposition | @BorisBob |
| 13 | [Intégration `@owllayer/ui` dans `@owllayer/server`](feature_13_server_ui_integration.md) | server | 🟡 Validée | @BorisBob |
| 14 | [Sprint 1 — Extraction des contrats voice/speech vers `@owllayer/core`](feature_14_voice_contracts_core_audio_boundaries.md) | server | 🟡 Validée | @BorisBob |
| 15 | [Sprint 2 — Migration des providers voice/speech hors de `@owllayer/server`](feature_15_voice_provider_migration_server_composition.md) | server | 🟡 Validée | @BorisBob |
| 16 | [Sprint 3 — Gate finale de validation de la topologie voice `@owllayer/core` / `@owllayer/audio` / `@owllayer/server` / `adapter-*`](feature_16_voice_final_gate_server_adapter_topology_validation.md) | server | 🟡 Validée | @BorisBob |
| 17 | [Sprint 1 — Alignement contractuel du dashboard embarqué `@owllayer/ui`](feature_17_ui_embedded_dashboard_contract_alignment.md) | ui | 🟡 Validée | @BorisBob |
| 18 | [Sprint 2 — Nettoyage du code orphelin et des routes mortes du dashboard embarqué `@owllayer/ui`](feature_18_ui_embedded_dashboard_orphan_cleanup.md) | ui | 🟢 Livrée | @BorisBob |
| 19 | [Sprint 3 — Parité visuelle et ergonomique du panneau DevTools embarqué `@owllayer/ui/devtools`](feature_19_ui_embedded_devtools_panel_parity.md) | ui | 🟡 Validée | @BorisBob |
| 20 | [Sprint 4 — Inventaire live, hot reload et distinction plugins installés / tools actifs dans `@owllayer/ui/devtools`](feature_20_ui_embedded_devtools_live_inventory_hot_reload.md) | ui | 🟡 Validée | @BorisBob |
| 21 | [Sprint 5 — Contrat canonique des événements client-side dans `@owllayer/core`](feature_21_core_client_event_contract_standardization.md) | core | 🟡 Validée | @BorisBob |
| 22 | [Sprint 6 — Alignement de `@owllayer/adapter-google` sur le contrat d'événements canonique](feature_22_server_google_adapter_event_alignment.md) | server | 🟡 Validée | @BorisBob |
| 23 | [Sprint 7 — Adoption React/UI du contrat d'événements canonique pour une DX client plus simple](feature_23_react_ui_event_dx_adoption.md) | react + ui | 🟡 Validée | @BorisBob |
| 24 | [Sprint 6 bis — Alignement de `@owllayer/adapter-openai` et `@owllayer/adapter-anthropic` sur le contrat d'événements canonique](feature_24_server_remaining_adapter_event_alignment.md) | server | 🟡 Validée | @BorisBob |
| 25 | [Bootstrap du domaine Angular SDK](feature_25_angular_sdk_domain_bootstrap.md) | angular | 🟡 Validée | @BorisBob |
| 26 | [Parite de patterns Angular SDK avec React et Vue](feature_26_angular_sdk_pattern_parity.md) | angular | 🟡 Validée | @BorisBob |
| 27 | [Demo Angular marketplace de petites annonces type Leboncoin](feature_27_demo_angular_classifieds_marketplace.md) | angular | 🔵 Proposition | @BorisBob |
| 29 | [Nettoyage self-host only du standalone server](feature_29_server_standalone_self_host_cleanup.md) | server | 🟡 Validée | @BorisBob |
| 30 | [Analytics local self-host dans le server principal](feature_30_server_local_analytics_self_host.md) | server | 🟡 Validée | @BorisBob |
| 31 | [Parite minimale du mode vocal Angular SDK + demo de validation](feature_31_angular_voice_mode_parity.md) | angular | 🟡 Validee | @BorisBob |
