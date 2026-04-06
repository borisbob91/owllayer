# AGENTS.md — Instructions pour agents IA dans DomOS


Ce document définit les règles et conventions à respecter pour tout agent IA intervenant dans le code de DomOS.
---

## Identité du projet

**DomOS** est un framework *Agentic UI* : il connecte un agent IA à une interface web via un protocole WebSocket propriétaire appelé **ADTP** (Agent-to-DOM Transfer Protocol).

Les composants React/Vue/Svelte déclarent des **outils** (`useAgentTool`) que l'IA peut invoquer en temps réel. Le serveur orchestre les LLMs (OpenAI, Gemini). Le HITL (Human-in-the-Loop) protège les actions à risque.

Dépôt : monorepo **pnpm + Turborepo**. Toutes les commandes s'exécutent depuis `domos/`.

---

## Structure du monorepo

```
domos/
├── packages/
│   ├── core/          # Types partagés, VoiceStateMachine, generateWidgetStyles, protocole ADTP
│   ├── server/        # Serveur WebSocket, orchestration LLM, sessions, HITL
│   ├── adapter-openai/  # Adapter LLM OpenAI (GPT-4o, etc.)
│   ├── adapter-google/  # Adapter LLM Google (Gemini Live)
│   ├── react/         # SDK React : DomOSProvider, useAgentTool, useVoiceMode, WidgetInner
│   ├── ui/            # Runtime partage cross-framework, dashboard et devtools embarques
│   ├── vue/           # SDK Vue : DomOSWidget.vue, useVoiceMode composable
│   ├── svelte/        # SDK Svelte : DomOSWidget.svelte, createVoiceMode
│   ├── browser/       # SDK vanilla JS/Preact (Shadow DOM) : BrowserDomOS, VoiceManager
│   ├── shopify/       # Plugin Shopify (Liquid + JS)
│   └── woocommerce/   # Plugin WooCommerce
├── apps/
│   ├── demo/          # Démo React (e-commerce ShopMate)
│   ├── demo-vue/      # Démo Vue
│   ├── demo-svelte/   # Démo Svelte
│   ├── demo-browser/  # Démo vanilla JS (HTML + DomOS browser SDK)
│   └── demo-server/   # Serveur de démo
├── issues/            # Analyses de bugs (canvas obligatoire avant fix)
├── features/          # Specs de nouvelles features (canvas obligatoire avant code)
├── docs/              # Documentation protocole, guides, règles audio
├── CONTRIBUTING.md    # Règles de contribution — LIRE EN PRIORITÉ
└── AGENTS.md          # Ce fichier
```

---

## Règles absolues — NE JAMAIS faire

Ces actions sont interdites sans exception, même si elles semblent améliorer le code :

```
✗ Renommer une variable, fonction, classe, type ou interface
✗ Refactoriser du code non explicitement demandé
✗ Modifier des commentaires existants rédigés par d'autres
✗ Reformater du code non modifié (indentation, quotes, virgules...)
✗ Supprimer du code "mort" ou "inutilisé" de votre propre initiative
✗ Ajouter des dépendances npm non demandées
✗ Toucher des fichiers hors du périmètre de la demande
✗ Créer des abstractions ou helpers pour un usage unique
✗ Ajouter de la gestion d'erreur défensive sur du code interne
✗ "Améliorer" du code fonctionnel sans demande explicite
```

Si vous détectez quelque chose d'améliorable **hors scope** : signalez-le en commentaire de réponse uniquement — ne le modifiez pas.

---

## Règles de travail

### 1. Lisez CONTRIBUTING.md avant toute modification

[CONTRIBUTING.md](CONTRIBUTING.md) définit le workflow complet : canvas issue avant bug fix, canvas feature avant nouvelle fonctionnalité, domaines de responsabilité.

### 2. Respectez les domaines

Un agent IA doit travailler sur **un seul domaine par tâche** :

| Domaine | Périmètre |
|---|---|
| `core` | `packages/core/` uniquement |
| `server` | `packages/server/`, `packages/adapter-*/` |
| `react` | `packages/react/`, `apps/demo/` |
| `ui` | `packages/ui/` |
| `vue` | `packages/vue/`, `apps/demo-vue/` |
| `svelte` | `packages/svelte/`, `apps/demo-svelte/` |
| `browser` | `packages/browser/`, `apps/demo-browser/` |
| `angular` | `packages/angular/`, `apps/demo-angular/` (périmètre futur) |

Si une tâche touche `core` ET un SDK → intervenir séquentiellement, pas en même temps.

### 3. Listez les fichiers avant de coder

Avant de modifier quoi que ce soit, listez explicitement les fichiers qui seront touchés et obtenez confirmation si la demande est ambiguë.

### 4. Un fichier modifié = une raison explicite

Chaque fichier modifié doit avoir une justification directe dans la demande ou dans le document issue/feature référencé. Aucun fichier collatéral.

---

## Architecture technique — points critiques

### Protocole ADTP

Communication WebSocket JSON entre `DomOSClient` (packages SDK) et `DomOSServer` (`packages/server`).
Messages clés : `TOOL_CALL`, `TOOL_RESULT`, `AGENT_RESPONSE`, `AUDIO_STREAM`, `AUDIO_OUTPUT`, `VOICE_INPUT_END`, `INTERRUPT`.

