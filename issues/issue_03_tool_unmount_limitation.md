# Issue #03 : Limitation du Démontage des Tools (Tool Unmount Limitation)

**Statut**: ✅ COMPLETED (React, Vue, Svelte)  
**Priorité**: 🔴 Critical / Architecture  
**Date**: 5 Mars 2026  
**Catégorie**: Lifecycle, Architecture Globale, Multi-Framework

---

## 📋 Résumé

Dans l'architecture actuelle de OwlLayer, les outils (tools) déclarés via les hooks/composables (ex: `useAgent`) sont étroitement couplés au cycle de vie des composants qui les enregistrent.

Lorsqu'un composant est démonté (unmount) — par exemple, lors d'un changement de page via le routeur — ses outils associés sont automatiquement désenregistrés par le cleanup (`onDestroy`, `onUnmounted`, `useEffect cleanup`). 
Cela provoque une perte soudaine de capacités pour l'agent IA : s'il essaie d'exécuter une navigation vers `/cart` alors que l'outil de navigation a été démonté, la requête échoue.

---

## 🎯 Problème résolu

### Le comportement problématique

**Exemple de flux en erreur :**
1. L'utilisateur est sur la `HomePage`. Le composant monte et enregistre le tool `navigate_to`.
2. L'utilisateur clique physiquement sur un lien pour aller sur `ProductPage`.
3. `HomePage` se démonte : OwlLayerClient reçoit l'ordre de désenregistrer `navigate_to`.
4. L'utilisateur dit à voix haute : "Retourne à l'accueil".
5. ❌ L'IA ne trouve plus de tool `navigate_to` et renvoie une erreur ou une réponse d'incompréhension.

### La solution : Extension Native `globalTools`

Nous avons créé un pont direct entre l'initialisation du framework (le Provider / Plugin) et le `OwlLayerCore`. Tous les outils définis dans la branche "globale" reçoivent un `componentId` interne de sécurité (`global-provider`) qui empêche le nettoyage lors du changement de composant React/Vue/Svelte.

---

## 🏗️ Implémentation & Patch par Framework

### 1. React (`@owllayer/react`) - ✅ Implémenté

Ajout de la propriété `globalTools` directement dans le `OwlLayerProvider`. Ces outils sont enregistrés juste après la création du client WebSocket.

```tsx
// App.tsx
import { OwlLayerProvider } from '@owllayer/react';

const GLOBAL_TOOLS = [
  {
    declaration: { name: 'navigate_to', /* ... */ },
    handler: async (args) => { /* navigation logic */ }
  }
];

export default function App() {
  return (
    // Les tools globaux sont protégés du dé-montage des routes
    <OwlLayerProvider apiKey="..." endpoint="..." globalTools={GLOBAL_TOOLS}>
      <Router>
        <Routes>...</Routes>
      </Router>
    </OwlLayerProvider>
  );
}
```

### 2. Vue (`@owllayer/vue`) - ✅ Implémenté

Dans Vue, l'initialisation de OwlLayer se fait typiquement via un plugin (ex: `OwlLayerPlugin`).

**Évolution :**
Modification de `OwlLayerPluginOptions` et de la fonction d'installation pour accepter `globalTools`.

```ts
// main.ts
import { createApp } from 'vue';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(OwlLayerPlugin, {
  apiKey: import.meta.env.VITE_OWLLAYER_API_KEY,
  endpoint: import.meta.env.VITE_OWLLAYER_ENDPOINT,
  // 👈 NOUVEAU: Tools persistants au niveau de l'App Vue
  globalTools: [
    {
      declaration: { name: 'navigate_to', description: '...' },
      handler: async (args) => { router.push({ name: args.page }); }
    }
  ]
});

app.mount('#root');
```

### 3. Svelte (`@owllayer/svelte`) - ✅ Implémenté

Dans Svelte, l'initialisation de OwlLayer se fait via la fonction `initOwlLayer` appelée au niveau Racine/Layout.

**Évolution :**
Création de `OwlLayerInitOptions` pour remplacer `OwlLayerClientOptions` et prise en charge de `globalTools`.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { initOwlLayer } from '@owllayer/svelte';
  import { goto } from '$app/navigation';

  const globalTools = [
    {
      declaration: { name: 'navigate_to', description: '...' },
      handler: async (args) => { await goto('/' + args.page); }
    }
  ];

  // 👈 NOUVEAU: Injection dans le contexte global
  initOwlLayer({
    apiKey: import.meta.env.VITE_OWLLAYER_API_KEY,
    endpoint: import.meta.env.VITE_OWLLAYER_ENDPOINT,
    globalTools
  });
</script>

<slot />
```

---

## 🔑 Décisions architecturales

- **Séparation sémantique** : Les composants doivent continuer à utiliser `useAgent` / `agentTool` pour les outils purement liés à l'UI visible (ex: `scroll_to_element`, `highlight_input`).
- **Tools Métier** : Les outils qui modifient un store persistant (Panier, Auth, Navigation) DOIVENT être inscrits dans les `globalTools` afin de rester disponibles pour l'Agent, indépendamment de la page affichée à l'écran.
- **Protection Core** : Côté `@owllayer/core`, on utilise un `componentId` réservé (`'global-provider'`) qui est ignoré par les fonctions de type `unregisterToolsByComponent()`.

---

**Cible d'intégration** : React (`v0.2.x`), Vue (`v0.2.x`), Svelte (`v0.2.x`).
