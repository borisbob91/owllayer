# Audit de complétion — SPRINT-LK-05: Client Room Frontends

## Résumé

Le sprint **SPRINT-LK-05 est partiellement implémenté (≈40%)**. Sur les 8 fichiers cibles, seulement 2 existent. Le hook React et l'endpoint serveur sont complets et bien conçus, mais les intégrations Vue, Angular, browser/core, les démos, et plusieurs propriétés du contrat frontend sont absentes.

## Fichiers cibles — Statut

| Fichier | Action | Statut |
|---------|--------|--------|
| `packages/browser/src/livekit/*` | Intégration browser | ❌ **MANQUANT** — dossier inexistant |
| `packages/react/src/livekit/useDomOSLiveKitRoom.ts` | Hook React optionnel | ✅ **FAIT** — 300+ lignes, complet |
| `packages/angular/src/lib/services/livekit/*` | Service Angular optionnel | ❌ **MANQUANT** — dossier inexistant |
| `packages/vue/src/composables/useDomOSLiveKitRoom.ts` | Composable Vue optionnel | ❌ **MANQUANT** — dossier `vue/src/livekit` inexistant |
| `packages/core/src/livekit/types.ts` | Types communs si nécessaire | ❌ **MANQUANT** — dossier `core/src/livekit` inexistant |
| `apps/demo-server/src/server.ts` | Endpoint token room demo | ✅ **FAIT** — `POST /domos/livekit/token` complet |
| `apps/demo-angular/**` | Démo Angular | ❌ **MANQUANT** — pas d'intégration LiveKit |
| `apps/demo/**` (React) | Démo React | ❌ **MANQUANT** — `App.tsx` n'utilise pas `useDomOSLiveKitRoom` |

## Contrat frontend — Statut

Le sprint définit un contrat frontend que le hook LiveKit doit exposer :

| Propriété/Méthode | Statut | Détail |
|-|-|-|
| `connectRoom()` | ✅ | `connect()` dans le hook |
| `disconnectRoom()` | ✅ | `disconnect()` dans le hook |
| `muteMicrophone()` / `unmuteMicrophone()` | ✅ | `setMicrophoneEnabled()` + `toggleMicrophone()` |
| `agentSpeaking` | ❌ **MANQUANT** | Pas exposé dans le résultat du hook |
| `roomState` | ✅ | `connectionState` exposé |
| `participantIdentity` | ❌ **MANQUANT** | Pas exposé dans le résultat du hook |

## Token room — Statut

| Règle | Statut | Détail |
|-|-|-|
| Token généré côté serveur | ✅ | `createLiveKitRoomToken()` dans `server.ts` |
| TTL court | ✅ | TTL configurable via `ttlSeconds` |
| Lié à sessionId ou API key | ✅ | Vérifie `sessionId` + `getAgentBridgeSessionSnapshot()` + `isClientApiKeyAllowed()` |
| Pas de secret LiveKit côté client | ✅ | Seul le token est retourné au client |
| Endpoint `POST /domos/livekit/token` | ✅ | Implémenté dans `server.ts` |

## Gates de validation — Statut

| Gate | Statut | Preuve |
|-|-|-|
| Le client peut rejoindre une room LiveKit avec token serveur | ✅ | Hook React + endpoint serveur fonctionnels |
| La session DomOS reste active et synchronise le Shadow Context | ✅ | `useAgent()` dans le hook maintient la connexion DomOS |
| Les tools client montés restent visibles dans DomOS | ✅ | Architecture DomOSProvider existante non modifiée |
| Couper la room ne détruit pas la session DomOS | ✅ | `disconnect()` ne ferme que la room, pas la session |
| Couper la session DomOS ferme la room si elle était liée | ✅ | Option `disconnectOnDomOSDisconnect` |
| Démo minimale documentée | ❌ **MANQUANT** | Aucune démo utilisant le hook n'existe |

## Analyse détaillée des fichiers présents

### `useDomOSLiveKitRoom.ts` (React hook — complet)
- **Exported**: `useDomOSLiveKitRoom()` + tous les types associés
- **Exported depuis `@domos/react`**: Oui via `index.ts`
- **Fonctionnalités**:
  - `connect()`: demande token via `fetchToken()` ou endpoint, crée room via `roomFactory` ou import dynamique de `livekit-client`, connecte
  - `disconnect()`: déconnecte proprement, nettoie les listeners, reset le state
  - `setMicrophoneEnabled(toggle)`: contrôle micro du `localParticipant`
  - `toggleMicrophone()`: toggle
  - Auto-connect optionnel via `autoConnect`
  - Cleanup au unmount optionnel via `disconnectOnUnmount`
  - Déconnexion auto si DomOS se déconnecte via `disconnectOnDomOSDisconnect`
  - Gestion d'erreur complète avec état `error`
  - Support de room factory custom
  - Support de token fetcher custom
  - Import dynamique de `livekit-client` (pas de dépendance directe au build)

### `server.ts` (endpoint token — complet)
- **Endpoint**: `POST /domos/livekit/token` (configurable via `LIVEKIT_TOKEN_PATH`)
- **Sécurité**:
  - Vérifie que LiveKit est configuré (`isLiveKitServerEnvConfigured`)
  - Vérifie l'API key client (`isClientApiKeyAllowed`)
  - Vérifie que `sessionId` correspond à une session DomOS active via `getAgentBridgeSessionSnapshot()`
  - Rate-limite le body à 8KB
- **Génération token**: utilise `createLiveKitRoomToken()` de `@domos/adapter-livekit`
- **Support CORS**: headers pour les requêtes cross-origin

### Public exports (React)
Le hook et tous ses types sont exportés depuis `@domos/react` via `index.ts`:
```ts
export { useDomOSLiveKitRoom } from './livekit/useDomOSLiveKitRoom.js';
export type { DomOSLiveKitRoomFactory, DomOSLiveKitRoomLike, ... } from './livekit/useDomOSLiveKitRoom.js';
```

## Ce qui manque pour compléter le sprint

### Prioritaire
1. **`packages/core/src/livekit/types.ts`** — Types partagés pour les interfaces du contrat frontend (sinon ils sont dupliqués entre frameworks). Copier les interfaces de base depuis `useDomOSLiveKitRoom.ts`
2. **`packages/vue/src/composables/useDomOSLiveKitRoom.ts`** — Port du hook React vers Vue (composable `useDomOSLiveKitRoom`)
3. **Démo minimale** — Intégrer `useDomOSLiveKitRoom` dans au moins une démo (React) pour activer le mode audio LiveKit. Ajouter un bouton "Rejoindre room vocale" dans `App.tsx`
4. **Documentation** — README ou note dans la démo expliquant comment activer le mode LiveKit

### Secondaire
5. **`packages/browser/src/livekit/*`** — Logique de base indépendante du framework (dépend de l'existence d'une couche `@domos/browser`)
6. **`packages/angular/src/lib/services/livekit/*`** — Service Angular (service injectable)
7. **`agentSpeaking`** — Propriété manquante dans le résultat du hook React
8. **`participantIdentity`** — Propriété manquante dans le résultat du hook React

## Conclusion

**SPRINT-LK-05 est partiellement implémenté**. Le React hook et l'endpoint serveur sont complets et bien architecturés. Il manque :
- Les types partagés dans `@domos/core`
- L'intégration Vue (composable)
- L'intégration Angular (service)
- L'intégration browser (si applicable)
- Une démo fonctionnelle utilisant le hook
- La documentation de la démo
- 2 propriétés mineures du contrat (`agentSpeaking`, `participantIdentity`)