### Tools — cycle de vie

Les tools sont enregistrés via `useAgentTool` (React/Vue/Svelte) ou `DomOS.registerTool` (browser).  
**Ils n'existent côté serveur que quand le composant est monté.** Naviguer = tools changent.

```ts
useAgentTool({ name, description, risk }, handler)
// → enregistré au mount, désenregistré à l'unmount
```

### Shadow DOM — règle critique React

`WidgetInner.tsx` crée un `ShadowContainer` qui instancie son propre `createRoot` React **sans contexte DomOS**.  
**Tout composant appelant `useAgentTool` ou `useAgent` DOIT être en dehors de `ShadowContainer`.**

```tsx
// ✅ Correct — hors Shadow DOM, accès au DomOSProvider
return (
  <>
    <EndCallTool onEnd={handleHangUp} />   {/* HORS ShadowContainer */}
    <ShadowContainer styles={css}>
      {/* UI rendue ici n'a PAS accès au context DomOS */}
    </ShadowContainer>
  </>
);
```

### CSS Widget — generateWidgetStyles

`generateWidgetStyles(theme, preset, contextSelector)` dans `packages/core/src/widget/widget.styles.ts`.

- **React** : Shadow DOM → `contextSelector = ':host'` (défaut)
- **Vue / Svelte** : Light DOM → `contextSelector = '.domos-widget-root'` (wrapper div obligatoire)

Ne jamais utiliser `:host {}` directement dans du CSS injecté hors Shadow DOM.

### Pipeline audio PCM — règles R1-R7

Voir `docs/AUDIO_PIPELINE_RULES.md`. Résumé :

- **R7** : Ne jamais appeler `AudioContext.close()` au stop de la capture — cela bloque ~256ms et gèle l'UI. Déconnecter les nœuds et stopper les pistes seulement.
- **R3** : `validLength = binary.length - (binary.length % 2)` avant de créer `Int16Array` — évite les chunks impairs qui corrompent le décodage.
- **R5** : Résumer `AudioContext` suspendu avant de planifier des chunks.
- **R6** : Séquencer via `nextStartTime` — pas de `source.start(0)` direct.

### VoiceStateMachine

États : `idle → capturing → awaiting_model → playing → interrupted`  
Dispatches : `START_CAPTURE`, `STOP_CAPTURE`, `MODEL_SPEAKING`, `TURN_COMPLETE`, `BARGE_IN`, `ERROR`

Toujours usar la machine d'état — jamais gérer manuellement les transitions vocales.

### HITL (Human-in-the-Loop)

Les tools déclarés avec `risk: 'high'` ou `risk: 'critical'` déclenchent un overlay de confirmation.  
`risk: 'none'` et `risk: 'low'` sont exécutés sans confirmation.

---

## Conventions de code

### Imports

- Toujours importer depuis `@domos/core` pour les types partagés.
- Ne jamais croiser les imports entre packages SDK (react ↔ vue ↔ svelte).
- Chemins relatifs avec extension `.js` (ESM strict) : `import { foo } from './bar.js'`

### TypeScript

- `tsconfig.base.json` à la racine définit les options communes.
- `strict: true` activé partout. Pas de `any` sauf cas documenté.
- `noUnusedLocals: true` — tout import ou variable inutilisé = erreur build.

### Nommage des fichiers

| Type | Convention |
|---|---|
| Composants React/Svelte | `PascalCase.tsx` / `.svelte` |
| Composants Vue | `PascalCase.vue` |
| Hooks React | `useXxx.ts` |
| Composables Vue | `useXxx.ts` |
| Composables Svelte | `createXxx.ts` |
| Classes | `PascalCase.ts` |
| Utilitaires | `camelCase.ts` |

### Commentaires

- Commentaires en **français** dans ce projet (convention établie).
- Ne pas modifier des commentaires existants.
- Ajouter un commentaire uniquement si la logique n'est pas auto-explicative.

---

## Commandes build & test

```bash
# Depuis domos/

# Build d'un package spécifique
pnpm --filter @domos/core build
pnpm --filter @domos/react build
pnpm --filter @domos/vue build
pnpm --filter @domos/svelte build
pnpm --filter @domos/browser build

# Build complet (tous les packages en ordre de dépendance)
pnpm build

# Tests
pnpm test

# Build d'une app de démo
pnpm --filter demo build
pnpm --filter demo-vue build
```

**Sempre builder le(s) package(s) affecté(s) et vérifier exit code 0 avant de terminer une tâche.**

---

## Checklist avant de terminer une tâche

```
[ ] Seuls les fichiers annoncés ont été modifiés
[ ] Aucun renommage / refactoring non demandé
[ ] Aucun fichier hors domaine touché
[ ] pnpm build passe (exit 0) sur les packages modifiés
[ ] Aucune nouvelle dépendance ajoutée sans validation
[ ] Si bug : documenter issues/issue_XX_xxx.md existe
[ ] Si feature : document features/feature_XX_xxx.md existe
```

---

## En cas de doute

**Signaler, ne pas deviner.** Si la demande est ambiguë sur le périmètre, demander confirmation avant de toucher le moindre fichier. Il vaut mieux une question de plus qu'un fichier modifié hors scope.
