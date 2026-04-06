# Issue #13 : Faux état `Erreur / Serveur inaccessible` dans la sidebar réduite de la démo Vue

**Statut** : 🔴 Ouvert  
**Priorité** : 🟡 Majeur  
**Domaine** : vue  
**Porteur** : @BorisBob  
**Date** : 2026-04-01  

---

## Résumé

La sidebar réduite de la démo Vue peut afficher un faux état critique `Erreur` puis `Serveur inaccessible` alors que l’agent continue de fonctionner et que la session reste exploitable.

Cette issue est distincte de [domos/issues/issue_11_demo_vue_connection_status_feedback.md](domos/issues/issue_11_demo_vue_connection_status_feedback.md), qui ne couvre que le message trompeur pendant `connecting`. Ici, le problème visé est une dérivation d’état trop agressive côté plugin Vue, qui écrase l’état agent et la connectivité réelle au moment d’un `system event`.

---

## Reproduction

### Conditions

- Version affectée : branche courante au 2026-04-01
- Environnement : Windows / pnpm workspace / app `demo-vue`
- Configuration : serveur DomOS joignable, agent fonctionnel, démo Vue affichant la sidebar réduite

### Scénario pas-à-pas

1. Ouvrir la démo Vue avec un endpoint DomOS valide.
2. Attendre que l’agent atteigne un état opérationnel (`connected`, `listening`, `thinking` ou `speaking`).
3. Laisser le client recevoir un `system event` sans rupture effective de la session agent.
4. Observer la zone de statut réduite dans la sidebar.
5. Relancer une interaction avec l’agent.
6. → Bug observé : la sidebar affiche `Erreur` ou `Serveur inaccessible` alors que l’agent continue à répondre et que la session reste active.

---

## Analyse technique

### Cause racine

Le problème principal n’est pas un mauvais abonnement de la sidebar. La dérivation fautive est portée par le plugin Vue, qui transforme trop tôt un `system event` en état agent fatal et en déconnexion visuelle.

