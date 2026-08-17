# Concepts OwlLayer AI

Ce document fixe le vocabulaire de base d'OwlLayer AI. Il sert de reference
commune pour aligner l'Agentic UI SDK, l'OwlLayer AI Runtime et la
documentation.

OwlLayer AI est un Agentic UI SDK. Son role n'est pas de generer une interface
a la place de l'application. Son role est de rendre une interface existante
pilotable par un agent IA, avec des actions explicites, un contexte observable
et des garde-fous.

Le depot et le code actuels conservent des identifiants techniques `DomOS*`,
`ADTP*` et `@domos/*`. Ces noms sont des compatibilites d'implementation, pas
le vocabulaire a employer pour decrire la marque dans une nouvelle page.

## Agentic UI

Une Agentic UI est une interface produit qui expose volontairement certaines actions a un agent.

L'agent ne manipule pas librement le DOM. Il ne devine pas les clics a effectuer. Il recoit un contexte structure et une liste de tools declares par l'application, puis il agit uniquement par ces points d'entree.

Cela distingue OwlLayer AI de deux approches proches :

- un chatbot classique, qui repond surtout par du texte
- une Generative UI, qui fabrique une nouvelle interface au lieu de piloter l'interface existante

Dans OwlLayer AI, l'application reste proprietaire de sa logique metier.
L'agent ne fait qu'appeler les actions que le produit accepte d'exposer.

## Runtime client : `DomOSClient`

`DomOSClient` est le runtime front commun actuel de l'OwlLayer AI Runtime,
fourni par `@domos/core`.

Les SDK React, Vue, Svelte, Angular et Browser s'appuient sur ce meme client. Chaque SDK ajoute une integration idiomatique pour son framework, mais le contrat de communication reste partage :

- connexion WebSocket AITP, avec compatibilite wire ADTP 1.0.0
- registre local des tools
- synchronisation du contexte
- execution des tool calls
- emission des tool results
- etat de session et evenements runtime

React utilise des hooks, Vue des composables, Svelte des stores/actions,
Angular une facade injectable et des composants standalone, Browser une API
JavaScript directe. Ces formes changent l'ergonomie, pas le coeur du
protocole.

## AITP et compatibilite ADTP

AITP signifie **Agent-to-Interface Transfer Protocol**. Le nom ne depend pas
du DOM et couvre une interface web, mobile, native ou vocale.

Dans l'implementation actuelle, AITP designe le contrat public cible dont le
wire reste celui d'ADTP 1.0.0. Le protocole JSON relie le `DomOSClient` au
`DomOSServer` via WebSocket ou DataChannel WebRTC ordonne.

Les messages et leurs payloads ne changent pas pendant cette transition :

| Message | Direction | Role |
| --- | --- | --- |
| `HANDSHAKE_INIT` | Client vers serveur | Ouvre la session |
| `HANDSHAKE_ACK` | Serveur vers client | Confirme la session |
| `CONTEXT_UPDATE` | Client vers serveur | Synchronise URL, contexte et tools actifs |
| `USER_INPUT` | Client vers serveur | Envoie un message texte ou audio utilisateur |
| `TOOL_CALL` | Serveur vers client | Demande l'execution d'un tool client |
| `TOOL_RESULT` | Client vers serveur | Retourne le resultat du tool |
| `APPROVAL_REQUEST` | Client vers serveur ou serveur vers client | Transporte une demande HITL |
| `APPROVAL_RESPONSE` | Client vers serveur | Retourne la decision HITL |
| `AGENT_RESPONSE` | Serveur vers client | Transmet la reponse de l'agent |
| `AUDIO_STREAM` | Bidirectionnel | Transporte les chunks audio live |
| `VOICE_INPUT_END` | Client vers serveur | Termine le tour vocal |
| `VOICE_INTERRUPT` | Client vers serveur | Signale un barge-in |
| `VOICE_STATE_EVENT` | Serveur vers client | Notifie l'etat vocal |
| `SYSTEM_EVENT` | Serveur vers client | Signale erreurs, attente ou controle runtime |

Le serveur ne peut appeler que les tools connus dans le contexte de session
courant. La specification detaillee et les invariants wire sont dans
[ADTP_PROTOCOL.md](./ADTP_PROTOCOL.md), dont le chemin est conserve pendant la
transition.

