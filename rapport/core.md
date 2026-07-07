# Rapport core - @domos/core

Date: 2026-07-04

Scope: `packages/core` - protocole ADTP, validation runtime, schemas de tools, plugins, packaging SDK.

## Verdict

🟢 Passe core corrigée localement. Le module de licence propriétaire a été retiré du projet open source, le contrat plugin est stabilisé, `rate_limit` est sorti d'ADTP core, et les gates `lint`, `test`, `build` de `@domos/core` sont vertes.

La passe complémentaire client/serveur a aussi renforcé le contrat ADTP autour de la surface effective des tools, des collisions serveur/client, des approvals serveur -> client et du signaling WebRTC avec virtual lines.

## Points corrigés

- 🟢 Suppression de `packages/core/src/license/DomOSLicense.ts`.
- 🟢 Suppression de `packages/core/tests/license.test.ts`.
- 🟢 Retrait des dépendances inutiles `crypto` et `webrtc` de `packages/core/package.json`.
- 🟢 Mise à jour de `pnpm-lock.yaml` et `packages/core/package-lock.json`.
- 🟢 `installPlugin()` accepte maintenant un host minimal sans `trackPlugin()`, tout en appelant `trackPlugin()` quand le client le supporte.
- 🟢 `ToolParameterProperty.items` est aligné entre types, validator runtime et conversion Zod.
- 🟢 `zodToToolParameters()` produit maintenant `items` pour les schemas `z.array(...)`.
- 🟢 `TOOL_RESULT` garde un résultat obligatoire pour `success`, et accepte `error` / `pending_approval` sans résultat métier. La factory sérialise alors `result: null`.
- 🟢 `rate_limit` et `Messages.rateLimitEvent()` sont retirés du protocole core.
- 🟢 Ajout du type public `EffectiveToolsPayload`.
- 🟢 Ajout du `SystemEventKind` `tools_effective` dans types, serializer et validator.
- 🟢 Ajout de l'événement client `tool.registry.effective`.
- 🟢 `DomOSClient` expose maintenant `toolSurface`, `effectiveTools`, `ignoredClientTools` et `onEffectiveTools`.
- 🟢 `DomOSClient` nettoie le `lineToken` WebRTC quand le signaling retourne une erreur liée au token.

## Validations

- `pnpm --filter @domos/core lint` - OK.
- `pnpm --filter @domos/core test` - OK, 7 fichiers de tests, 76 tests.
- `pnpm --filter @domos/core build` - OK.
- `pnpm --filter @domos/server lint` - OK.
- `pnpm --filter @domos/server test` - OK, 18 fichiers, 176 tests.
- `pnpm --filter @domos/server build` - OK.

## Tests ajoutés ou ajustés

- `tests/protocol.test.ts`: roundtrip `TOOL_RESULT` error sans résultat métier.
- `tests/protocol.test.ts`: roundtrip `TOOL_RESULT` pending approval sans résultat métier.
- `tests/protocol.test.ts`: validation `CONTEXT_UPDATE` avec paramètre `ARRAY.items`.
- `tests/protocol.test.ts`: conversion Zod array vers `ToolParameters.items`.
- `tests/protocol.test.ts`: rejet explicite du legacy `SYSTEM_EVENT rate_limit`.
- `tests/protocol.test.ts`: validation `SYSTEM_EVENT tools_effective`.
- `tests/plugins.test.ts`: tracking plugin quand le client expose `trackPlugin()`.
- `tests/client.hitl.test.ts`: approval serveur -> client.
- `tests/client.hitl.test.ts`: `TOOL_CALL` async en erreur -> `TOOL_RESULT error`.
- `tests/client.hitl.test.ts`: réception et exposition de la surface effective.
- `tests/client.virtual-lines.test.ts`: WebRTC signaling `lineToken` invalide -> nettoyage local.

## Points à surveiller

- 🟠 `pnpm-lock.yaml` contient encore `webrtc`, mais via `packages/server`, pas via `packages/core`.
- 🟠 `npm install --package-lock-only --ignore-scripts` dans `packages/core` signale une vulnérabilité critique dans l'audit npm local. Je n'ai pas lancé `npm audit fix --force` car ce serait un changement large et non ciblé.
- 🟠 `send()` hors connexion reste à clarifier dans la passe suivante.
- 🟠 Il manque encore un test WebRTC end-to-end complet `DataChannel.open` -> `HANDSHAKE_INIT` -> `HANDSHAKE_ACK`.
