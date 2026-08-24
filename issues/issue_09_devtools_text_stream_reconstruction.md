# Issue #09 : Le monitor DevTools fragmente les flux textuels en deltas illisibles

**Statut** : 🟢 Résolu  
**Priorité** : 🟡 Majeur  
**Domaine** : ui  
**Porteur** : @BorisBob  
**Date** : 2026-04-01

---

## Résumé

Le monitor du DevTools embarqué affiche chaque `agent.response.delta` comme une ligne indépendante dans l'historique. Le résultat côté utilisateur est un flux illisible du type `assistantOui, je` puis `assistant t'écoute.` ou `user L'` puis `useradresse`.

Le DevTools doit conserver l'historique des événements non textuels, mais reconstruire les flux textuels en messages cohérents par rôle pour rester exploitable en debug.

---

## Reproduction

### Conditions
- Version affectée : branche courante au 2026-04-01
- Environnement : Windows / pnpm workspace / DevTools embarqué `@owllayer/ui`
- Configuration : bridge exposant `subscribeAnyEvent` avec événements canoniques client

### Scénario pas-à-pas

1. Ouvrir le DevTools embarqué et aller dans l'onglet monitor
2. Déclencher une interaction vocale ou texte qui produit plusieurs chunks de réponse agent
3. Observer la liste des événements textuels
4. → Bug observé : chaque delta apparaît comme une entrée distincte au lieu d'un message consolidé

---

## Analyse technique

### Cause racine

`StateMonitor` ajoute chaque événement reçu dans `events[]` avec un résumé direct, sans distinguer les événements textuels streamés des événements non textuels.

```
Fichier : packages/ui/src/devtools/StateMonitor.tsx
Ligne   : 53-55, 133-134
Code    : summary: describeEvent(event)
          setEvents((previous) => [...previous.slice(-24), next]);
          case 'agent.response.delta':
          case 'agent.response.done':
```

### Pourquoi c'est un bug (et pas un comportement attendu)

Le DevTools est censé aider à lire l'état d'un tour. Afficher chaque fragment de texte comme un événement autonome rend le monitor trompeur sur la structure réelle de la conversation, alors que le flux applicatif correspond à un seul message progressif.

---

## Solution

### Approche retenue

Conserver la liste brute uniquement pour les événements non textuels, puis introduire dans `StateMonitor` une vue conversationnelle locale qui agrège les deltas textuels par rôle et flux actif. `agent.response.delta` et `agent.response.done` doivent alimenter un unique message assistant. Les futurs événements transcript `user` ou `assistant` suffixés en `delta` ou `done` doivent suivre la même logique si le bridge les propage.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `issues/issue_09_devtools_text_stream_reconstruction.md` | Documentation du bug | Faible |
| `packages/ui/src/devtools/StateMonitor.tsx` | Agrégation locale des flux textuels dans le monitor | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `packages/core/src/client/events.ts`
- `packages/ui/src/devtools/index.ts` sauf blocage de typage mineur
- `apps/**`
- `packages/browser/**`
- `packages/react/**`
- `packages/server/**`

---

## Tests

- [ ] Test unitaire couvrant le bug
- [ ] Test d'intégration si applicable
- [ ] `pnpm build` passe sur les packages affectés
- [ ] `pnpm test` ne régresse pas