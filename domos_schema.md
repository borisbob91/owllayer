# Schémas d’architecture du SDK DomOS

## 1. Architecture globale du SDK

```mermaid
flowchart TD
  UI[UI (React/Vue/Svelte)] --> Client[DomOSClient]
  Client --> Registry[ToolRegistry]
  Client --> Context[ShadowContext]
  Client --> HITL[HITL Security]
  Client --> WS[WebSocket (ADTP)]
  WS --> Server[DomOSServer]
  Server --> LLM[LLM/Backend]
  Server --> HITLServer[HITL Security (Server)]
  Registry -->|Tools| Client
  Context -->|Sync| Server
  HITL -->|Approval| Client
  HITLServer -->|Approval| Server
```

## 2. Cycle de vie d’un tool

```mermaid
flowchart TD
  Component[Composant UI] --> Declaration[Déclaration useAgentTool]
  Declaration --> Registry[ToolRegistry]
  Registry --> Sync[Sync Serveur]
  Registry --> Handler[Handler Tool]
  Sync --> Remove[Suppression Tool]
  Remove --> Registry
  Registry -->|Diff| Sync
```

## 3. Workflow HITL

```mermaid
flowchart TD
  User[Utilisateur] --> ToolCall[Tool Call]
  ToolCall --> Risk[RiskLevel]
  Risk --> HITL[HITLPolicy]
  HITL --> Approval[Demande d’approbation]
  Approval --> User
  User --> Response[Réponse]
  Response --> HITL
  HITL --> Execute[Exécution Tool]
  Execute --> Result[Résultat]
  Result --> User
```

## 4. Synchronisation du contexte (ShadowContext)

```mermaid
flowchart TD
  UI[UI] --> Context[ShadowContext]
  Context --> Diff[ContextDiffResult]
  Diff --> Event[ContextChangeEvent]
  Event --> Client[DomOSClient]
  Client --> WS[WebSocket]
  WS --> Server[DomOSServer]
  Server --> Sync[Sync Context]
  Sync --> LLM[LLM]
  Sync --> HITL[HITL Security]
```

## 5. Séquence ADTP Protocol

```mermaid
sequenceDiagram
  participant Client as DomOSClient
  participant WS as WebSocket
  participant Server as DomOSServer
  Client->>WS: HANDSHAKE_INIT
  WS->>Server: HANDSHAKE_INIT
  Server->>WS: HANDSHAKE_ACK
  WS->>Client: HANDSHAKE_ACK
  Client->>WS: CONTEXT_UPDATE
  WS->>Server: CONTEXT_UPDATE
  Server->>WS: TOOL_CALL
  WS->>Client: TOOL_CALL
  Client->>WS: TOOL_RESULT
  WS->>Server: TOOL_RESULT
  Server->>WS: AGENT_RESPONSE
  WS->>Client: AGENT_RESPONSE
```

## 6. Carte des packages DomOS

```mermaid
flowchart TD
  Core[@domos/core]
  React[@domos/react]
  Vue[@domos/vue]
  Svelte[@domos/svelte]
  Server[@domos/server]
  AdapterGoogle[@domos/adapter-google]
  AdapterOpenAI[@domos/adapter-openai]
  Widget[DomOSWidget]
  Core --> React
  Core --> Vue
  Core --> Svelte
  Core --> Server
  Server --> AdapterGoogle
  Server --> AdapterOpenAI
  React --> Widget
  Vue --> Widget
  Svelte --> Widget
```

## 7. Shadow Context : Synchronisation UI <-> Serveur

```mermaid
flowchart TD
  UI[UI]
  Client[DomOSClient]
  Context[ShadowContext]
  Server[DomOSServer]
  LLM[LLM]
  UI --> Client
  Client --> Context
  Context --> Server
  Server --> LLM
  Server --> Context
  Context --> Client
  Client --> UI
  Context -- Diff --> Server
  Server -- Sync --> Context
```
