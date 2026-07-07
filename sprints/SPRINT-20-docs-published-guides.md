---
mode: agent
description: >
  Sprint 20 - Harmoniser les guides francais publies pour les developpeurs,
  le serveur, la securite et chaque SDK expose dans la sidebar.
---

# Sprint 20 - Guides developpeur publies

**Base :** Sprints 18 et 19  
**Perimetre :** pages francaises `apps/docs-site/src/content/docs/`  
**Reference :** `features/feature_34_docs_published_guides_alignment.md`

## Priorites

1. Produit, serveur, securite et pages d'accueil de SDK.
2. Guides API framework et browser.
3. Migrations et controle de navigation.

## Fichiers cibles exacts

| Zone | Pages autorisees |
| --- | --- |
| Produit | `widget.mdx`, `PLUGINS.md`, `CUSTOM_ADAPTER.md`, `SYSTEM_PROMPT.md`, `AGENT_MEMORY.md`, `AGENT_MEMORY_FRONTEND.md`, `AUDIO_PIPELINE_RULES.mdx` |
| Serveur | `server/getting-started.mdx`, `server/runtime-and-tools.mdx`, `server/security-and-storage.mdx`, `HITL_SECURITY.mdx` |
| Migrations | `MIGRATION_V0.2.md`, `MIGRATION_RESOLVER.md` |
| Angular | `angular/readme.md`, `angular/getting-started.md`, `angular/tools-and-context.md`, `angular/components.md`, `angular/widget.md` |
| React | `react/readme.md`, `react/getting-started.md`, `react/hooks.md`, `react/components.md`, `react/widget.md` |
| Vue | `vue/README.md`, `vue/getting-started.md`, `vue/composables.md`, `vue/components.md`, `vue/widget.md` |
| Svelte | `svelte/README.md`, `svelte/getting-started.md`, `svelte/stores-actions.md`, `svelte/components.md`, `svelte/widget.md` |
| Browser | `browser/README.md`, `browser/getting-started.md`, `browser/api-reference.md`, `browser/auto-discovery.md`, `browser/widget-voice-session.md` |

## Gates

- [ ] Pas de modification des pages anglaises.
- [ ] Toute correction technique est fondee sur les exports ou comportements actuels.
- [ ] Chaque chapitre prioritaire renvoie vers les notions et pages suivantes utiles.
- [ ] Controle des routes et du build documente.

