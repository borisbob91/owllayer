# Sprint DG-05 - Configuration dashboard et documentation

Statut : **Planifié en clôture Deepgram**

## Objectif

Permettre à l'administrateur de choisir les capacités Deepgram réellement
implémentées, de vérifier leur état et de suivre l'essentiel de l'agent.

## Périmètre dashboard

- choix provider/modèle/voix parmi les valeurs supportées ;
- références de credentials, jamais la clé restituée au navigateur ;
- statut de configuration et diagnostic exploitable ;
- métriques de session essentielles, sans transformer le dashboard en laboratoire ;
- affichage du vrai nom d'agent résolu, pas seulement « client ».

## Fichiers cibles à confirmer par audit UI

- composants et API admin existants dans `packages/ui/`
- endpoints de configuration dans `packages/server/src/admin/`
- `apps/docs-site/src/content/docs/deepgram/`
- exemple de configuration dans `apps/demo-server`

## Definition of Done

- [ ] Les formulaires reflètent les capacités du registry serveur.
- [ ] Une configuration invalide est refusée avant ouverture de session.
- [ ] Aucun contrôle décoratif ou non implémenté n'est présenté comme actif.
- [ ] Les docs suivent les patterns des autres adapters DomOS.
- [ ] Les scénarios d'usage sont testés depuis le dashboard jusqu'au serveur.

## Hors scope

- Éditeur de pipeline visuel.
- Installation de providers depuis le dashboard.
- Métriques de laboratoire non nécessaires à l'exploitation.

## Commit recommandé

`feat(ui): configure and observe Deepgram adapters`
