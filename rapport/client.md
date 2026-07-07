# Rapport client - DomOSClient

Date: 2026-07-04

Scope: `packages/core/src/client/DomOSClient.ts` et consommateurs directs React/Angular/UI/DevTools.

## Verdict

🟢 La passe client/core demandée est terminée localement. Le serveur notifie maintenant la surface effective des tools après fusion serveur/client, le client expose cette surface aux SDK, les approvals serveur -> client sont testées, les erreurs async de `TOOL_CALL` sont couvertes, le lifecycle mount/unmount est vérifié côté serveur, et WebRTC nettoie les `lineToken` refusés.

## Actions corrigées

1. 🟢 `APPROVAL_REQUEST` serveur -> client couvert.
   - Test ajouté: `packages/core/tests/client.hitl.test.ts`.
   - Vérifie `handleMessage(Messages.approvalRequest(...))`, l'événement `approval.requested`, et l'envoi de `APPROVAL_RESPONSE`.

2. 🟢 Erreur async `TOOL_CALL` couverte.
   - Test ajouté: `packages/core/tests/client.hitl.test.ts`.
   - Un handler qui rejette renvoie maintenant un `TOOL_RESULT` `status: error`, ce qui évite de laisser le serveur attendre indéfiniment.

3. 🟢 Surface effective tools/collisions ajoutée.
   - Protocole: `SystemEventKind` accepte `tools_effective`.
   - Payload public: `EffectiveToolsPayload`.
   - Serveur: `DomOSServer` envoie un `SYSTEM_EVENT tools_effective` après `CONTEXT_UPDATE`.
   - Client: `DomOSClient.toolSurface`, `effectiveTools`, `ignoredClientTools`, handler `onEffectiveTools`, événement `tool.registry.effective`.
   - DevTools: affichage du nombre de tools effectifs et des collisions ignorées.

4. 🟢 Lifecycle mount/unmount vérifié côté serveur.
   - Test ajouté: `packages/server/tests/DomOSServer.server-tools.test.ts`.
   - Vérifie que le registre de session retire le tool du composant démonté et conserve uniquement les tools encore déclarés par le client.

5. 🟢 Adapters et widgets alignés.
   - React expose `toolSurface`, `getEffectiveTools()`, `getIgnoredClientTools()` dans `DomOSContext`.
   - Angular expose `getEffectiveTools()` et `getIgnoredClientTools()` dans `DomOSAngularService`.
   - Le widget Angular écoute `approval.requested` via l'event bus au lieu d'écraser `onApprovalRequest`, donc une app peut garder ses propres handlers.
   - Les montages DevTools React/Angular/Vue/Svelte/browser reçoivent la surface effective quand disponible.

6. 🟢 WebRTC + virtual lines durcis.
   - `lineToken` encodé dans l'URL de signaling.
   - Le client lit le détail d'erreur HTTP signaling.
   - Si l'erreur mentionne `lineToken`, le token est supprimé côté client et `sessionStorage`.
   - Test ajouté: `packages/core/tests/client.virtual-lines.test.ts`.

7. 🟢 Handshake React corrigé.
   - `packages/react/src/provider/adtp.useConnection.ts` envoie maintenant `ADTP_VERSION` en plus de `SDK_VERSION`.
   - Corrigeait une erreur `tsc --noEmit` du package React.

## Points restants avant publication

1. 🟠 Clarifier `send()` hors connexion.
   - Aujourd'hui `sendText()` peut mettre l'état en `thinking` même si aucun transport n'est ouvert.
   - Action recommandée: faire retourner `boolean` à `send()` ou émettre `system.error` pour les messages utilisateur non envoyés.

2. 🟠 Ajouter un test WebRTC end-to-end plus complet.
   - Le test actuel couvre le rejet signaling `lineToken`.
   - Action recommandée: mock complet `DataChannel.open` -> `HANDSHAKE_INIT`, avec vérification `Authorization`, `lineToken`, puis réception `HANDSHAKE_ACK`.

3. 🟠 Étendre l'affichage DevTools.
   - Le monitor et l'inspector affichent les collisions.
   - Action recommandée: ajouter une vue dédiée "Surface serveur" si AI Studio doit comparer local/effectif en détail.

## Validations exécutées

- `pnpm --filter @domos/core test` - OK, 7 fichiers, 76 tests.
- `pnpm --filter @domos/core lint` - OK.
- `pnpm --filter @domos/core build` - OK.
- `pnpm --filter @domos/server test` - OK, 18 fichiers, 176 tests.
- `pnpm --filter @domos/server lint` - OK.
- `pnpm --filter @domos/server build` - OK.
- `pnpm --filter @domos/ui lint` - OK.
- `pnpm --filter @domos/ui build` - OK.
- `pnpm --filter @domos/react lint` - OK.
- `pnpm --filter @domos/react build` - OK.
- `pnpm --filter @domos/angular test` - OK, 7 tests.
- `pnpm --filter @domos/angular build` - OK.
- `pnpm --filter @domos/browser lint` - OK.
- `pnpm --filter @domos/browser build` - OK.
- `pnpm --filter @domos/vue build` - OK.
- `pnpm --filter @domos/svelte build` - OK, avec warnings Svelte préexistants sur `DomOSTool.svelte` / `DomOSWidget.svelte`.
