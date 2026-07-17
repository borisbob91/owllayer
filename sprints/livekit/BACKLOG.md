# LiveKit - Décision de backlog

Date : 2026-07-17
Statut : **Suspendu volontairement**

## Pourquoi

L'intégration actuelle annonce une architecture fournisseur-neutre, mais sa
réalisation reste fortement orientée Gemini et précède les contrats communs de
runtime, média et registry d'adapters. La poursuivre maintenant figerait ces
choix dans le serveur et les SDK.

Les sprints et progressions LK existants restent conservés comme historique. Ce
fichier remplace leur statut d'exécution courant, pas leur contenu historique.

## Interdictions pendant le backlog

- Ne pas ajouter de nouvelle capacité LiveKit.
- Ne pas étendre le bridge avec des types Gemini supplémentaires.
- Ne pas faire dépendre core ou server de LiveKit.
- Ne pas présenter l'intégration comme stable dans les docs publiques.
- Ne pas utiliser LiveKit pour décider le contrat ADTP média.

## Conditions de reprise

- [ ] SRV-00 et ADTP-00 sont validés.
- [ ] MEDIA-00 a migré `packages/audio` vers `@domos/core/media/audio`.
- [ ] Le registry d'adapters et le lifecycle de session sont livrés.
- [ ] Au moins OpenAI ou Deepgram valide les contrats sans dépendance LiveKit.
- [ ] La frontière entre transport média, provider IA et Neural-DOM Binding est
      couverte par tests.
- [ ] Un nouveau sprint d'audit compare le package LiveKit existant aux contrats
      stabilisés et décide ce qui doit être conservé, réécrit ou supprimé.
- [ ] Le porteur valide explicitement la reprise.

## Prochaine action lors de la reprise

Créer `SPRINT-LK-09-provider-neutral-realignment.md`. Ce sprint commence par un
audit du code existant ; il ne reprend pas automatiquement les choix des sprints
LK-01 à LK-08.