## Shadow Context

Le Shadow Context est la representation legere de l'etat utile de l'interface.

Il ne copie pas tout le DOM. Il contient uniquement les informations que l'application choisit d'exposer :

- URL et titre courant
- page ou vue active
- entite visible
- selection courante
- filtres actifs
- panier, dossier, etape de workflow ou autres donnees metier utiles
- liste des tools actifs

Le contexte passif aide le modele a comprendre la situation. Il ne cree pas d'action. Les actions restent portees par les tools.

## Tools

Un tool est une action metier que l'agent est autorise a declencher.

Un bon tool a :

- un nom stable
- une description metier claire
- un schema d'arguments precis
- un niveau de risque HITL coherent
- un handler qui realise l'action et retourne un resultat utile

Les tools client sont dynamiques. Ils existent au rythme de l'interface :

- composant monte : le tool peut etre enregistre
- composant detruit : le tool doit etre retire
- navigation : la liste des tools change
- changement de contexte : le serveur recoit un nouveau `CONTEXT_UPDATE`

Ce modele evite de donner au LLM une liste globale d'actions hors contexte. L'agent voit les actions pertinentes pour l'ecran courant.

## Contrat d'execution d'un tool

Quand le serveur envoie un `TOOL_CALL`, `DomOSClient` cherche le tool local
correspondant, execute son handler, puis renvoie un `TOOL_RESULT`.

Le contrat important est simple : l'OwlLayer AI Runtime attend uniquement la
Promise retournee par le handler du tool.

Tout travail asynchrone necessaire au resultat doit donc etre retourne ou `await` dans ce handler.

Correct :

```ts
domos.registerTool(
  { name: 'archive_ticket', description: 'Archiver le ticket courant' },
  async ({ ticketId }) => {
    const result = await api.archiveTicket(ticketId);
    return { archived: true, id: result.id };
  }
);
```

Incorrect :

```ts
domos.registerTool(
  { name: 'archive_ticket', description: 'Archiver le ticket courant' },
  ({ ticketId }) => {
    api.archiveTicket(ticketId);
    return { archived: true };
  }
);
```

Dans le second exemple, l'appel API est detache. L'OwlLayer AI Runtime peut
envoyer `TOOL_RESULT` avant la fin reelle de l'action. Si l'appel API echoue
ensuite, cette erreur sort du contrat d'execution du tool.

Eviter en particulier :

- Promises lancees sans `return` ni `await`
- `subscribe()` RxJS non converti en Promise quand le resultat compte pour le tool
- `setTimeout()` utilise comme effet secondaire non attendu
- mutations d'etat declenchees apres le retour du handler alors qu'elles font partie du resultat attendu

## Angular et Zone.js

Angular ajoute une contrainte d'integration particuliere : Zone.js patche les APIs asynchrones du navigateur, notamment les Promises et certains callbacks comme WebSocket.

Cela ne change pas le contrat de l'OwlLayer AI Runtime. Le handler d'un tool
Angular doit lui aussi retourner ou `await` tout travail asynchrone necessaire
au resultat.

Un handler Angular ne doit pas s'appuyer sur un effet asynchrone detache pour
produire le resultat attendu par l'agent. Sinon, le `TOOL_RESULT` peut etre
envoye trop tot, ou une erreur peut sortir du cycle suivi par l'OwlLayer AI
Runtime.

Avec RxJS, preferer une Promise explicite quand le tool depend du resultat :

```ts
import { firstValueFrom } from 'rxjs';

domos.registerTool(
  { name: 'load_order', description: 'Charger la commande courante' },
  async ({ orderId }) => {
    const order = await firstValueFrom(orderService.load(orderId));
    return { orderId: order.id, status: order.status };
  }
);
```

Le point a retenir : React, Vue, Svelte, Browser et Angular partagent le meme
`DomOSClient`. Angular change l'environnement asynchrone autour du handler,
pas le protocole ni le contrat de retour.

## HITL

HITL signifie Human-in-the-Loop.

L'OwlLayer AI Runtime classe les tools par niveau de risque :

