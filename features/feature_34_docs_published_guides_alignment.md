# Feature #34 : Alignement des guides developpeur publies

**Statut** : Jaune - Validee  
**Domaine** : documentation (`apps/docs-site`)  
**Porteur** : @BorisBob  
**Valide par** : @BorisBob  
**Date** : 2026-05-25

---

## Besoin

Les guides importes dans l'application Astro doivent former une documentation publiee coherente en francais. Ils doivent guider un developpeur vers le bon SDK, le serveur, la securite et les migrations sans promettre des comportements qui ne sont pas garantis par le code.

### User story

> En tant que developpeur, je veux lire un chapitre SDK ou serveur autonome, avec des liens vers les notions fondamentales, afin d'integrer DomOS sans parcourir les sources historiques du depot.

---

## Perimetre strict

### Ce que cette feature fait

- Relit et harmonise les guides francais exposes dans la sidebar.
- Ajoute aux pages prioritaires une introduction qui relie l'API au modele DomOS.
- Verifie le vocabulaire `tool`, `ADTP`, `DomOSClient`, `DomOSServer` et `HITL`.
- Maintient des cartes de navigation en fin des pages prioritaires.

### Ce que cette feature ne fait pas

- Ne touche pas les pages anglaises `apps/docs-site/src/content/docs/en/**`.
- Ne modifie pas les sources historiques `docs/**`.
- Ne change aucun exemple en dehors de la documentation publiee.
- Ne corrige pas le runtime ou son build.

---

## Fichiers qui seront modifies

| Groupe | Fichiers |
| --- | --- |
| Trace | `features/feature_34_docs_published_guides_alignment.md`, `sprints/SPRINT-20-docs-published-guides.md` |
| Produit | `apps/docs-site/src/content/docs/widget.mdx`, `PLUGINS.md`, `CUSTOM_ADAPTER.md`, `SYSTEM_PROMPT.md`, `AGENT_MEMORY.md`, `AGENT_MEMORY_FRONTEND.md`, `AUDIO_PIPELINE_RULES.mdx` |
| Serveur et securite | `apps/docs-site/src/content/docs/server/getting-started.mdx`, `server/runtime-and-tools.mdx`, `server/security-and-storage.mdx`, `HITL_SECURITY.mdx` |
| Migration | `apps/docs-site/src/content/docs/MIGRATION_V0.2.md`, `MIGRATION_RESOLVER.md` |
| Angular | `apps/docs-site/src/content/docs/angular/readme.md`, `angular/getting-started.md`, `angular/tools-and-context.md`, `angular/components.md`, `angular/widget.md` |
| React | `apps/docs-site/src/content/docs/react/readme.md`, `react/getting-started.md`, `react/hooks.md`, `react/components.md`, `react/widget.md` |
| Vue | `apps/docs-site/src/content/docs/vue/README.md`, `vue/getting-started.md`, `vue/composables.md`, `vue/components.md`, `vue/widget.md` |
| Svelte | `apps/docs-site/src/content/docs/svelte/README.md`, `svelte/getting-started.md`, `svelte/stores-actions.md`, `svelte/components.md`, `svelte/widget.md` |
| Browser | `apps/docs-site/src/content/docs/browser/README.md`, `browser/getting-started.md`, `browser/api-reference.md`, `browser/auto-discovery.md`, `browser/widget-voice-session.md` |

---

## Phasage

1. Priorite publication : guides produit, serveur, securite et pages d'accueil SDK.
2. Details API : pages composants, hooks, composables et actions.
3. Migrations et controle de liens internes.

---

## Criteres d'acceptation

- [ ] Toutes les pages francaises referencees par la sidebar ont une ouverture compréhensible pour un developpeur.
- [ ] La terminologie ne traduit pas litteralement des concepts sans les definir.
- [ ] Les exemples restent conformes aux API exposees par le code.
- [ ] Les pages prioritaires conduisent a une suite logique par des cartes de navigation.
- [ ] Les pages anglaises restent hors scope.

