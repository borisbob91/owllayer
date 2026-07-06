# Concepts DomOS

Ce document fixe le vocabulaire de base de DomOS. Il sert de reference commune pour aligner les SDK, le serveur et la documentation.

DomOS est un framework d'Agentic UI. Son role n'est pas de generer une interface a la place de l'application. Son role est de rendre une interface existante pilotable par un agent IA, avec des actions explicites, un contexte observable et des garde-fous.

## Agentic UI

Une Agentic UI est une interface produit qui expose volontairement certaines actions a un agent.

L'agent ne manipule pas librement le DOM. Il ne devine pas les clics a effectuer. Il recoit un contexte structure et une liste de tools declares par l'application, puis il agit uniquement par ces points d'entree.

Cela distingue DomOS de deux approches proches :

- un chatbot classique, qui repond surtout par du texte
- une Generative UI, qui fabrique une nouvelle interface au lieu de piloter l'interface existante

Dans DomOS, l'application reste proprietaire de sa logique metier. L'agent ne fait qu'appeler les actions que le produit accepte d'exposer.

## DomOSClient

`DomOSClient` est le runtime front commun fourni par `@domos/core`.

Les SDK React, Vue, Svelte, Angular et Browser s'appuient sur ce meme client. Chaque SDK ajoute une integration idiomatique pour son framework, mais le contrat de communication reste partage :

- connexion WebSocket ADTP
- registre local des tools
- synchronisation du contexte
- execution des tool calls
- emission des tool results
- etat de session et evenements runtime

React utilise des hooks, Vue des composables, Svelte des stores/actions, Angular une facade injectable et des composants standalone, Browser une API JavaScript directe. Ces formes changent l'ergonomie, pas le coeur du protocole.

## ADTP

ADTP signifie Agent-to-DOM Transfer Protocol.

C'est le protocole JSON sur WebSocket qui relie le client DomOS au serveur DomOS.

Les messages principaux sont :

| Message | Direction | Role |
| --- | --- | --- |
| `HANDSHAKE_INIT` | Client vers serveur | Ouvre la session |
| `HANDSHAKE_ACK` | Serveur vers client | Confirme la session |
| `CONTEXT_UPDATE` | Client vers serveur | Synchronise URL, contexte et tools actifs |
| `USER_INPUT` | Client vers serveur | Envoie un message texte ou audio utilisateur |
| `TOOL_CALL` | Serveur vers client | Demande l'execution d'un tool client |
| `TOOL_RESULT` | Client vers serveur | Retourne le resultat du tool |
| `AGENT_RESPONSE` | Serveur vers client | Transmet la reponse de l'agent |
| `SYSTEM_EVENT` | Bidirectionnel | Signale erreurs, notifications ou controle runtime |

Le serveur ne peut appeler que les tools connus dans le contexte de session courant.

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

Quand le serveur envoie un `TOOL_CALL`, `DomOSClient` cherche le tool local correspondant, execute son handler, puis renvoie un `TOOL_RESULT`.

Le contrat important est simple : DomOS attend uniquement la Promise retournee par le handler du tool.

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

Dans le second exemple, l'appel API est detache. DomOS peut envoyer `TOOL_RESULT` avant la fin reelle de l'action. Si l'appel API echoue ensuite, cette erreur sort du contrat d'execution du tool.

Eviter en particulier :

- Promises lancees sans `return` ni `await`
- `subscribe()` RxJS non converti en Promise quand le resultat compte pour le tool
- `setTimeout()` utilise comme effet secondaire non attendu
- mutations d'etat declenchees apres le retour du handler alors qu'elles font partie du resultat attendu

## Angular et Zone.js

Angular ajoute une contrainte d'integration particuliere : Zone.js patche les APIs asynchrones du navigateur, notamment les Promises et certains callbacks comme WebSocket.

Cela ne change pas le contrat DomOS. Le handler d'un tool Angular doit lui aussi retourner ou `await` tout travail asynchrone necessaire au resultat.

Un handler Angular ne doit pas s'appuyer sur un effet asynchrone detache pour produire le resultat attendu par l'agent. Sinon, le `TOOL_RESULT` peut etre envoye trop tot, ou une erreur peut sortir du cycle suivi par DomOS.

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

Le point a retenir : React, Vue, Svelte, Browser et Angular partagent le meme `DomOSClient`. Angular change l'environnement asynchrone autour du handler, pas le protocole ni le contrat de retour.

## HITL

HITL signifie Human-in-the-Loop.

DomOS classe les tools par niveau de risque :

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

## Widget

Le widget DomOS fournit une interface conversationnelle texte ou voix.

Il n'est pas le coeur de DomOS. Le coeur reste le triptyque :

- contexte
- tools
- protocole ADTP

Le widget est une surface utilisateur prete a l'emploi pour interagir avec l'agent. Une application peut utiliser le widget officiel ou construire sa propre UI autour du meme `DomOSClient`.

## SDK frameworks

Les SDK frameworks sont des adaptateurs d'ergonomie.

| SDK | Integration principale |
| --- | --- |
| React | `DomOSProvider`, hooks, composants |
| Vue | plugin, composables, composants |
| Svelte | stores, actions, composants |
| Angular | provider, injection, signals, directives, composants standalone |
| Browser | API JavaScript directe et auto-discovery HTML |

Leur objectif est d'aligner DomOS sur le cycle de vie naturel du framework. Un tool doit vivre avec la vue ou le composant qui le rend pertinent.

## Anti-patterns

Ces pratiques affaiblissent le modele DomOS :

- declarer tous les tools globalement au demarrage
- donner au LLM des tools hors contexte
- utiliser des noms de tools ambigus
- mettre de la logique metier critique dans une description au lieu du handler
- retourner un succes avant que l'action asynchrone soit terminee
- confondre contexte passif et action
- exposer une action risquee avec `risk: 'none'`
- creer un tool par item dans une longue liste au lieu d'un tool bien parametre

DomOS fonctionne bien quand l'application expose peu d'actions, mais des actions justes, contextualisees et verifiables.
