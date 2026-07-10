
# 🌐 DomOS (Distributed Operation Model for OS/Browser)
**Version:** 1.0.0-draft
**Status:** Request for Comments (RFC)
**License:** MIT
**Author:** Futur4Tech am

---

# 📑 Table des matières

1.  [Le Manifeste : Pour une UI Agentique](#1-le-manifeste)
2.  [Architecture Système](#2-architecture-système)
3.  [Le Protocole ADTP (Agent-to-DOM Transfer Protocol)](#3-le-protocole-adtp)
4.  [Implémentation Client (@domos/react)](#4-implémentation-client)
5.  [Implémentation Serveur (@domos/server)](#5-implémentation-serveur)
6.  [Sécurité & Gouvernance](#6-sécurité--gouvernance)
7.  [Roadmap & Écosystème](#7-roadmap--écosystème)
8.  [Modèle Économique (Startup Strategy)](#8-modèle-économique)

---

# 1. Le Manifeste : Pour une UI Agentique

### 1.1 Le Problème : La "Friction de l'Interface"
Depuis 30 ans, le web repose sur un paradigme simple : l'humain doit apprendre le langage de la machine.
*   L'humain doit savoir où cliquer.
*   L'humain doit savoir interpréter les icônes.
*   L'humain doit naviguer dans des arborescences complexes.

Les interfaces modernes (React, Vue, Svelte) sont devenues extrêmement réactives, mais elles restent **passives**. Elles attendent un clic.

### 1.2 La Solution : L'Interface Pilotée (Agentic UI)
Avec l'avènement des LLMs (Large Language Models) rapides (Gemini Flash, GPT-4o-mini), nous pouvons inverser ce paradigme.
Ce n'est plus à l'humain de comprendre l'interface, c'est à l'interface de comprendre l'humain.

**DomOS** n'est pas un générateur d'UI (Generative UI).
**DomOS** est un  agent qui**pilote d'UI**. Il permet à une intelligence artificielle de manipuler une application existante exactement comme un utilisateur humain le ferait, mais à la vitesse de la lumière.

> "DomOS turns your existing React components into AI Tools without rewriting your app."

---

# 2. Architecture Système

DomOS repose sur une architecture tri-partite asynchrone baptisée **"Neural-DOM Binding"**.

```ascii
+---------------------+       +----------------------+       +---------------------+
|  BROWSER (Client)   |       |  EDGE PROXY (DomOS)  |       |  LLM BRAIN (Cloud)  |
|                     |       |                      |       |                     |
|  [ React App ]      |       |  [ Session Mgr ]     |       |  [ Gemini / GPT ]   |
|        |            | ADTP  |          |           | API   |                     |
|  [ DomOS SDK ] <==========> |  [ Tool Registry ] <=======> |  [ Context Window ] |
|        |            | WS    |          |           | JSON  |                     |
|  [ Virtual DOM ]    |       |  [ Security Layer ]  |       |  [ Reasoning ]      |
+---------------------+       +----------------------+       +---------------------+
```

### 2.1 Les Composants Clés

1.  **Le Shadow Context (Client)** :
    Le SDK client maintient une représentation JSON légère de l'état actuel de l'interface (URL, titre, outils actifs). Ce contexte est synchronisé avec le serveur uniquement lors des changements significatifs (Diffing) pour économiser la bande passante.

2.  **Le Tool Registry Dynamique (Server)** :
    Contrairement aux approches classiques (LangChain) où tous les outils sont chargés au démarrage, DomOS gère un registre *éphémère*.
    *   Si l'utilisateur est sur `/checkout`, seuls les outils de paiement sont montés dans le contexte du LLM.
    *   Si l'utilisateur navigue vers `/home`, les outils de paiement sont démontés et remplacés par les outils de recherche.

3.  **La Boucle de Feedback (Loop)** :
    1.  User: "Achète ça".
    2.  DomOS Proxy: Envoie le prompt + le Shadow Context au LLM.
    3.  LLM: Décide d'appeler `add_to_cart(id="123")`.
    4.  DomOS Proxy: Valide la sécurité et transmet l'ordre au Client via WebSocket.
    5.  DomOS SDK (Client): Exécute la fonction JS locale.
    6.  DomOS SDK: Renvoie le résultat (`{success: true, newTotal: 99}`) au Proxy.
    7.  LLM: Génère la réponse vocale/texte finale.

### 2.2 LiveKit comme runtime optionnel

LiveKit Agents peut être ajouté à DomOS comme couche optionnelle pour les rooms WebRTC, l'audio/vidéo temps réel, `AgentSession`, la détection de tour, les interruptions, les pipelines STT/LLM/TTS et la téléphonie.

Cette couche ne remplace pas le **Neural-DOM Binding**. DomOS conserve :

*   le Shadow Context ;
*   le protocole ADTP ;
*   le cycle de montage/démontage des tools client ;
*   la surface effective des tools ;
*   le routage `ToolRouter` et les règles HITL ;
*   les sessions, les API keys client et le dashboard.

Un appel de tool issu d'une `AgentSession` LiveKit doit donc revenir vers DomOS. Si le tool est côté client, il continue d'être exécuté par `DomOSClient` dans le vrai contexte UI. LiveKit transporte le média et orchestre la conversation temps réel ; DomOS garde la décision de contexte, de permission et d'exécution.

Dans le monorepo, cette séparation se traduit ainsi :

*   `@domos/adapter-livekit` porte les dépendances LiveKit, les providers Gemini, les tokens de room et le bridge `AgentSession`.
*   `@domos/server` reste générique : il expose des snapshots de session, route les appels de tools bridge et alimente le dashboard, sans importer LiveKit directement.
*   `@domos/react` peut ajouter un contrôle de room, mais ne remplace pas `DomOSClient`.
*   `@domos/audio` reste une bibliothèque de codecs et formats audio ; elle ne porte pas le runtime LiveKit et ne reçoit aucun secret.

Les tokens de room doivent être générés côté serveur avec un TTL court. Les origines CORS du token endpoint doivent être configurées côté serveur pour éviter de rebuilder le client lors d'un changement de domaine. Le dashboard ne doit afficher que des vues redigées : pas de token, pas de clé provider, pas de contexte brut, pas d'arguments ou résultats de tools.

---

# 3. Le Protocole ADTP (Agent-to-DOM Transfer Protocol)

Pour standardiser la communication, nous définissons le protocole **ADTP**. C'est un protocole JSON sur WebSocket.

### 3.1 Structure des Messages

Tous les messages suivent cette structure de base :

```typescript
type ADTPMessage = {
  id: string;           // UUID v4
  type: MessageType;    // Voir énumération ci-dessous
  timestamp: number;
  payload: any;
  meta?: {
    sessionId: string;
    token?: string;
  }
}
```

### 3.2 Types de Messages (`MessageType`)

#### A. Client vers Serveur (Upstream)

1.  `HANDSHAKE_INIT`
    *   Envoyé à la connexion. Contient la clé API publique et les métadonnées du device.
    *   `payload: { apiKey: string, userAgent: string, viewport: string }`

2.  `CONTEXT_UPDATE`
    *   Envoyé quand l'UI change (navigation, montage de composant).
    *   `payload: { url: string, activeTools: ToolDefinition[] }`

3.  `TOOL_RESULT`
    *   Réponse à une exécution d'outil.
    *   `payload: { callId: string, result: any, status: 'success' | 'error' }`

4.  `USER_INPUT`
    *   Audio (binaire) ou Texte.
    *   `payload: { modality: 'text' | 'audio', content: string | Blob }`

#### B. Serveur vers Client (Downstream)

1.  `TOOL_CALL`
    *   Demande d'exécution d'une fonction sur le client.
    *   `payload: { callId: string, name: string, args: Record<string, any> }`

2.  `AGENT_RESPONSE`
    *   Réponse conversationnelle (streaming).
    *   `payload: { chunk: string, done: boolean }`

3.  `SYSTEM_EVENT`
    *   Commandes de contrôle (reload, redirect, error).

### 3.3 Exemple de Flux (Sequence)

```json
// 1. Context Update (Client -> Server)
{
  "type": "CONTEXT_UPDATE",
  "payload": {
    "url": "/products/sneakers",
    "activeTools": [
      { "name": "add_to_cart", "schema": { ... } },
      { "name": "get_reviews", "schema": { ... } }
    ]
  }
}

// 2. User Input (Client -> Server)
{
  "type": "USER_INPUT",
  "payload": { "content": "Ajoute les baskets rouges" }
}

// 3. Tool Call (Server -> Client)
{
  "type": "TOOL_CALL",
  "payload": {
    "callId": "call_8723",
    "name": "add_to_cart",
    "args": { "color": "red", "quantity": 1 }
  }
}

// 4. Tool Result (Client -> Server)
{
  "type": "TOOL_RESULT",
  "payload": {
    "callId": "call_8723",
    "result": { "success": true, "cartTotal": 120 }
  }
}
```

---

# 4. Implémentation Client (@domos/react)

Le paquet client est conçu pour être "Drop-in". Il utilise les **React Hooks** et les **Contexts** pour s'intégrer au cycle de vie de React.

### 4.1 Installation

```bash
npm install @domos/core @domos/react
```

### 4.2 Le Provider Global (`DomOSProvider`)

Ce composant gère la connexion WebSocket et l'état global.

```tsx
// App.tsx
import { DomOSProvider } from '@domos/react';

export default function App() {
  return (
    <DomOSProvider
      apiKey="pk_live_..."
      endpoint="wss://api.domos.ai/v1/stream"
      config={{
        voice: 'active', // Active le mode vocal par défaut
        debug: true
      }}
    >
      <Router />
    </DomOSProvider>
  );
}
```

### 4.3 Le Hook Magique : `useAgentTool`

C'est l'innovation majeure. Au lieu de définir des outils dans un fichier JSON statique côté serveur, vous les définissez **au cœur de vos composants**. Cela donne à l'IA accès au contexte local (state, props) du composant.

**Signature :**
```typescript
function useAgentTool<T>(
  definition: {
    name: string;
    description: string;
    schema: ZodSchema<T>; // Validation forte des arguments
  },
  callback: (args: T) => Promise<any> | any
): void;
```

**Exemple Réel :**

```tsx
import { useState } from 'react';
import { useAgentTool } from '@domos/react';
import { z } from 'zod';

export const ProductCard = ({ product }) => {
  const [isLiked, setIsLiked] = useState(false);

  // 🪄 L'outil "like_product" n'existe QUE quand ce composant est affiché
  useAgentTool({
    name: 'like_product',
    description: `Ajoute le produit ${product.name} aux favoris.`,
    schema: z.object({
      shouldLike: z.boolean().describe("True pour liker, False pour unliker")
    }),
  }, async ({ shouldLike }) => {
    // L'IA a accès au scope local !
    setIsLiked(shouldLike);
    await api.post(`/products/${product.id}/like`, { status: shouldLike });
    return shouldLike ? "Produit ajouté aux favoris" : "Retiré des favoris";
  });

  return (
    <div className={isLiked ? 'bg-pink-100' : 'bg-white'}>
      <h1>{product.name}</h1>
      {/* ... */}
    </div>
  );
};
```

### 4.4 Le Hook de Contexte : `useAgentContext`

Permet d'injecter des données passives au LLM sans créer d'outil.

```tsx
import { useAgentContext } from '@domos/react';

export const UserProfile = ({ user }) => {
  // Le LLM saura toujours qui est l'utilisateur connecté
  useAgentContext({
    userId: user.id,
    userRole: user.role,
    lastLogin: user.lastLogin
  });

  return <div>Welcome {user.name}</div>;
};
```

---

# 5. Implémentation Serveur (@domos/server)

Le serveur agit comme un orchestrateur. Il peut être hébergé par le client (Self-Hosted) ou utilisé via notre Cloud (DomOS Cloud).

### 5.1 Structure Type (Node.js / Express)

```typescript
import { DomOSServer } from '@domos/server';
import { GoogleAdapter } from '@domos/adapter-google';

const server = new DomOSServer({
  port: 3000,

  // Choix du cerveau (Agnostique)
  llm: new GoogleAdapter({
    model: 'gemini-1.5-flash',
    apiKey: process.env.GEMINI_API_KEY
  }),

  // Sécurité
  maxConnections: 100,
  virtualLines: {
    lines: [{ count: 10 }]
  }
});

// Authentification client WebSocket
server.addApiKey(process.env.DOMOS_CLIENT_API_KEY!);

// Événement personnalisé (Server-Side Tools)
server.tool('check_inventory', async ({ productId }) => {
  const stock = await db.products.find(productId);
  return stock.quantity;
});

server.listen();
```

### 5.2 Gestion de la Mémoire (State Management)

Le serveur maintient une **Session Graph** pour chaque connexion WebSocket active.
Ce graphe contient :
1.  L'historique conversationnel (Messages).
2.  L'arbre des outils actifs (envoyé par le client via `CONTEXT_UPDATE`).
3.  Les métriques d'utilisation (Tokens, Latence).

---

# 6. Sécurité & Gouvernance

La sécurité est le plus grand défi des UI pilotées par IA. DomOS intègre le concept de **"Human-in-the-loop" (HITL)** au niveau protocolaire.

### 6.1 Niveaux de Dangerosité des Outils

Lors de la définition d'un outil côté client, le développeur peut spécifier un niveau de risque.

```typescript
useAgentTool({
  name: 'delete_account',
  risk: 'high', // 'none' | 'low' | 'high' | 'critical'
  // ...
});
```

### 6.2 Interception & Confirmation

Le SDK DomOS gère nativement ces niveaux de risque :

*   **Risk: 'none'** (ex: navigation, lecture) ➔ Exécution immédiate.
*   **Risk: 'low'** (ex: ajout panier) ➔ Notification visuelle ("L'IA a ajouté un article").
*   **Risk: 'high'** (ex: paiement, suppression) ➔ **Blocage par le SDK**.
    *   L'IA reçoit une erreur temporaire : `WAITING_USER_APPROVAL`.
    *   Le SDK affiche une modale native à l'utilisateur : *"L'Assistant souhaite supprimer votre compte. Confirmer ?"*.
    *   Si l'utilisateur clique "Oui", l'action est exécutée et le résultat renvoyé.

### 6.3 Isolation du Shadow DOM

Le SDK injecte ses composants UI (Modales de confirmation, Indicateurs d'écoute) dans un **Shadow DOM fermé**. Cela garantit que :
1.  Le CSS du site hôte ne casse pas l'UI de l'agent.
2.  L'IA ne peut pas "halluciner" et cliquer elle-même sur le bouton de confirmation de sécurité (car elle manipule le Light DOM, pas le Shadow DOM de sécurité).

---

# 7. Roadmap & Écosystème

### Phase 1 : Core & React (Mois 1-2)
*   Release de `@domos/core` (Protocole & Types).
*   Release de `@domos/react` (Hooks).
*   Connecteur Gemini Flash & Pro.
*   Documentation de base.

### Phase 2 : Framework Agnosticism (Mois 3-4)
*   Sortie de `@domos/vue` (Composition API).
*   Sortie de `@domos/svelte`.
*   Sortie de `@domos/vanilla` (Pour Webflow/Shopify/Wordpress via CDN).

### Phase 3 : DomOS Studio (Mois 5-6)
*   Développement d'une interface web pour les développeurs.
*   Visualisation en temps réel de l'arbre des outils actifs.
*   Replay des sessions utilisateurs pour le débogage ("Pourquoi l'IA a cliqué là ?").
*   Playground pour tester les prompts système.

### Phase 4 : Enterprise (Mois 6+)
*   Hébergement managé (SaaS).
*   Analytiques avancées.
*   Fine-tuning des modèles sur les données d'utilisation spécifiques au client.

---

# 8. Modèle Économique (Startup Strategy)

Comment **AutoFlow AI** monétise ce framework Open Source ?

### 1. Modèle "Red Hat" (Support & Hosting)
Le framework est gratuit (MIT). Mais gérer des milliers de WebSockets simultanés, la latence LLM, et la sécurité est complexe.
**Produit :** DomOS Cloud.
*   API Key unique.
*   On gère l'infrastructure WebSocket.
*   On gère le rate-limiting et les coûts LLM.
*   Dashboard d'analytics clé en main.

### 2. Modèle "App Store" (Plugins)
Création d'une marketplace de "Skills" pré-packagés.
*   *Exemple :* Un développeur crée un pack "Shopify Advanced Tools" (gestion des retours, suivi colis, recommandation).
*   Il le vend sur la marketplace DomOS. AutoFlow prend une commission.

### 3. Lead Generation Massif
En offrant le standard de l'industrie, chaque développeur qui installe `npm install @domos/react` devient un prospect qualifié pour les solutions Enterprise de votre startup.

---

# Conclusion

**DomOS** n'est pas juste une librairie. C'est une tentative de standardiser la communication entre l'Intelligence Artificielle et le Web. En rendant le DOM "intelligent" et pilotable, nous ouvrons la voie à une nouvelle ère d'applications : les **Self-Driving Apps**.

Ce framework est la brique technologique fondamentale qui manque aujourd'hui pour passer des "Chatbots" (texte) aux "Agents" (action).
