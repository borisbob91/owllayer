# Sprint CMEDIA-01 - Raccordement React

Statut : **Planifié après CMEDIA-00**

## Objectif

Faire consommer le runtime média core par React sans dupliquer la sélection de
transport et sans casser `useVoiceMode`.

## Fichiers cibles

- `packages/react/src/voice/useVoiceMode.ts`
- `packages/react/src/provider/DomOSProvider.tsx`
- `packages/react/src/provider/DomOSContext.ts`
- `packages/react/src/hooks/useAgent.ts`
- widget React et tests associés

## Tâches

- remplacer progressivement le booléen `live` par la politique média ;
- conserver un alias de compatibilité documenté ;
- relier micro, playback, mute, interruption et état du transport ;
- fermer la session au démontage et au disconnect DomOS ;
- éviter que le Shadow DOM perde le contexte requis par les hooks ;
- tester WebSocket, WebRTC simulé, fallback et StrictMode.

## Definition of Done

- [ ] `useVoiceMode` fonctionne dans les trois politiques.
- [ ] Aucun événement provider brut n'est exposé.
- [ ] Aucun double listener/capture en StrictMode.
- [ ] Le widget garde le même workflow vocal.
- [ ] Build et tests React passent.

## Hors scope

- Angular, Vue, Svelte et Browser.
- LiveKit Room spécifique.

## Commit recommandé

`feat(react): connect voice mode to core media runtime`

