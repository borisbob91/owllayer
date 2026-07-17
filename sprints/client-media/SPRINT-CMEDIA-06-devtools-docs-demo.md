# Sprint CMEDIA-06 - DevTools, documentation et démos

Statut : **Planifié après CMEDIA-05**

## Objectif

Rendre la sélection média compréhensible et vérifiable sans transformer le
dashboard en laboratoire.

## Fichiers cibles

- DevTools partagés dans `packages/ui/`
- démos SDK concernées
- documentation voix et adapters dans `apps/docs-site/`
- tests E2E des scénarios de sélection

## Périmètre visible

- transport demandé et transport effectif ;
- raison du fallback ;
- état de session et erreur normalisée ;
- aucune clé, SDP complet, token ou événement provider brut.

## Definition of Done

- [ ] Les démos couvrent WebSocket par défaut et WebRTC opt-in.
- [ ] `auto` est démontré avec fallback.
- [ ] DevTools affiche uniquement les données opérationnelles utiles.
- [ ] La documentation distingue control plane ADTP et media plane.
- [ ] Les scénarios E2E passent sur au moins React puis un second SDK.

## Hors scope

- Éditeur visuel de pipeline.
- Métriques provider avancées.

## Commit recommandé

`docs(media): document and demonstrate transport selection`

