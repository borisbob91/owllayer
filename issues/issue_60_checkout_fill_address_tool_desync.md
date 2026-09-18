# Issue #60 : fill_address non disponible sur la page checkout (Tool Desync)

**Statut**: 🔴 En cours d'analyse
**Priorité**: 🔴 Critical / UX
**Date**: 17 Septembre 2026
**Domaine**: `core` (OwlLayerClient) + `react` (OwlLayerProvider) — correction séquentielle
**Reproductible**: Oui — systématique via navigation agent (`go_to_checkout` ou `navigate`)

---

## 📋 Résumé

Sur la démo React (`apps/demo-react`) connectée au serveur DeepSeek (`apps/demo-server-deepseek`), l'agent est incapable d'appeler `fill_address` sur `/checkout`. Le LLM voit les tools de la page d'accueil (`search_products`, `filter_by_category`, `clear_filters`) au lieu des tools checkout (`fill_address`, `select_shipping`, `select_payment`, `set_checkout_step`, `confirm_checkout`).

**Message agent :**
> "no form-filling tool is actually exposed in my available tool list right now. The tools I can call are limited to catalog/cart/wishlist/scroll/navigation actions"

---

## 🔍 Cause racine confirmée

Deux problèmes distincts mais complémentaires :

### Problème 1 : Race condition — `handleToolResult` sans tools (OpenAIAdapter)

Quand le LLM appelle `go_to_checkout` (ou `navigate` vers `/checkout`) :

1. Le serveur envoie `TOOL_CALL` au client
2. Le client exécute `navigate('/checkout')` → retourne le résultat immédiatement
3. Le client envoie `TOOL_RESULT` au serveur
4. **Le serveur appelle `llm.handleToolResult(callId, result)` IMMÉDIATEMENT**
5. React n'a pas encore re-rendu → `CONTEXT_UPDATE` avec les nouveaux tools n'est pas encore arrivé

**Le problème critique est dans `OpenAIAdapter.handleToolResult()` (ligne 214) :**

```ts
// handleToolResult ne renvoie PAS les tools au LLM !
const response = await this.client.chat.completions.create({
  model: this.model,
  messages,           // ✅ messages reconstruits
  temperature: ...,
  // ❌ PAS DE tools: ... !!!
});
```

Comparé à `chat()` (ligne 137-148) qui passe bien les tools :

```ts
const response = await this.client.chat.completions.create({
  model: this.model,
  messages,
  tools: tools as any,  // ✅ les tools sont passés
  temperature: ...,
});
```

**Résultat** : même si le serveur avait les bons tools au moment du follow-up, le LLM ne les verrait pas car `handleToolResult` ne les transmet jamais.

### Problème 2 : `popstate` ne détecte pas la navigation React Router

Dans `OwlLayerProvider.tsx` (ligne 241-253) :

```ts
// Sync context quand l'URL change
useEffect(() => {
  const handlePopState = () => {
    if (client.isConnected) {
      client.syncToolsWithServer();
    }
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [client]);
```

`popstate` ne se déclenche que sur les boutons back/forward du navigateur. **Toute navigation programmatique via React Router (`navigate()`, `<Link>`, `useNavigate()`) utilise `history.pushState()` qui ne déclenche PAS `popstate`.**

Cela signifie que lorsque l'utilisateur clique sur un lien ou que l'agent navigue, le Provider ne fait pas de `syncToolsWithServer()` additionnel. Les tools sont quand même synchronisés par `useAgentTool` (register/unregister au mount/unmount), mais sans synchronisation explicite au changement de route, le Provider ne peut pas garantir un sync consolidé.

---

## 🏗️ Flux détaillé du bug

### Scénario A : Navigation via tool agent (`go_to_checkout`)

```
Utilisateur → "Mon adresse c'est John Smith, 52 rue du Prince, Paris 56000"

1. Server → LLM.chat(tools=[navigate, go_to_checkout, add_to_cart, ...])
   Le LLM décide d'appeler go_to_checkout

2. Server → processLLMResponse → toolRouter.route("go_to_checkout", {})
   → TOOL_CALL envoyé au client

3. Client : execute go_to_checkout handler
   → navigate('/checkout')    ← synchrone, mais React batch le re-render
   → return { success: true } ← immédiat

4. Client → OwlLayerClient.handleToolCall → send TOOL_RESULT

5. Server → toolRouter.handleToolResult → resolve promise
   → llm.handleToolResult(callId, result)
   → OpenAI API call SANS tools ← ❌ BUG #1
   Le LLM ne peut plus appeler aucun tool, il répond en texte pur

6. Pendant ce temps : React re-render HomePage→CheckoutPage
   → unregister search_products → CONTEXT_UPDATE
   → register fill_address → CONTEXT_UPDATE
   ... trop tard, le LLM a déjà répondu
```

### Scénario B : Navigation manuelle + nouveau message

Si l'utilisateur navigue manuellement et envoie un NOUVEAU message, le flux DEVRAIT fonctionner car `handleTextInput` refetch les tools. Mais si la session a gardé des tools obsolètes en cache (pas de sync consolidé), le même problème peut survenir.

---

## ✅ Corrections proposées

### Fix 1 (core) — `handleToolResult` doit re-recevoir les tools à jour

Le `processLLMResponse` du serveur doit passer les tools actualisés à `handleToolResult` pour que l'adapter les inclue dans le follow-up LLM call.

**Fichier** : `packages/adapter-openai/src/OpenAIAdapter.ts`  
**Change** : `handleToolResult` doit accepter un paramètre `tools` optionnel et les passer à l'API OpenAI.

**Fichier** : `packages/core/src/voice/contracts.ts` (interface `LLMAdapter`)  
**Change** : Mise à jour de la signature `handleToolResult`.

**Fichier** : `packages/server/src/core/OwlLayerServer.ts`  
**Change** : `processLLMResponse` doit re-fetcher `getAvailableToolDeclarations(session)` et les passer à `handleToolResult`.

### Fix 2 (react) — Écouter les changements de route React Router

**Fichier** : `packages/react/src/provider/OwlLayerProvider.tsx`  
**Change** : Ajouter un `useEffect` qui appelle `client.syncToolsWithServer()` quand le `pathname` change (via `useLocation` de react-router-dom ou via un callback onNavigate). Cela garantit un sync consolidé après chaque navigation.

---

## 🎯 Périmètre autorisé

- `packages/core/src/voice/contracts.ts` — signature LLMAdapter
- `packages/core/src/voice/BaseLLMAdapter.ts` — si nécessaire
- `packages/adapter-openai/src/OpenAIAdapter.ts` — handleToolResult + tools
- `packages/server/src/core/OwlLayerServer.ts` — passer tools dans handleToolResult
- `packages/react/src/provider/OwlLayerProvider.tsx` — sync route

## ⛔ Hors périmètre

- Aucun changement dans `apps/demo-react/` ou `apps/demo-server-deepseek/`
- Aucun renommage, refactoring, ajout de dépendance
