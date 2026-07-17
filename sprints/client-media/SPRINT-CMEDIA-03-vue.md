# Sprint CMEDIA-03 - Raccordement Vue

Statut : **Planifié après CMEDIA-02**

## Objectif

Raccorder le composable vocal Vue au runtime média core.

## Fichiers cibles

- `packages/vue/src/composables/useVoiceMode.ts`
- provider/plugin Vue concerné
- widget Vue et tests associés

## Definition of Done

- [ ] Les trois politiques média sont supportées.
- [ ] `onUnmounted` libère capture, playback et listeners.
- [ ] Les états réactifs reflètent le transport effectif et le fallback.
- [ ] Build et tests Vue passent.

## Hors scope

- Autres SDK.

## Commit recommandé

`feat(vue): connect voice composable to core media runtime`

