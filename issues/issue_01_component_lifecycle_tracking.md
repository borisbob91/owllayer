# Issue #01 : Component Lifecycle Tracking & Tool Call Race Conditions

**Statut** : 🟡 En cours  
**Priorité** : 🔴 Haute (robustesse framework)  
**Complexité** : Moyenne  
**Composants affectés** : `@owllayer/core`, `@owllayer/react`, `@owllayer/server`

---

## 📋 Description du problème

### Contexte

Dans OwlLayer, les tools sont enregistrés dynamiquement via `useAgentTool` et sont automatiquement retirés quand le composant se démonte. Cependant, **il existe une race condition critique** :

```tsx
function ProductCard({ product }) {
  useAgentTool({
    name: 'add_to_cart',
    description: 'Ajouter au panier',
  }, async ({ quantity }) => {
    await api.addToCart(product.id, quantity);  // Opération asynchrone
    return `${quantity}x ${product.name} ajouté`;
  });
  
  return <div>{product.name}</div>;
}
```

### Scénario problématique

```
T0 : Composant ProductCard monté
     → Tool "add_to_cart" enregistré
     
T1 : LLM demande TOOL_CALL "add_to_cart"
     → Serveur envoie TOOL_CALL au client
     
T2 : Message en transit via WebSocket
     
T3 : Utilisateur navigue → Composant démonte
     → Tool "add_to_cart" retiré du registre
     → CONTEXT_UPDATE envoyé au serveur (tools retirés)
     
T4 : TOOL_CALL arrive au client
     → Le handler n'existe plus
     → ❌ Error: Tool "add_to_cart" handler not found
```

### Impact

1. **Erreurs en production** : "Tool handler not found" lors de navigation rapide
2. **Expérience utilisateur dégradée** : actions qui échouent silencieusement
3. **Logs pollués** : erreurs "fantômes" difficiles à débuguer
4. **Perte de confiance** : l'IA semble "cassée" aux yeux de l'utilisateur

### Fréquence

- **Haute** en mode SPA avec navigation rapide
- **Critique** en React StrictMode (double mount/unmount)
- **Modérée** en mode vocal (latence audio + navigation)

---

## 🔍 Analyse technique

### Architecture actuelle

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│                                                              │
│  Component Mount                                             │
│       │                                                      │
│       ├──> useAgentTool()                                    │
│       │       │                                              │
│       │       ├──> registerTool({ declaration, handler })   │
│       │       │       │                                      │
│       │       │       └──> tools.set(name, { handler })     │
│       │       │                                              │
│       │       └──> sendContextUpdate()                       │
│       │                                                      │
│  Component Unmount                                           │
│       │                                                      │
│       └──> cleanup()                                         │
│               │                                              │
│               ├──> tools.delete(name)                        │
│               └──> sendContextUpdate()                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
         │                        │
         │    CONTEXT_UPDATE      │     TOOL_CALL
         ▼                        ▲
┌─────────────────────────────────────────────────────────────┐
│                         Server                               │
│                                                              │
│  SessionManager.updateContext()                              │
│       │                                                      │
│       └──> session.toolRegistry.sync(tools)                 │
│                                                              │
│  LLM.chat(messages, tools)                                   │
│       │                                                      │
│       └──> ToolRouter.route(toolName, args)                 │
│               │                                              │
│               └──> sendToClient(TOOL_CALL)                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Problèmes identifiés

1. **Pas de versioning des tools** : impossible de savoir si un TOOL_CALL est "stale"
2. **Pas de validation avant exécution** : le handler est appelé sans vérifier s'il existe encore
3. **Pas de graceful degradation** : l'erreur remonte brutalement au LLM
4. **Pas de dev warning** : difficile de débuguer en développement

---

## ✅ Solution proposée

### 1. Tool Lifecycle Versioning

Ajouter un système de versioning pour tracker le cycle de vie des tools.

#### Types (`@owllayer/core/src/tools/types.ts`)

