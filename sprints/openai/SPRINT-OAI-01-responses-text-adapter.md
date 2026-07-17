# Sprint OAI-01 - Adapter texte Responses API

Statut : **après validation de OAI-00**

## 1. Résultat attendu

`OpenAIAdapter` implémente `LLMAdapter` avec `client.responses.create()` pour le
texte, le streaming logique DomOS et les function tools. Le serveur et les SDK
continuent d'utiliser uniquement `LLMRequest`, `LLMResponse` et `LLMToolCall`.

## 2. Contrat fonctionnel

### Requête initiale

- `buildSystemPrompt(request)` alimente `instructions` ;
- les messages DomOS deviennent des items `input` Responses ;
- les déclarations DomOS deviennent des function tools OpenAI ;
- aucune built-in tool OpenAI n'est activée implicitement ;
- `temperature` n'est envoyé que si le modèle sélectionné l'accepte.

### Réponse

- agréger tous les items texte pertinents, pas seulement le premier output ;
- mapper chaque function call vers `{ callId, name, args }` ;
- convertir l'usage en `inputTokens` et `outputTokens` ;
- rejeter proprement les arguments JSON invalides au lieu d'exécuter `{}` ;
- ne jamais exposer l'objet `Response` OpenAI dans un événement public.

### Continuation après tool

Le contexte en attente conserve au minimum le `responseId`, l'identité du call,
le nom du tool et les informations nécessaires pour soumettre un
`function_call_output`. Le résultat doit continuer la même conversation via le
mécanisme Responses retenu (`previous_response_id` ou input explicite), sans
reconstruire artificiellement une réponse Chat Completions.

Chaque entrée en attente est consommée une fois, limitée en nombre et supprimée
sur succès, erreur terminale ou destruction de l'adapter. Un `callId` inconnu
retourne une erreur DomOS explicite ; il ne transforme pas silencieusement le
résultat en texte utilisateur.

## 3. Tâches

### Tâche 1 - Isoler le mapping Responses

Créer `responsesMapper.ts` avec fonctions pures pour les inputs, tools, outputs,
usage et erreurs. Remplacer le convertisseur Chat Completions sans dupliquer les
schémas dans `OpenAIAdapter.ts`.

### Tâche 2 - Migrer `chat()`

Remplacer `chat.completions.create` par `responses.create`, préserver le prompt
DomOS, mapper texte/tools/usage et émettre exactement une séquence d'événements
DomOS par réponse.

### Tâche 3 - Migrer `handleToolResult()`

Soumettre un `function_call_output`, continuer la réponse, gérer plusieurs tool
calls issus d'une même réponse et garantir l'idempotence locale du `callId`.

### Tâche 4 - Streaming et annulation

Utiliser le streaming Responses uniquement derrière un contrat DomOS existant.
Propager un `AbortSignal` si `LLMRequest` le permet ; sinon documenter le prérequis
core au lieu d'ajouter une option OpenAI au serveur. Tester la fermeture anticipée
du stream et la libération des listeners.

### Tâche 5 - Capacités et compatibilité

Retirer les modèles obsolètes codés en dur. Les capacités doivent décrire le
modèle configuré sans prétendre maintenir un catalogue provider statique. Garder
les exports publics du package et vérifier `baseURL`.

### Tâche 6 - Tests et exemple réel

Couvrir texte, conversation, zéro output, multi-output, tool unique/multiple,
résultat, JSON invalide, erreur 401/429/5xx, abort et absence de fuite de clé.
Ajouter un exemple serveur minimal utilisant le même chemin que la démo.

## 4. Fichiers cibles

- `packages/adapter-openai/src/OpenAIAdapter.ts`
- `packages/adapter-openai/src/responsesMapper.ts` à créer
- `packages/adapter-openai/src/toolConverter.ts`
- `packages/adapter-openai/src/events.ts`
- `packages/adapter-openai/src/index.ts`
- `packages/adapter-openai/tests/OpenAIAdapter.test.ts` à créer
- `apps/demo-server/` pour l'exemple validé, sans nouveau serveur parallèle.

## 5. Definition of Done

- [ ] Aucun appel Chat Completions dans le chemin standard.
- [ ] Texte, usage et function calls sont mappés sans type provider public.
- [ ] Tool result continue la bonne réponse et ne peut être rejoué.
- [ ] Plusieurs tool calls d'une réponse sont couverts.
- [ ] Erreurs, rate limit, JSON invalide et annulation sont couverts.
- [ ] Aucune clé ou payload sensible n'apparaît dans les logs.
- [ ] Tests adapter + serveur + build package/monorepo passent.
- [ ] Aucun changement realtime ou ADTP n'est mélangé.

## 6. Hors scope

Built-in tools OpenAI, Agents SDK, Realtime, WebRTC, STT/TTS et refonte du
`ToolRouter`.

## 7. Commit recommandé

`feat(openai): migrate text adapter to responses api`
