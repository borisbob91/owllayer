# AGENTS.md — Instructions pour agents IA dans OwlLayer


Ce document définit les règles et conventions à respecter pour tout agent IA intervenant dans le code d'OwlLayer.
---

## Identité du projet

**OwlLayer** est un framework *Agentic UI* : il connecte un agent IA à une interface web via un protocole WebSocket propriétaire appelé **AITP** (Agent-to-Interface Transfer Protocol).

Les composants React/Vue/Svelte/Angular déclarent des **outils** (`useAgentTool`) que l'IA peut invoquer en temps réel. Le serveur orchestre les LLMs (OpenAI, Gemini). Le HITL (Human-in-the-Loop) protège les actions à risque.

Dépôt : monorepo **pnpm + Turborepo**. Toutes les commandes s'exécutent depuis la racine du monorepo.

---

## Structure du monorepo

```
owllayer/
├── packages/
│   ├── core/          # Types partagés, VoiceStateMachine, generateWidgetStyles, protocole AITP, OwlLayerClient
│   ├── server/        # Serveur WebSocket, orchestration LLM, sessions, HITL, OwlLayerServer
│   ├── adapter-openai/  # Adapter LLM OpenAI (GPT-4o, etc.)
│   ├── adapter-google/  # Adapter LLM Google (Gemini Live)
│   ├── react/         # SDK React : OwlLayerProvider, useAgentTool, useVoiceMode, WidgetInner
│   ├── ui/            # Runtime partage cross-framework, dashboard et devtools embarques
│   ├── vue/           # SDK Vue : OwlLayerWidget.vue, useVoiceMode composable
│   ├── svelte/        # SDK Svelte : OwlLayerWidget.svelte, createVoiceMode
│   ├── browser/       # SDK vanilla JS/Preact (Shadow DOM) : BrowserOwlLayer, VoiceManager
│   ├── shopify/       # Plugin Shopify (Liquid + JS) : OwlLayerShopify
│   └── woocommerce/   # Plugin WooCommerce : OwlLayerWoo
├── apps/
│   ├── demo/          # Démo React (e-commerce ShopMate)
│   ├── demo-vue/      # Démo Vue
│   ├── demo-svelte/   # Démo Svelte
│   ├── demo-browser/  # Démo vanilla JS (HTML + OwlLayer browser SDK)
│   ├── demo-server/   # Serveur de démo
│   └── docs-site/     # Site de documentation Astro / Starlight
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
✗ Renommer une variable, fonction, classe, type ou interface hors demande explicite
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
| `angular` | `packages/angular/`, `apps/demo-angular/` |

Si une tâche touche `core` ET un SDK → intervenir séquentiellement, pas en même temps.

### 3. Listez les fichiers avant de coder

Avant de modifier quoi que ce soit, listez explicitement les fichiers qui seront touchés et obtenez confirmation si la demande est ambiguë.

### 4. Un fichier modifié = une raison explicite

Chaque fichier modifié doit avoir une justification directe dans la demande ou dans le document issue/feature référencé. Aucun fichier collatéral.

---

## Architecture technique — points critiques

### Protocole AITP

Communication WebSocket JSON entre `OwlLayerClient` (packages SDK) et `OwlLayerServer` (`packages/server`).
Messages clés : `TOOL_CALL`, `TOOL_RESULT`, `AGENT_RESPONSE`, `AUDIO_STREAM`, `AUDIO_OUTPUT`, `VOICE_INPUT_END`, `INTERRUPT`.

### Tools — cycle de vie

Les tools sont enregistrés via `useAgentTool` (React/Vue/Svelte) ou `OwlLayer.registerTool` (browser).  
**Ils n'existent côté serveur que quand le composant est monté.** Naviguer = tools changent.

```ts
useAgentTool({ name, description, risk }, handler)
// → enregistré au mount, désenregistré à l'unmount
```

### Shadow DOM — règle critique React

`WidgetInner.tsx` crée un `ShadowContainer` qui instancie son propre `createRoot` React **sans contexte OwlLayer**.  
**Tout composant appelant `useAgentTool` ou `useAgent` DOIT être en dehors de `ShadowContainer`.**

```tsx
// ✅ Correct — hors Shadow DOM, accès au OwlLayerProvider
return (
  <>
    <EndCallTool onEnd={handleHangUp} />   {/* HORS ShadowContainer */}
    <ShadowContainer styles={css}>
      {/* UI rendue ici n'a PAS accès au context OwlLayer */}
    </ShadowContainer>
  </>
);
```

### CSS Widget — generateWidgetStyles

`generateWidgetStyles(theme, preset, contextSelector)` dans `packages/core/src/widget/widget.styles.ts`.

- **React** : Shadow DOM → `contextSelector = ':host'` (défaut)
- **Vue / Svelte** : Light DOM → `contextSelector = '.owllayer-widget-root'` (wrapper div obligatoire)

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

Toujours utiliser la machine d'état — jamais gérer manuellement les transitions vocales.

### HITL (Human-in-the-Loop)

Les tools déclarés avec `risk: 'high'` ou `risk: 'critical'` déclenchent un overlay de confirmation.  
`risk: 'none'` et `risk: 'low'` sont exécutés sans confirmation.

---

## Conventions de code

### Imports

- Toujours importer depuis `@owllayer/core` pour les types partagés.
- Ne jamais croiser les imports entre packages SDK (react ↔ vue ↔ svelte ↔ angular).
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
# Depuis la racine du monorepo

# Build d'un package spécifique
pnpm --filter @owllayer/core build
pnpm --filter @owllayer/react build
pnpm --filter @owllayer/vue build
pnpm --filter @owllayer/svelte build
pnpm --filter @owllayer/browser build
pnpm --filter @owllayer/angular build

# Build complet (tous les packages en ordre de dépendance)
pnpm --filter "./packages/**" build

# Tests
pnpm test

# Build d'une app de démo
pnpm --filter @owllayer/demo build
pnpm --filter @owllayer/demo-vue build
```

**Toujours builder le(s) package(s) affecté(s) et vérifier exit code 0 avant de terminer une tâche.**

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
