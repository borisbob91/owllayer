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