```typescript
/**
 * Version de lifecycle d'un tool.
 * Incrémenté à chaque unmount/remount du composant.
 */
export interface ToolLifecycle {
  /** ID unique du composant propriétaire */
  componentId: string;
  
  /** Version du lifecycle (incrémenté à chaque mount) */
  version: number;
  
  /** Timestamp du dernier mount */
  mountedAt: number;
  
  /** true si le tool est actuellement monté */
  isActive: boolean;
}

/**
 * Tool avec métadonnées de lifecycle
 */
export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  risk: RiskLevel;
  componentId: string;
  handler: (args: any) => Promise<unknown>;
  lifecycle: ToolLifecycle;  // ← NOUVEAU
}

/**
 * TOOL_CALL payload étendu avec lifecycle
 */
export interface ToolCallPayload {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  lifecycleVersion?: number;  // ← NOUVEAU
}
```

### 2. Validation côté Client

Modifier `OwlLayerClient` pour valider le lifecycle avant d'exécuter un handler.

#### `@owllayer/core/src/client/OwlLayerClient.ts`

```typescript
private async handleToolCall(payload: ToolCallPayload): Promise<void> {
  const { callId, toolName, args, lifecycleVersion } = payload;
  
  const tool = this.tools.get(toolName);
  
  // 1. Vérifier que le tool existe
  if (!tool) {
    this.log(`⚠️  TOOL_CALL ignoré: tool "${toolName}" n'existe plus (démontage)`);
    
    // Envoyer un TOOL_RESULT avec erreur douce
    this.send(Messages.toolResult(callId, {
      ok: false,
      error: `Tool "${toolName}" is no longer available`,
      reason: 'component_unmounted',
      stale: true,
    }));
    
    // Warning en dev mode
    if (this.options.debug) {
      console.warn(
        `[OwlLayer] Tool call to "${toolName}" received after component unmount. ` +
        `This can happen during rapid navigation.`
      );
    }
    
    return;
  }
  
  // 2. Vérifier le lifecycle version (si fourni)
  if (lifecycleVersion !== undefined && tool.lifecycle.version !== lifecycleVersion) {
    this.log(
      `⚠️  TOOL_CALL stale: "${toolName}" v${lifecycleVersion} ` +
      `(actuel: v${tool.lifecycle.version})`
    );
    
    this.send(Messages.toolResult(callId, {
      ok: false,
      error: `Tool "${toolName}" version mismatch`,
      reason: 'stale_lifecycle',
      stale: true,
    }));
    
    return;
  }
  
  // 3. Vérifier que le tool est actif
  if (!tool.lifecycle.isActive) {
    this.log(`⚠️  TOOL_CALL ignoré: tool "${toolName}" est en cours de démontage`);
    
    this.send(Messages.toolResult(callId, {
      ok: false,
      error: `Tool "${toolName}" is unmounting`,
      reason: 'unmounting',
      stale: true,
    }));
    
    return;
  }
  
  // 4. Exécuter le handler (comme avant)
  try {
    // HITL approval si nécessaire...
    const result = await tool.handler(args);
    this.send(Messages.toolResult(callId, { ok: true, result }));
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    this.send(Messages.toolResult(callId, { ok: false, error }));
  }
}
```

### 3. Tracking du Lifecycle lors de mount/unmount

#### `@owllayer/core/src/client/OwlLayerClient.ts`

```typescript
private lifecycleVersions = new Map<string, number>();  // componentId → version

registerTool(tool: RegisteredTool): void {
  const { componentId } = tool;
  
  // Incrémenter la version du lifecycle
  const currentVersion = this.lifecycleVersions.get(componentId) || 0;
  const newVersion = currentVersion + 1;
  this.lifecycleVersions.set(componentId, newVersion);
  
  // Créer le tool avec lifecycle
  const toolDef: ToolDefinition = {
    ...tool.declaration,
    componentId,
    handler: tool.handler,
    lifecycle: {
      componentId,
      version: newVersion,
      mountedAt: Date.now(),
      isActive: true,
    },
  };
  
  this.tools.set(tool.declaration.name, toolDef);
  this.log(`Tool "${tool.declaration.name}" enregistré (lifecycle v${newVersion})`);
  
  this.scheduleContextUpdate();
}

