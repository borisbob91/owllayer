---
title: "@domos/vue"
description: Documentation DomOS.
---

# @domos/vue

DomOS est un SDK d'**AI-driven interfaces**, ou interfaces agentiques : l'agent agit dans une interface existante par les tools explicitement déclarés par l'application. `@domos/vue` intègre ce modèle dans Vue 3 avec composables, plugin, HITL et widget texte ou vocal.

Le contexte et les tools suivent le cycle de vie de vos composants Vue. L'application conserve sa logique métier ; le modèle ne reçoit que ce qu'elle choisit d'exposer.

```bash
pnpm add @domos/vue @domos/core zod
```

## Exports

### Plugin

| Export | Description |
|---|---|
| `DomOSPlugin` | Plugin Vue — installe DomOS dans l'application via `app.use()` |

### Composables

| Export | Description |
|---|---|
| `useAgent` | État réactif de l'agent et méthodes d'envoi |
| `useAgentTool` | Enregistre un tool depuis un composant |
| `useAgentToolResolver` | Resolver centralisé multi-tools |
| `useNavigationTool` | Tool de navigation URL standard |
| `useViewStateTool` | Tool d'état UI standard |
| `useAgentContext` | Injecte du contexte passif dans la session LLM |
| `useApproval` | Accès aux approbations HITL en attente |
| `useVoiceMode` | Microphone et streaming audio |

### Composants

| Export | Description |
|---|---|
| `AgentIndicator` | Badge d'état visuel |
| `ApprovalModal` | Modal HITL pour les actions `risk: 'high'` et `'critical'` |
| `ApprovalBanner` | Bandeau HITL compact (alternative à la modal) |
| `DomOSTool` | Wrapper transparent — associe un tool à un élément existant |
| `DomOSToolBtn` | Bouton qui expose simultanément un tool agent |
| `DomOSWidget` | Widget chat vocal/texte complet |

### Utilitaires resolver

| Export | Description |
|---|---|
| `createResolverFromSwitch` | Convertit une map de handlers en configuration resolver |
| `createCRUDResolver` | Génère automatiquement les 5 tools CRUD d'une ressource |

## Guides

- [Installation et configuration](./getting-started.md)
- [Composables](./composables.md)
- [Composants](./components.md)
- [Widget](./widget.md)
