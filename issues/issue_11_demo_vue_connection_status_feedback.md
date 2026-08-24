# Issue #11 : Feedback de connexion trompeur dans la démo Vue

**Statut** : 🟢 Résolu  
**Priorité** : 🟢 Mineur  
**Domaine** : vue  
**Porteur** : @BorisBob  
**Date** : 2026-04-01

---

## Résumé

La sidebar de `apps/demo-vue` affiche `Serveur inaccessible` dès que `state.isConnected === false`, y compris pendant l'état `connecting`.

L'utilisateur voit donc en même temps un feedback de tentative de connexion et un message d'échec, ce qui envoie un signal contradictoire sur l'état réel du client.

---

## Reproduction

### Conditions
- Version affectée : branche courante au 2026-04-01
- Environnement : Windows / pnpm workspace / app `demo-vue`
- Configuration : démo Vue démarrée avec un endpoint OwlLayer joignable mais pas encore connecté

### Scénario pas-à-pas

1. Ouvrir la démo Vue
2. Laisser le client entrer dans l'état `connecting`
3. Observer le bloc de statut dans la sidebar
4. → Bug observé : la sidebar affiche un statut de connexion en cours et `Serveur inaccessible` en parallèle

---

## Analyse technique

### Cause racine

Le composant `Sidebar.vue` conditionne le message d'erreur sur `!state.isConnected` au lieu de le conditionner sur un vrai état d'échec ou de déconnexion.

Or le plugin Vue définit `isConnected` à `true` uniquement pour `connected` et `listening`, donc `connecting` reste mécaniquement à `false` pendant une tentative de connexion normale.

```
Fichier : apps/demo-vue/src/components/Sidebar.vue
Ligne   : 21-28, 77
Code    : default: return state.agentState;
          <p v-if="!state.isConnected" class="mt-2 text-xs text-red-400">
            Serveur inaccessible
          </p>

Fichier : packages/vue/src/plugin/OwlLayerPlugin.ts
Ligne   : 152-156
Code    : state.agentState = newState;
          state.isConnected = newState === 'connected' || newState === 'listening';
```

### Pourquoi c'est un bug (et pas un comportement attendu)

`connecting` représente une transition normale, pas un échec. Afficher une erreur à ce moment-là produit un faux négatif visuel et dégrade la compréhension de l'état réseau par l'utilisateur.

---

## Solution

### Approche retenue

Corriger uniquement `Sidebar.vue` pour :

- afficher un libellé explicite pendant `connecting` ;
- réserver `Serveur inaccessible` aux états `error` et `disconnected` ;
- conserver la structure du composant sans refactor.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `issues/issue_11_demo_vue_connection_status_feedback.md` | Documentation du bug et du correctif | Faible |
| `apps/demo-vue/src/components/Sidebar.vue` | Correction ciblée du feedback de connexion | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `packages/vue/**`
- `packages/core/**`
- `packages/server/**`
- `packages/react/**`
- `packages/svelte/**`
- `packages/browser/**`
- les autres apps de démonstration
- les autres composants de `apps/demo-vue`

---

## Tests

- [ ] Test unitaire couvrant le bug
- [ ] Test d'intégration si applicable
- [x] `pnpm --filter demo-vue build` passe sur l'app affectée
- [ ] `pnpm test` ne régresse pas

Validation actuelle : le correctif ciblé est implémenté dans `apps/demo-vue/src/components/Sidebar.vue` et le build `pnpm --filter demo-vue build` passe (exit 0).