| Risque | Comportement attendu |
| --- | --- |
| `none` | Execution directe |
| `low` | Execution directe avec notification possible |
| `high` | Confirmation utilisateur requise |
| `critical` | Confirmation utilisateur renforcee requise |

Le risque doit refleter l'impact utilisateur reel, pas la complexite technique du handler.

Exemples :

- `search_products` : `none`
- `add_to_cart` : `low`
- `clear_cart` : `high`
- `confirm_order` ou `process_payment` : `critical`

## Widget de l'Agentic UI SDK

Le widget de l'Agentic UI SDK fournit une interface conversationnelle texte ou
voix.

Il n'est pas le coeur de l'OwlLayer AI Runtime. Le coeur reste le triptyque :

- contexte
- tools
- protocole AITP, avec compatibilite wire ADTP

Le widget est une surface utilisateur prete a l'emploi pour interagir avec
l'agent. Une application peut utiliser le widget officiel ou construire sa
propre UI autour du meme `DomOSClient`.

## LiveKit optional runtime

LiveKit peut etre branche comme runtime optionnel pour les rooms WebRTC, l'audio/video temps reel, `AgentSession`, la detection de tour, les interruptions et certains providers STT/LLM/TTS.

LiveKit ne remplace pas le coeur de l'OwlLayer AI Runtime. Dans ce modele :

- `DomOSClient` reste responsable du Shadow Context, du registre de tools client et des `TOOL_RESULT`
- `DomOSServer` reste responsable de la session, de l'API key client, de la surface effective des tools, du HITL et du `ToolRouter`
- AITP reste le nom public du canal qui synchronise contexte, tools et
  resultats ; le wire ADTP reste compatible
- LiveKit peut transporter la voix, la video, la room et la session media

Un tool appele par un modele via LiveKit doit donc revenir dans le pipeline de
l'OwlLayer AI Runtime. Un tool client ne doit pas etre execute directement dans
LiveKit ou dans un provider IA.

Dans l'implementation actuelle :

- `@domos/adapter-livekit` contient les dependances LiveKit, Gemini TTS, Gemini Live, les tokens de room et le bridge `AgentSession`
- `@domos/server` expose seulement des hooks generiques de snapshot/routage bridge et des endpoints admin rediges
- `@domos/react` peut rejoindre une room LiveKit sans remplacer la session ADTP
- `@owllayer/core/media/audio` fournit les conversions PCM/base64, WAV, Opus et MIME

Les secrets LiveKit et provider restent cote serveur. Les tokens de room sont courts et generes par un endpoint serveur. Le dashboard peut montrer l'etat operationnel du bridge, mais jamais les tokens, secrets, contextes bruts, args de tools ou resultats de tools.

Limite actuelle : Gemini est le provider implemente dans
`@domos/adapter-livekit`, mais l'architecture reste ouverte aux autres
providers LiveKit. Avec LiveKit Agents 1.5, Gemini Live ne supporte pas
l'update de tools mid-session ; l'OwlLayer AI Runtime considere ces changements
comme differes jusqu'a une nouvelle session.

## SDK frameworks

Les SDK frameworks sont des adaptateurs d'ergonomie.

| SDK | Integration principale |
| --- | --- |
| React | `DomOSProvider`, hooks, composants |
| Vue | plugin, composables, composants |
| Svelte | stores, actions, composants |
| Angular | provider, injection, signals, directives, composants standalone |
| Browser | API JavaScript directe et auto-discovery HTML |

Leur objectif est d'aligner l'Agentic UI SDK sur le cycle de vie naturel du
framework. Un tool doit vivre avec la vue ou le composant qui le rend
pertinent.

## Anti-patterns

Ces pratiques affaiblissent le modele de l'Agentic UI SDK :

- declarer tous les tools globalement au demarrage
- donner au LLM des tools hors contexte
- utiliser des noms de tools ambigus
- mettre de la logique metier critique dans une description au lieu du handler
- retourner un succes avant que l'action asynchrone soit terminee
- confondre contexte passif et action
- exposer une action risquee avec `risk: 'none'`
- creer un tool par item dans une longue liste au lieu d'un tool bien parametre

L'Agentic UI SDK fonctionne bien quand l'application expose peu d'actions,
mais des actions justes, contextualisees et verifiables.
