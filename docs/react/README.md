# @domos/react

SDK React pour DomOS — agents vocaux/texte avec tools, HITL et widget intégré.

```bash
pnpm add @domos/react @domos/core zod
```

## Exports

### Provider

| Export | Description |
|---|---|
| `DomOSProvider` | Provider principal — wraps l'app entière |
| `DomOSContext` | Context React sous-jacent |

### Hooks

| Export | Description |
|---|---|
| `useAgent` | État agent + envoi de messages |
| `useAgentTool` | Enregistre un tool dans un composant |
| `useAgentToolResolver` | Resolver centralisé multi-tools |
| `useNavigationTool` | Tool de navigation URL standard |
| `useViewStateTool` | Tool d'état UI standard |
| `useAgentContext` | Injecte du contexte passif |
| `useApproval` | Accès aux approbations HITL en attente |
| `useVoiceMode` | Microphone + streaming audio |

### Composants

| Export | Description |
|---|---|
| `AgentIndicator` | Badge d'état visuel |
| `ApprovalModal` | Modal HITL (risk `high` / `critical`) |
| `ApprovalBanner` | Bandeau HITL compact |
| `Notification` | Feedback temporaire (risk `low`) |
| `DomOSTool` | Wrapper tool sur élément existant |
| `DomOSToolBtn` | Bouton avec tool intégré |
| `ShadowContainer` | Isolation Shadow DOM |
| `DomOSWidget` | Widget chat complet |

### Utilitaires resolver

| Export | Description |
|---|---|
| `createResolverFromSwitch` | Convertit un switch case en resolver |
| `createCRUDResolver` | Helper pour opérations CRUD |

## Guides

- [Démarrage](./getting-started.md)
- [Hooks](./hooks.md)
- [Composants](./components.md)
- [Widget](./widget.md)
