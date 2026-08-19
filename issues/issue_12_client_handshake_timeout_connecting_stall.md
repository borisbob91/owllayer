# Issue #12 : Timeout de handshake client pour eviter un connecting infini

**Statut** : 🟢 Résolu  
**Priorité** : 🟡 Majeur  
**Domaine** : core  
**Porteur** : @BorisBob  
**Date** : 2026-04-01

---

## Résumé

`OwlLayerClient` passe a l'etat `connecting` des que le transport s'ouvre, mais ne sort de cet etat que lorsqu'un `HANDSHAKE_ACK` est recu.

Si le WebSocket ou le DataChannel s'ouvrent mais que le handshake applicatif n'aboutit jamais, le client peut rester bloque indefiniment sur `connecting`, ce qui masque un serveur indisponible ou un handshake casse.

---

## Reproduction

### Conditions
- Version affectee : branche courante au 2026-04-01
- Environnement : Windows / pnpm workspace / package `@owllayer/core`
- Configuration : transport ouvert cote client, absence durable de `HANDSHAKE_ACK`

### Scenario pas-a-pas

1. Instancier `OwlLayerClient` avec un endpoint joignable
2. Ouvrir la connexion jusqu'a l'etat `connecting`
3. Laisser partir `HANDSHAKE_INIT` sans jamais repondre par `HANDSHAKE_ACK`
4. → Bug observe : le client reste sur `connecting` sans erreur explicite ni sortie de cet etat

---

## Analyse technique

### Cause racine

Le client envoie bien `HANDSHAKE_INIT` a l'ouverture du transport, mais aucun timeout local n'encadre l'attente de `HANDSHAKE_ACK`.

Le seul chemin vers `connected` passe par `HANDSHAKE_ACK`, et aucun chemin d'erreur n'est declenche si cet ACK n'arrive jamais alors que le transport reste ouvert.

```
Fichier : packages/core/src/client/OwlLayerClient.ts
Ligne   : 304-315, 372-376, 672-680
Code    : this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.log('Connexion WebSocket ouverte');
            this.send(Messages.handshakeInit(...));
          };

          this.dc.onopen = () => {
            this.reconnectAttempts = 0;
            this.log('DataChannel ouvert');
            this.send(Messages.handshakeInit(...));
          };

          case MessageType.HANDSHAKE_ACK: {
            this._sessionId = payload.sessionId;
            this.setState('connected');
          }
```

### Pourquoi c'est un bug (et pas un comportement attendu)

`connecting` represente une transition transitoire. Si le transport est ouvert mais que le handshake applicatif n'aboutit pas, l'etat doit sortir de `connecting` avec une erreur claire. Sinon, les demos et SDKs peuvent donner l'impression que la connexion progresse alors qu'elle est deja bloquee.

---

## Solution

### Approche retenue

Ajouter un timeout interne de handshake dans `OwlLayerClient` :

- demarrer le timer juste apres l'envoi de `HANDSHAKE_INIT` ;
- annuler ce timer sur `HANDSHAKE_ACK`, fermeture, `disconnect()` ou `destroy()` ;
- si le delai expire, emettre une erreur client explicite, sortir de `connecting`, puis fermer le transport courant pour terminer proprement la tentative.

### Fichiers qui seront modifiés

| Fichier | Type de modification | Risque |
|---|---|---|
| `issues/issue_12_client_handshake_timeout_connecting_stall.md` | Documentation du bug et du correctif | Faible |
| `packages/core/src/client/OwlLayerClient.ts` | Ajout d'un timeout de handshake et de son nettoyage | Faible |

> ⚠️ Tout fichier modifié en PR qui ne figure pas dans ce tableau est un motif de refus.

### Ce qui NE sera PAS modifié

- `packages/server/**`
- `packages/adapter-*/**`
- `packages/react/**`
- `packages/vue/**`
- `packages/svelte/**`
- `packages/browser/**`
- `apps/**`

---

## Tests

- [ ] Test unitaire couvrant le bug
- [ ] Test d'integration si applicable
- [x] `pnpm --filter @owllayer/core build` passe sur le package affecte
- [ ] `pnpm test` ne regresse pas

Validation actuelle : le correctif minimal est implemente dans `packages/core/src/client/OwlLayerClient.ts` et le build `pnpm --filter @owllayer/core build` passe (exit 0).