unregisterTool(name: string): void {
  const tool = this.tools.get(name);
  if (!tool) return;
  
  // Marquer comme inactif avant de supprimer
  tool.lifecycle.isActive = false;
  
  // Délai de grace pour permettre aux tool calls en cours de se terminer
  setTimeout(() => {
    this.tools.delete(name);
    this.log(`Tool "${name}" supprimé après délai de grace`);
  }, 200);  // 200ms de grace period
  
  this.scheduleContextUpdate();
}

unregisterToolsByComponent(componentId: string): void {
  const removed: string[] = [];
  
  for (const [name, tool] of this.tools) {
    if (tool.componentId === componentId) {
      // Marquer comme inactif
      tool.lifecycle.isActive = false;
      removed.push(name);
    }
  }
  
  // Supprimer après délai de grace
  setTimeout(() => {
    for (const name of removed) {
      this.tools.delete(name);
    }
    this.log(`${removed.length} tool(s) supprimé(s) du composant ${componentId}`);
  }, 200);
  
  this.scheduleContextUpdate();
}
```

### 4. Propagation du Lifecycle Version côté Serveur

Modifier le `ToolRouter` pour inclure la version dans les TOOL_CALL.

#### `@owllayer/server/src/core/ToolRouter.ts`

```typescript
private executeClientTool(
  session: Session,
  callId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResultPayload> {
  return new Promise((resolve, reject) => {
    // Récupérer la version du lifecycle depuis le registre de la session
    const tool = session.toolRegistry.get(toolName);
    const lifecycleVersion = tool?.lifecycle?.version;
    
    // Envoyer le TOOL_CALL avec la version
    const message = Messages.toolCall(callId, toolName, args, lifecycleVersion);
    const sent = this.sendToClient(session.connId, message);
    
    if (!sent) {
      reject(new Error(`Impossible d'envoyer TOOL_CALL au client`));
      return;
    }
    
    const timeout = setTimeout(() => {
      this.pendingCalls.delete(callId);
      reject(new Error(`Tool "${toolName}" timeout après ${this.toolTimeoutMs}ms`));
    }, this.toolTimeoutMs);
    
    this.pendingCalls.set(callId, {
      callId,
      toolName,
      connId: session.connId,
      resolve,
      reject,
      timeout,
      sentAt: Date.now(),
    });
  });
}
```

### 5. Gestion Graceful des Stale Tool Results

Côté serveur, détecter les tool results "stale" et informer le LLM proprement.

#### `@owllayer/server/src/core/ToolRouter.ts`

```typescript
handleToolResult(result: ToolResultPayload): void {
  const pending = this.pendingCalls.get(result.callId);
  if (!pending) {
    log.warn(`TOOL_RESULT pour un call inconnu: ${result.callId}`);
    return;
  }
  
  clearTimeout(pending.timeout);
  this.pendingCalls.delete(result.callId);
  
  const duration = Date.now() - pending.sentAt;
  
  // Détecter les tool calls stale
  if (result.stale) {
    log.debug(
      `Tool call stale: ${pending.toolName} (${result.reason}) après ${duration}ms`
    );
    
    // Résoudre avec un résultat "graceful"
    pending.resolve({
      ...result,
      gracefulFallback: true,
      message: `L'action "${pending.toolName}" n'est plus disponible car l'interface a changé.`,
    });
  } else {
    log.debug(`Tool result reçu: ${pending.toolName} (${duration}ms)`);
    pending.resolve(result);
  }
}
```

### 6. Adaptation du LLM Adapter

Modifier les adapters LLM pour gérer les résultats "stale" gracefully.

#### `@owllayer/adapter-google/src/GoogleAdapter.ts`

```typescript
async chat(messages, tools, context, systemPrompt): Promise<LLMResponse> {
  // ... appel Gemini ...
  
  for (const toolCall of toolCalls) {
    try {
      const result = await toolRouter.route(session, toolCall.name, toolCall.args);
      
      // Si le tool est stale, ajuster le message au LLM
      if (result.stale || result.gracefulFallback) {
        results.push({
          callId: toolCall.id,
          result: {
            success: false,
            reason: 'Interface changed - tool no longer available',
            suggestion: 'Ask the user what they want to do or check current available actions',
          },
        });
      } else {
        results.push({ callId: toolCall.id, result });
      }
    } catch (err) {
      // ...
    }
  }
  
  return { text, toolResults: results };
}
```

---

## 🧪 Tests

### Test 1 : Tool call après unmount

```typescript
// @owllayer/core/tests/lifecycle.test.ts

test('Tool call après unmount retourne une erreur graceful', async () => {
  const client = new OwlLayerClient({ apiKey: 'test', endpoint: 'ws://...' });
  await client.connect();
  
  // Enregistrer un tool
  const mockHandler = vi.fn().mockResolvedValue({ ok: true });
  client.registerTool({
    declaration: { name: 'test_tool', description: 'Test' },
    handler: mockHandler,
    componentId: 'comp-1',
  });
  
  // Supprimer le tool (simulate unmount)
  client.unregisterTool('test_tool');
  
  // Simuler un TOOL_CALL qui arrive après unmount
  client.handleMessage({
    type: 'TOOL_CALL',
    payload: { callId: 'call-1', toolName: 'test_tool', args: {} },
  });
  
  // Le handler ne doit PAS être appelé
  expect(mockHandler).not.toHaveBeenCalled();
  
  // Un TOOL_RESULT avec stale=true doit être envoyé
  const sentMessage = mockWs.send.mock.calls[0][0];
  expect(JSON.parse(sentMessage)).toMatchObject({
    type: 'TOOL_RESULT',
    payload: {
      callId: 'call-1',
      ok: false,
      stale: true,
      reason: 'component_unmounted',
    },
  });
});
```

### Test 2 : Lifecycle version mismatch

```typescript
test('Tool call avec version stale est rejeté', async () => {
  const client = new OwlLayerClient({ apiKey: 'test', endpoint: 'ws://...' });
  
  // Mount v1
  client.registerTool({
    declaration: { name: 'action', description: 'Action' },
    handler: vi.fn(),
    componentId: 'comp-1',
  });
  
  // Unmount puis remount (v2)
  client.unregisterTool('action');
  await wait(250); // attendre grace period
  
  client.registerTool({
    declaration: { name: 'action', description: 'Action v2' },
    handler: vi.fn(),
    componentId: 'comp-1',
  });
  
  // Simuler un TOOL_CALL avec lifecycle v1 (stale)
  client.handleMessage({
    type: 'TOOL_CALL',
    payload: {
      callId: 'call-1',
      toolName: 'action',
      args: {},
      lifecycleVersion: 1,  // ← version stale
    },
  });
  
  // Le handler ne doit pas être appelé
  const sentMessage = mockWs.send.mock.calls[0][0];
  expect(JSON.parse(sentMessage).payload.reason).toBe('stale_lifecycle');
});
```

### Test 3 : Grace period permet tool calls en cours

```typescript
test('Grace period permet aux tool calls en cours de se terminer', async () => {
  const client = new OwlLayerClient({ apiKey: 'test', endpoint: 'ws://...' });
  
  const slowHandler = vi.fn().mockImplementation(async () => {
    await wait(100);  // handler lent
    return { ok: true };
  });
  
  client.registerTool({
    declaration: { name: 'slow_action', description: 'Slow' },
    handler: slowHandler,
    componentId: 'comp-1',
  });
  
  // Démarrer un tool call
  const callPromise = client.handleMessage({
    type: 'TOOL_CALL',
    payload: { callId: 'call-1', toolName: 'slow_action', args: {} },
  });
  
  // Unmount pendant l'exécution
  await wait(50);
  client.unregisterTool('slow_action');
  
  // Le handler devrait quand même se terminer
  await callPromise;
  expect(slowHandler).toHaveBeenCalled();
});
```

---

## 📊 Métriques de succès

1. **Zéro erreur** "Tool handler not found" en production
2. **Warnings clairs** en dev mode pour aider le debug
3. **Graceful degradation** : l'IA informe l'utilisateur au lieu de crasher
4. **Tests passants** : 100% de couverture sur les cas edge

---

## 🚀 Plan d'implémentation

### Phase 1 : Core Infrastructure (2-3h)
- [ ] Ajouter `ToolLifecycle` types dans `@owllayer/core`
- [ ] Implémenter versioning dans `OwlLayerClient.registerTool/unregisterTool`
- [ ] Ajouter validation dans `handleToolCall`
- [ ] Implémenter le grace period (200ms)

### Phase 2 : Server Integration (1-2h)
- [ ] Modifier `ToolRouter.executeClientTool` pour passer `lifecycleVersion`
- [ ] Ajouter détection des stale results dans `handleToolResult`
- [ ] Adapter le `Messages.toolCall` pour inclure `lifecycleVersion`

### Phase 3 : LLM Adapters (1h)
- [ ] Modifier `GoogleAdapter` pour gérer les stale results
- [ ] Modifier `OpenAIAdapter` (si existe) pour gérer les stale results

### Phase 4 : Tests (2h)
- [ ] Tests unitaires du lifecycle tracking
- [ ] Tests d'intégration tool call stale
- [ ] Tests du grace period

### Phase 5 : Dev Experience (1h)
- [ ] Ajouter warnings en dev mode
- [ ] Documentation des patterns à éviter
- [ ] Exemples dans le README

**Total estimé : 7-9h**

---

## 📝 Notes d'implémentation

### Considérations importantes

1. **Grace period** : 200ms est un compromis entre sécurité et UX. Trop court = tool calls interrompus, trop long = mémoire leak.

2. **Dev mode warnings** : Utiliser `console.warn` avec un préfixe `[OwlLayer]` distinctif pour faciliter le debug.

3. **Backward compatibility** : Le champ `lifecycleVersion` doit être optionnel pour ne pas casser les clients existants.

4. **Performance** : Le versioning n'ajoute qu'un `Map` d'une dizaine d'entrées max → impact négligeable.

### Patterns à documenter

```tsx
// ❌ MAUVAIS : Tool avec effet de bord synchrone
useAgentTool({
  name: 'set_filter'
}, async ({ value }) => {
  setFilter(value);  // State mutation synchrone
  return { ok: true };
});

// ✅ BON : Vérifier que le composant est toujours monté
useAgentTool({
  name: 'set_filter'
}, async ({ value }) => {
  if (!isMountedRef.current) {
    return { ok: false, reason: 'Component unmounted' };
  }
  setFilter(value);
  return { ok: true };
});

// ✅ MEILLEUR : Utiliser un AbortController
useAgentTool({
  name: 'fetch_data'
}, async ({ id }, { signal }) => {
  const data = await fetch(`/api/data/${id}`, { signal });
  return data.json();
});
```

---

## 🔗 Références

- [React useEffect cleanup](https://react.dev/learn/synchronizing-with-effects#step-3-add-cleanup-if-needed)
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [WebSocket message ordering](https://datatracker.ietf.org/doc/html/rfc6455#section-5.1)

---

**Auteur** : GitHub Copilot (Claude Sonnet 4.5)  
**Date** : 12 février 2026  
**Dernière mise à jour** : 12 février 2026
