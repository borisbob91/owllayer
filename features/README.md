# DomOS — Features

Ce dossier contient les documents de spécification de chaque nouvelle fonctionnalité du framework DomOS.

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
| 08 | [DomOSServerPlugin — Système de plugins côté serveur](feature_08_domos_server_plugin.md) | server | 🔵 Proposition | @BorisBob |
| 09 | [Plugin Capabilities & Controlled Execution (TypeScript)](feature_09_safe_plugin_runtime.md) | server | 🟡 Validée | @BorisBob |
| 10 | [Plugin Isolated Runtime — Rust + napi](feature_10_rust_napi_runtime.md) | server | 🔵 Roadmap | @BorisBob |
| 11 | [Dashboard Embarqué — `@domos/ui/dashboard`](feature_11_ui_dashboard_embarque.md) | ui | 🔵 Proposition | @BorisBob |
| 12 | [DevTools Cross-Framework — `@domos/ui/devtools`](feature_12_ui_devtools_cross_framework.md) | ui | 🔵 Proposition | @BorisBob |
| 13 | [Intégration `@domos/ui` dans `@domos/server`](feature_13_server_ui_integration.md) | server | 🟡 Validée | @BorisBob |
| 14 | [Sprint 1 — Extraction des contrats voice/speech vers `@domos/core`](feature_14_voice_contracts_core_audio_boundaries.md) | server | 🟡 Validée | @BorisBob |
| 15 | [Sprint 2 — Migration des providers voice/speech hors de `@domos/server`](feature_15_voice_provider_migration_server_composition.md) | server | 🟡 Validée | @BorisBob |
| 16 | [Sprint 3 — Gate finale de validation de la topologie voice `@domos/core` / `@domos/audio` / `@domos/server` / `adapter-*`](feature_16_voice_final_gate_server_adapter_topology_validation.md) | server | 🟡 Validée | @BorisBob |
| 17 | [Sprint 1 — Alignement contractuel du dashboard embarqué `@domos/ui`](feature_17_ui_embedded_dashboard_contract_alignment.md) | ui | 🟡 Validée | @BorisBob |
| 18 | [Sprint 2 — Nettoyage du code orphelin et des routes mortes du dashboard embarqué `@domos/ui`](feature_18_ui_embedded_dashboard_orphan_cleanup.md) | ui | 🟡 Validée | @BorisBob |