Fichier principal concerné : [domos/packages/vue/src/plugin/DomOSPlugin.ts](domos/packages/vue/src/plugin/DomOSPlugin.ts#L175-L178)

```ts
onSystemEvent: (kind: string, message?: string) => {
  console.error(`[DomOS] System event: ${kind}${message ? ' — ' + message : ''}`);
  state.agentState = 'error' as any;
  state.isConnected = false;
},
```

Cette logique écrase deux informations différentes :

- l’état réel de l’agent
- l’état réel de connectivité

La sidebar Vue consomme ensuite cet état déjà dégradé pour afficher le feedback réduit.

Calcul du feedback réduit : [domos/apps/demo-vue/src/components/Sidebar.vue](domos/apps/demo-vue/src/components/Sidebar.vue#L34-L46)  
Rendu du feedback réduit : [domos/apps/demo-vue/src/components/Sidebar.vue](domos/apps/demo-vue/src/components/Sidebar.vue#L97-L98)

```ts
const connectionFeedback = computed(() => {
  switch (state.agentState) {
    case 'connecting':
      return {
        label: 'Connexion au serveur…',
        textColor: 'text-amber-400',
      };
    case 'error':
    case 'disconnected':
      return {
        label: 'Serveur inaccessible',
        textColor: 'text-red-400',
      };
    default:
      return null;
  }
});
```

Référence de comportement alignée côté React : [domos/packages/react/src/provider/DomOSProvider.tsx](domos/packages/react/src/provider/DomOSProvider.tsx#L152-L155)

```tsx
onSystemEvent: (kind: string, message?: string) => {
  if (kind === 'error') {
    log.error('Agent error:', message ?? '');
    setAgentError(message ?? 'Erreur inconnue');
  }
},
```

La référence React conserve l’erreur séparée du `agentState`. Elle ne force pas `isConnected = false` sur simple réception d’un `system event`.

### Pourquoi c’est un bug (et pas un comportement attendu)

`onSystemEvent` n’est pas synonyme de perte de connexion ni d’arrêt de l’agent. En Vue, la logique actuelle fusionne :

- un signal diagnostic
- un état agent
- un état de connectivité

Cette fusion produit un faux négatif UI : la sidebar réduite annonce un serveur inaccessible alors que le transport réel et la capacité de réponse de l’agent sont encore valides.

Le bug est donc double :

- dérivation d’état trop agressive dans le plugin Vue
- rendu réduit trop dépendant de cet état fusionné

Le périmètre reste strictement `vue`. Aucun changement `core`, `react`, `devtools` ou multi-domaines n’est requis pour traiter ce cas.

---

## Solution

### Approche retenue

**AVANT**

Le plugin Vue traite un `system event` comme un basculement immédiat vers un état agent fatal et une déconnexion UI. La sidebar réduite reflète ensuite cet état dégradé sans distinction entre erreur diagnostic et indisponibilité réelle du serveur.

**APRÈS**

Le plugin Vue doit conserver séparément :

- l’état agent réel
- la connectivité réelle
- le diagnostic d’erreur système éventuel

La sidebar réduite doit rester alignée avec l’exemple React :

- ne pas afficher `Serveur inaccessible` tant que la connectivité réelle n’est pas perdue
- ne pas transformer automatiquement toute erreur système en état agent `error`
- continuer à exposer un feedback utile sans casser les états existants (`connecting`, `thinking`, `speaking`, `listening`, `connected`, `disconnected`)

**POURQUOI**

Le rendu réduit doit informer correctement sans introduire de faux état critique. L’objectif est de restaurer une lecture fiable du statut Vue tout en restant cohérent avec la référence React et sans régression fonctionnelle.

### Codes d’erreur stables

Aucun nouveau code d’erreur stable n’est introduit. Cette issue porte sur la dérivation d’état et le rendu UI du domaine Vue, pas sur une évolution du protocole ADTP.

### Fichiers qui seront modifiés

| Fichier | AVANT | APRÈS | POURQUOI | Risque |
|---|---|---|---|---|
| [domos/packages/vue/src/plugin/DomOSPlugin.ts](domos/packages/vue/src/plugin/DomOSPlugin.ts) | `onSystemEvent` force `agentState = 'error'` et `isConnected = false` | conserver l’erreur système séparée de l’état agent et de la connectivité | éviter un faux basculement fatal côté Vue | Moyen |
| [domos/apps/demo-vue/src/components/Sidebar.vue](domos/apps/demo-vue/src/components/Sidebar.vue) | le rendu réduit affiche un feedback critique depuis un état déjà fusionné | afficher un statut réduit basé sur la connexion réelle et un diagnostic non bloquant si pertinent | éviter `Serveur inaccessible` quand l’agent répond encore | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- le domaine `core`
- le SDK React
- les DevTools
- les autres apps de démonstration
- la logique des autres domaines `svelte`, `browser`, `server`, `shopify`, `woocommerce`
- le périmètre de [domos/issues/issue_11_demo_vue_connection_status_feedback.md](domos/issues/issue_11_demo_vue_connection_status_feedback.md), qui reste limité au faux message pendant `connecting`

---

## Tests

- [ ] Validation manuelle : un `system event` non fatal ne fait plus apparaître `Serveur inaccessible` si l’agent continue à fonctionner
- [ ] Validation manuelle : une vraie perte de connexion continue d’afficher un état d’échec explicite dans la sidebar réduite
- [ ] Validation manuelle : le comportement corrigé par [domos/issues/issue_11_demo_vue_connection_status_feedback.md](domos/issues/issue_11_demo_vue_connection_status_feedback.md) reste intact pendant `connecting`
- [ ] Validation manuelle : les états existants `thinking`, `speaking`, `listening` et `connected` restent lisibles dans le rendu réduit
- [ ] `pnpm --filter @domos/vue build` passe
- [ ] `pnpm --filter demo-vue build` passe
- [ ] `pnpm test` ne régresse pas