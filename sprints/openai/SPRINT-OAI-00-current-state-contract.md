# Sprint OAI-00 - Verrouillage des contrats OpenAI

Statut : **à exécuter après SRV-00 et ADTP-00**

## 1. Objectif

Produire la cartographie et les tests de caractérisation nécessaires pour
modifier les adapters sans casser les contrats DomOS. Ce sprint ne migre aucun
appel provider : il transforme les décisions produit en contrats exécutables.

## 2. Décisions déjà acquises

- Responses API devient le chemin texte.
- Realtime GA WebSocket est le mode live par défaut.
- WebRTC est explicite ; `auto` est opt-in et possède un fallback WebSocket.
- l'accès OpenAI reste implémenté directement avec le SDK/API officiel ; l'Agents
  SDK ne devient pas un deuxième runtime d'agent ;
- tools et HITL restent exécutés par DomOS ;
- aucun type OpenAI ne sort de `packages/adapter-openai`.

## 3. Contrats à figer

### 3.1 Configuration publique

```ts
type OpenAIRealtimeTransport = 'websocket' | 'webrtc' | 'auto';

interface OpenAIAdapterOptions {
  apiKey: string;
  model?: string;
  systemPrompt?: SystemPrompt;
  temperature?: number;
  baseURL?: string;
}

interface OpenAILiveAdapterOptions {
  apiKey: string;
  model?: string;
  voice?: string;
  systemPrompt?: SystemPrompt;
  baseURL?: string;
  mediaTransport?: OpenAIRealtimeTransport;
}
```

`mediaTransport` vaut `websocket` par défaut. La présence d'un modèle, d'une
voix ou du mot `openai` ne déclenche jamais WebRTC.

### 3.2 Frontières

| Responsabilité | Propriétaire |
|---|---|
| Mapping Responses/Realtime | `adapter-openai` |
| Sessions, tools, HITL, cleanup | `server` |
| Messages et négociation | ADTP/core |
| Capture et playback génériques | SDK clients |
| Secret OpenAI durable | serveur uniquement |

### 3.3 Compatibilité

Les exports `OpenAIAdapter`, `OpenAILiveAdapter`, `WhisperSTT` et `OpenAITTS`
restent disponibles. Chat Completions n'est pas maintenu comme second moteur
public dans `OpenAIAdapter`; une compatibilité temporaire doit être interne,
documentée et assortie d'une date de retrait si elle s'avère indispensable.

## 4. Tâches

### Tâche 1 - Cartographier le package

Documenter pour chaque méthode publique : appel OpenAI actuel, état conservé,
événements DomOS émis, erreurs, ressources ouvertes et consommateur serveur.
Inclure `OpenAIAdapter.ts`, `OpenAILiveAdapter.ts`, `events.ts`,
`toolConverter.ts`, `index.ts`, STT/TTS et les manifests.

### Tâche 2 - Créer les tests de caractérisation

Créer des tests mockés pour : texte simple, tool call + résultat, erreur API,
session live, audio, texte, tool, interruption et fermeture. Ils doivent prouver
le contrat DomOS actuel, pas la forme provider obsolète.

### Tâche 3 - Figer la matrice des événements

Créer dans le sprint une matrice `événement OpenAI → événement/callback DomOS`,
avec règles de déduplication, ordre, terminalité et erreur. Aucun `any` provider
ne doit traverser la frontière publique.

### Tâche 4 - Auditer les dépendances croisées

Identifier précisément les changements attendus dans server, core/ADTP et
clients. Toute évolution provider-neutral manquante devient une dépendance du
sprint approprié, pas un hack dans `adapter-openai`.

### Tâche 5 - Persister la décision finale

Mettre à jour le fichier de progression avec la matrice, les écarts prouvés,
les tests créés et les prérequis bloquants de OAI-01/OAI-02.

## 5. Fichiers cibles

- `packages/adapter-openai/tests/OpenAIAdapter.contract.test.ts`
- `packages/adapter-openai/tests/OpenAILiveAdapter.contract.test.ts`
- `sprints/openai/progress/SPRINT-OAI-00-progress.md`
- manifests uniquement si un runner de test manque réellement.

## 6. Definition of Done

- [ ] Interfaces et responsabilités publiques figées.
- [ ] Tests de caractérisation exécutables sans clé ni réseau.
- [ ] Matrice texte/live/tools/erreurs/cleanup persistée.
- [ ] Aucun modèle preview n'est choisi comme cible GA.
- [ ] Aucune extension ADTP spécifique à OpenAI n'est proposée.
- [ ] Préconditions de OAI-01 et OAI-02 explicitement vérifiables.
- [ ] Revue code et architecture terminée.

## 7. Hors scope

Implémentation Responses, migration GA, WebRTC, dashboard et documentation
publique.

## 8. Commit recommandé

`test(openai): lock adapter migration contracts`
