---
mode: agent
description: >
  Sprint LK-07 - Tests, documentation, securite et publication de l'integration LiveKit.
---

# Sprint LK-07 - Tests Docs Security

**Base :** LK-02 a LK-06 selon scope livre.  
**Perimetre :** tests, docs, securite, release readiness.  
**Objectif :** rendre l'integration publiable sans secrets ni promesses floues.

## Objectif

Fermer les gates qualite:

- tests unitaires adapters;
- tests bridge;
- tests dashboard;
- docs utilisateur;
- docs architecture;
- guide secrets/env;
- limites connues par provider.

## Fichiers cibles

| Fichier | Action |
| --- | --- |
| `packages/adapter-livekit/tests/**` | tests adapters/bridge |
| `packages/server/tests/**` | tests AdminAPI/options serveur |
| `packages/ui/src/dashboard/**/__tests__` si pattern retenu | tests UI dashboard |
| `apps/docs-site/src/content/docs/**` | docs publiques |
| `docs/CONCEPTS.md` | concept LiveKit optional runtime |
| `framwork.md` | architecture mise a jour |
| `README.md` | exemple court |
| `.env.example` si present | variables LiveKit sans secrets |
| `rapport/livekit.md` | rapport d'architecture et decisions |

## Tests minimum

- `GeminiTTSService.synthesize()` avec mock provider.
- `GeminiTTSService.getCapabilities()`.
- `GeminiLiveAdapter.createSession()` mock.
- `LiveSession.sendToolResponse()` mapping.
- `DomOSLiveKitAgentBridge` tool call client.
- `DomOSLiveKitAgentBridge` tool call server.
- session close nettoie AgentSession/room.
- dashboard endpoints ne leakent aucun secret.
- enabled=false propre si LiveKit non configure.

## Securite

Controles obligatoires:

- aucun secret dans le frontend;
- token room TTL court;
- token room lie a session/API key;
- pas de raw API key DomOS dans metadata LiveKit;
- logs sans provider API key;
- CORS/allowed origins documentes;
- quota room/session;
- revocation DomOS ferme room liee;
- dashboard admin auth obligatoire.

## Documentation minimale

- Pourquoi LiveKit est optionnel.
- Difference DomOS Server / LiveKit AgentSession.
- Providers supportes.
- Exemple Gemini Live.
- Exemple Gemini TTS.
- Exemple autre LLM/TTS via LiveKit.
- Limites Gemini 3.1.
- Guide env vars.
- Guide dashboard.

## Gates

- [ ] Tests adapters passent.
- [ ] Tests server passent.
- [ ] Tests dashboard passent ou limitation documentee.
- [ ] `pnpm --filter @domos/adapter-livekit build`.
- [ ] `pnpm --filter @domos/server build`.
- [ ] `pnpm --filter @domos/ui build`.
- [ ] Aucune fuite de secret dans responses dashboard.
- [ ] Docs indiquent clairement que LiveKit peut brancher plusieurs providers.

