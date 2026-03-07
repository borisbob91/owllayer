# Protocole ADTP

**Agent-to-DOM Transfer Protocol** — Specification du protocole de communication entre le client et le serveur DomOS.

## Vue d'ensemble

ADTP est un protocole JSON sur WebSocket qui definit la communication entre :
- Le **client** (navigateur — React, Vue, ou DomOSClient brut)
- Le **serveur** (DomOSServer — orchestrateur LLM)

Chaque message suit la structure :

```json
{
  "type": "MESSAGE_TYPE",
  "payload": { ... },
  "meta": {
    "id": "msg_uuid",
    "timestamp": 1706000000000,
    "version": "1.0.0"
  }
}
```

## Types de messages

### 1. HANDSHAKE_INIT (Client → Serveur)

Initialise la connexion. Envoye immediatement apres l'ouverture du WebSocket.

```json
{
  "type": "HANDSHAKE_INIT",
  "payload": {
    "protocolVersion": "1.0.0",
    "capabilities": ["text", "audio", "tools"]
  }
}
```

### 2. HANDSHAKE_ACK (Serveur → Client)

Confirme la connexion et fournit l'ID de session.

```json
{
  "type": "HANDSHAKE_ACK",
  "payload": {
    "sessionId": "ses_abc123",
    "protocolVersion": "1.0.0",
    "capabilities": ["text", "audio", "tools"]
  }
}
```

### 3. CONTEXT_UPDATE (Client → Serveur)

Envoye quand :
- Un tool est enregistre ou desenregistre (`useAgentTool` mount/unmount)
- Le contexte change (`useAgentContext` update)
- L'URL change (navigation SPA)
- Au demarrage apres le handshake (sync initiale)

```json
{
  "type": "CONTEXT_UPDATE",
  "payload": {
    "url": "/product/casque-bt-pro",
    "title": "Casque Bluetooth Pro - Boutique",
    "activeTools": [
      {
        "name": "add_to_cart",
        "description": "Ajouter le Casque Bluetooth Pro au panier",
        "parameters": {
          "type": "object",
          "properties": {
            "quantity": {
              "type": "number",
              "description": "Quantite (1-10)"
            }
          },
          "required": ["quantity"]
        }
      }
    ],
    "data": {
      "page": "product_detail",
      "productId": "casque-bt-pro",
      "productPrice": 149.99,
      "productStock": 15
    }
  }
}
```

**C'est ce message qui permet au serveur de connaitre les tools du client.**

### 4. USER_INPUT (Client → Serveur)

Message de l'utilisateur (texte ou audio).

```json
// Texte
{
  "type": "USER_INPUT",
  "payload": {
    "modality": "text",
    "content": "Ajoute 2 casques au panier"
  }
}

// Audio
{
  "type": "USER_INPUT",
  "payload": {
    "modality": "audio",
    "content": "base64_pcm_data...",
    "mimeType": "audio/pcm;rate=16000"
  }
}
```

### 5. TOOL_CALL (Serveur → Client)

Le LLM demande l'execution d'un tool cote client.

```json
{
  "type": "TOOL_CALL",
  "payload": {
    "callId": "tc_xyz789",
    "name": "add_to_cart",
    "args": {
      "quantity": 2
    }
  }
}
```

### 6. TOOL_RESULT (Client → Serveur)

Resultat de l'execution du tool.

```json
{
  "type": "TOOL_RESULT",
  "payload": {
    "callId": "tc_xyz789",
    "result": "2x Casque Bluetooth Pro ajoute au panier",
    "status": "success"
  }
}

// En cas d'erreur
{
  "type": "TOOL_RESULT",
  "payload": {
    "callId": "tc_xyz789",
    "result": null,
    "status": "error",
    "error": "Stock insuffisant"
  }
}
```

### 7. AGENT_RESPONSE (Serveur → Client)

Reponse textuelle du LLM.

```json
{
  "type": "AGENT_RESPONSE",
  "payload": {
    "chunk": "J'ai ajoute 2 Casques Bluetooth Pro a votre panier !",
    "done": true
  }
}
```

En mode streaming, plusieurs messages sont envoyes avec `done: false`, puis un dernier avec `done: true`.

### 8. SYSTEM_EVENT (Bidirectionnel)

Evenements systeme (erreurs, notifications, etc.).

```json
{
  "type": "SYSTEM_EVENT",
  "payload": {
    "kind": "error",
    "message": "Rate limit depasse"
  }
}
```

Kinds possibles : `error`, `warning`, `info`, `disconnect`.

## Diagramme de sequence

```
Client                              Serveur                          LLM
  │                                    │                               │
  │── HANDSHAKE_INIT ─────────────────>│                               │
  │<───────────────── HANDSHAKE_ACK ───│                               │
  │                                    │                               │
  │── CONTEXT_UPDATE (tools + ctx) ──>│  ← Sync initiale              │
  │                                    │   tools enregistres           │
  │                                    │                               │
  │── USER_INPUT ("Ajoute au panier")─>│                               │
  │                                    │── chat(msg, tools, ctx) ─────>│
  │                                    │<────── toolCall: add_to_cart ──│
  │<──────── TOOL_CALL (add_to_cart) ──│                               │
  │                                    │                               │
  │  [execute handler local]           │                               │
  │                                    │                               │
  │── TOOL_RESULT (success) ──────────>│                               │
  │                                    │── handleToolResult ──────────>│
  │                                    │<────── "Ajoute au panier !" ──│
  │<──────── AGENT_RESPONSE ───────────│                               │
  │                                    │                               │
  │── CONTEXT_UPDATE (tool unmount) ──>│  ← Navigation autre page      │
  │                                    │   tools mis a jour            │
```

## Validation

Tous les messages sont valides avec des schemas Zod dans `@domos/core` :

```ts
import { validateMessage } from '@domos/core';

const result = validateMessage(rawMessage);
if (!result.valid) {
  console.error('Message invalide:', result.errors);
}
```

## Constantes

```ts
import { ADTP_VERSION, DEFAULTS, ErrorCode } from '@domos/core';

ADTP_VERSION     // "1.0.0"
DEFAULTS.TIMEOUT // 30000 (ms)
ErrorCode.UNAUTHORIZED // "UNAUTHORIZED"
```
