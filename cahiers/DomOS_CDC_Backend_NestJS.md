DomOS SDK  —  CdC Technique Backend NestJS  —  Futur4Tech






**DomOS**

*DOM Operating System*



**CAHIER DES CHARGES TECHNIQUE**

**Architecture Backend — NestJS**

Serveur DomOS Cloud Pro — @domos/server

Version 1.0  —  Mars 2026



|**Projet**|DomOS — DOM Operating System|
| :- | :- |
|**Type de document**|CdC Technique Backend NestJS|
|**Complément de**|CdC Technique général (Doc 2)|
|**Version SDK**|v0.2 (cible : v1.0)|
|**Organisation**|Futur4Tech|
|**Responsable**|Kouakou Boris (CEO)|
|**Date**|Mars 2026|
|**Runtime**|Node.js ≥ 20 LTS + NestJS ≥ 10|


# **Table des matières**





# **1. Contexte et objectifs**
## **1.1 Positionnement de ce document**
Ce document est le complément technique du CdC Technique général (Doc 2). Il se concentre exclusivement sur l'architecture backend NestJS du serveur DomOS Cloud Pro. Il ne décrit pas du code à écrire immédiatement, mais formalise les choix d'architecture, la structure des modules, les responsabilités de chaque composant et les contrats d'interface entre couches.

Le backend NestJS est le cœur opérationnel de DomOS Cloud Pro. Il orchestre :

- Le protocole ADTP en temps réel via WebSocket Gateway.
- Les appels LLM via les adaptateurs (Google, OpenAI, Anthropic).
- La gestion des sessions, des clés API et de l'authentification.
- Le suivi des tokens consommés, des durées de conversations vocales et des coûts LLM.
- La configuration des providers LLM et des modèles par projet.
- La gestion des rôles et des accès multi-tenant.
- La persistance des données via Redis (temps réel) et PostgreSQL (données métier).
## **1.2 Périmètre du backend NestJS**

|**Module**|**Responsabilité principale**|**Protocole exposé**|
| :- | :- | :- |
|ADTP Gateway|Gestion des connexions WebSocket ADTP — handshake, routing des messages, sessions|WebSocket (ws://)|
|Admin API|API REST sécurisée pour la gestion du serveur (auth, clés, outils, statut)|HTTP REST|
|LLM Orchestration|Appels LLM, boucle tool call → result, streaming, gestion des adaptateurs|Interne|
|Session Manager|Cycle de vie des sessions WebSocket, persistance Redis, reconnexion|Interne + Redis|
|Provider Manager|Configuration des providers LLM et modèles par projet depuis le dashboard|HTTP REST|
|Role & Access Manager|Gestion des rôles (Owner/Admin/Dev/Viewer), permissions, membres d'organisation|HTTP REST|
|Metrics & Tracking|Suivi tokens, durée vocale, coût LLM, historique conversations|HTTP REST + Redis|
|Auth Module|Authentification admin (bcrypt + JWT), guards NestJS, rate limiting|HTTP REST|


# **2. Architecture NestJS — Vue générale**
## **2.1 Stack technique NestJS**

|**Technologie**|**Version**|**Rôle dans le backend**|
| :- | :- | :- |
|NestJS|≥ 10.x|Framework principal — modules, DI, guards, pipes, interceptors, gateways|
|@nestjs/websockets|≥ 10.x|WebSocket Gateway pour le protocole ADTP|
|@nestjs/platform-ws|≥ 10.x|Adaptateur WebSocket natif (ws) pour NestJS|
|@nestjs/jwt|≥ 10.x|Génération et validation des tokens JWT (admin dashboard)|
|@nestjs/passport|≥ 10.x|Stratégies d'authentification (JWT, Local)|
|@nestjs/throttler|≥ 5.x|Rate limiting sur les endpoints REST (login, API publique)|
|@nestjs/config|≥ 3.x|Gestion centralisée des variables d'environnement (.env)|
|@nestjs/schedule|≥ 4.x|Tâches planifiées (nettoyage sessions, calcul métriques périodiques)|
|@nestjs/event-emitter|≥ 2.x|Bus d'événements internes (session events, tool call events)|
|TypeORM|≥ 0.3.x|ORM pour PostgreSQL — entités, migrations, repositories|
|ioredis|≥ 5.x|Client Redis pour sessions, cache, rate limiting, pub/sub|
|Zod|^3.x|Validation des messages ADTP et des DTOs (en complément des class-validator)|
|bcrypt|^5.x|Hashage des mots de passe admin|
|class-validator + class-transformer|latest|Validation et transformation des DTOs NestJS|
|Swagger (@nestjs/swagger)|≥ 7.x|Documentation automatique de l'API REST admin|

## **2.2 Structure des dossiers NestJS**
Le backend DomOS est organisé selon la structure NestJS standard avec un module par domaine fonctionnel :

domos/packages/server/src/

├── main.ts                        # Bootstrap NestJS — HTTP + WebSocket

├── app.module.ts                  # Module racine — imports de tous les modules

│

├── adtp/                          # Module WebSocket Gateway ADTP

│   ├── adtp.gateway.ts            # @WebSocketGateway — gestion connexions WS

│   ├── adtp.service.ts            # Logique métier ADTP (routing messages)

│   ├── adtp.module.ts

│   └── dto/                       # DTOs des messages ADTP

│

├── session/                       # Module gestion des sessions

│   ├── session.service.ts         # Cycle de vie sessions, Redis

│   ├── session.repository.ts      # Persistance Redis des sessions

│   ├── session.module.ts

│   └── entities/session.entity.ts # Entité PostgreSQL sessions archivées

│

├── llm/                           # Module orchestration LLM

│   ├── llm-orchestrator.service.ts # Boucle appel LLM → tool call → result

│   ├── llm-adapter.registry.ts    # Registre des adaptateurs LLM

│   ├── llm.module.ts

│   └── adapters/                  # Adaptateurs concrets (Google, OpenAI, Anthropic)

│

├── provider/                      # Module gestion providers & modèles LLM

│   ├── provider.controller.ts     # REST CRUD providers par projet

│   ├── provider.service.ts

│   ├── provider.module.ts

│   └── entities/provider.entity.ts

│

├── auth/                          # Module authentification admin

│   ├── auth.controller.ts         # POST /admin/login, /logout

│   ├── auth.service.ts            # bcrypt, JWT, sessions

│   ├── auth.module.ts

│   ├── guards/                    # JwtAuthGuard, RolesGuard, ThrottlerGuard

│   └── strategies/                # JwtStrategy, LocalStrategy

│

├── role/                          # Module gestion rôles & accès

│   ├── role.controller.ts         # REST CRUD membres & rôles

│   ├── role.service.ts

│   ├── role.module.ts

│   └── entities/                  # Member, Organization, Role entities

│

├── metrics/                       # Module métriques & tracking

│   ├── metrics.controller.ts      # REST endpoints métriques

│   ├── metrics.service.ts         # Calcul tokens, durée vocale, coût

│   ├── metrics.repository.ts      # Redis + TimescaleDB

│   └── metrics.module.ts

│

├── keys/                          # Module gestion clés API client

│   ├── keys.controller.ts         # REST CRUD clés API

│   ├── keys.service.ts

│   ├── keys.module.ts

│   └── entities/api-key.entity.ts

│

├── project/                       # Module gestion des projets Cloud

│   ├── project.controller.ts

│   ├── project.service.ts

│   ├── project.module.ts

│   └── entities/project.entity.ts

│

└── shared/                        # Utilitaires partagés

`    `├── filters/                   # Exception filters globaux

`    `├── interceptors/              # Logging, transform response

`    `├── pipes/                     # ZodValidationPipe, ParseUUIDPipe

`    `└── decorators/                # @CurrentUser(), @Roles(), @ProjectId()

## **2.3 Bootstrap NestJS (main.ts)**
Le serveur DomOS démarre deux serveurs en parallèle depuis un seul processus NestJS :

- Serveur HTTP (Fastify ou Express) — pour l'API REST admin et les endpoints de gestion Cloud Pro.
- Serveur WebSocket — pour le protocole ADTP temps réel via @WebSocketGateway.

La configuration du bootstrap inclut la validation globale des DTOs (ValidationPipe), les filtres d'exception globaux, les interceptors de logging, et l'initialisation de Swagger pour la documentation de l'API admin.

*ℹ️  NestJS permet d'utiliser le même port pour HTTP et WebSocket grâce à l'adaptateur @nestjs/platform-ws. Le chemin WebSocket (/domos) est distinct des routes HTTP (/admin/\*, /api/\*).*


# **3. Module ADTP — WebSocket Gateway**
## **3.1 Rôle et responsabilités**
Le module ADTP est le point d'entrée de toutes les connexions WebSocket des clients DomOS (SDK React, Vue, Svelte, Flutter). Il implémente le protocole ADTP complet et orchestre la communication bidirectionnelle entre les clients et l'orchestrateur LLM.
## **3.2 ADTPGateway — @WebSocketGateway**
La classe ADTPGateway est décorée avec @WebSocketGateway et gère les événements WebSocket suivants :

|**Événement / Cycle**|**Décorateur NestJS**|**Responsabilité**|
| :- | :- | :- |
|Connexion client|@OnGatewayConnection|Validation clé API, création session, envoi HANDSHAKE\_ACK|
|Déconnexion client|@OnGatewayDisconnect|Fermeture session, nettoyage Redis, log événement|
|HANDSHAKE\_INIT|@SubscribeMessage('HANDSHAKE\_INIT')|Validation version protocole, confirmation capacités|
|CONTEXT\_UPDATE|@SubscribeMessage('CONTEXT\_UPDATE')|Mise à jour tool registry session, Shadow Context, URL courante|
|USER\_INPUT (text)|@SubscribeMessage('USER\_INPUT')|Déclenchement pipeline LLM Orchestrator (mode texte)|
|USER\_INPUT (audio)|@SubscribeMessage('USER\_INPUT')|Déclenchement pipeline LLM Orchestrator (mode audio PCM)|
|TOOL\_RESULT|@SubscribeMessage('TOOL\_RESULT')|Transmission résultat tool à l'orchestrateur LLM en attente|
|SYSTEM\_EVENT|Émis par le serveur|Notification d'erreur ou d'état vers le client|

## **3.3 Pipeline de traitement d'un message ADTP**
Chaque message entrant suit le pipeline NestJS suivant avant d'atteindre le handler du Gateway :

1. Guard d'authentification WebSocket — vérifie que la clé API est valide (ClientAuthGuard).
1. Pipe de validation — ZodValidationPipe valide la structure du message ADTP.
1. Handler @SubscribeMessage — logique métier du Gateway.
1. ADTPService — délègue la logique complexe au service dédié.
1. Émission de la réponse — server.to(socketId).emit(type, payload).
## **3.4 Gestion des connexions simultanées**
Le Gateway maintient une Map des connexions actives indexée par sessionId. Chaque connexion est associée à :

- Un socket WebSocket (instance ws.WebSocket).
- Un sessionId unique (UUID v4 généré au handshake).
- Un projectId — le projet DomOS auquel appartient la connexion.
- La liste des tools actifs (registry) — mise à jour à chaque CONTEXT\_UPDATE.
- Le Shadow Context courant — données contextuelles de la page active.
- L'historique de conversation en mémoire — transmis à chaque appel LLM.
- Les métriques de session en cours — tokens, durée vocale, tool calls.

*ℹ️  La limite de connexions simultanées par clé API est configurée dans le module Keys (maxConnectionsPerKey). Le Gateway vérifie cette limite à chaque nouvelle connexion et rejette les connexions excédentaires avec un SYSTEM\_EVENT kind: error.*
## **3.5 DTOs des messages ADTP**
Chaque type de message ADTP a un DTO TypeScript correspondant dans adtp/dto/. Ces DTOs sont validés par ZodValidationPipe. Exemples de DTOs principaux :

|**DTO**|**Fichier**|**Champs principaux**|
| :- | :- | :- |
|HandshakeInitDto|handshake-init.dto.ts|protocolVersion: string, capabilities: string[]|
|ContextUpdateDto|context-update.dto.ts|url?: string, title?: string, activeTools?: ToolDeclaration[], data?: Record<string,unknown>|
|UserInputDto|user-input.dto.ts|modality: 'text' | 'audio', content: string, mimeType?: string|
|ToolResultDto|tool-result.dto.ts|callId: string, result?: unknown, status: 'success' | 'error', error?: string|
|AdtpMessageDto|adtp-message.dto.ts|type: AdtpMessageType, payload: unknown, meta: { id, timestamp, version }|


# **4. Module Auth — Authentification Admin**
## **4.1 Architecture d'authentification**
Le module Auth gère l'authentification des administrateurs et des membres du dashboard DomOS Cloud Pro. Il utilise une combinaison de JWT (tokens d'accès courts) et de refresh tokens (durée longue) pour une sécurité optimale.

|**Composant**|**Type NestJS**|**Responsabilité**|
| :- | :- | :- |
|AuthController|@Controller('/admin/auth')|Endpoints login, logout, refresh, me|
|AuthService|@Injectable()|Logique bcrypt, génération JWT, gestion refresh tokens|
|LocalStrategy|@Injectable() (Passport)|Validation username/password via bcrypt|
|JwtStrategy|@Injectable() (Passport)|Validation du token JWT sur les routes protégées|
|JwtAuthGuard|@Injectable() (Guard)|Guard appliqué sur toutes les routes admin protégées|
|RolesGuard|@Injectable() (Guard)|Vérifie que le rôle de l'utilisateur autorise l'accès|
|ThrottlerGuard|@Injectable() (Guard)|Rate limiting sur POST /admin/auth/login|

## **4.2 Endpoints d'authentification**

|**Endpoint**|**Méthode**|**Guard**|**Description**|**Réponse**|
| :- | :- | :- | :- | :- |
|POST /admin/auth/login|POST|ThrottlerGuard (5/15min)|Login username + password → JWT + refresh token|{ accessToken, refreshToken, expiresIn }|
|POST /admin/auth/logout|POST|JwtAuthGuard|Invalidation du refresh token courant|{ success: true }|
|POST /admin/auth/refresh|POST|Aucun (refresh token)|Génération d'un nouveau accessToken|{ accessToken, expiresIn }|
|GET /admin/auth/me|GET|JwtAuthGuard|Profil de l'utilisateur connecté + rôles|{ id, username, roles, organizations }|

## **4.3 Stratégie JWT**
Le module Auth utilise deux types de tokens JWT distincts :

- Access Token — durée courte (1 heure). Transmis dans le header Authorization: Bearer <token>. Contient : userId, organizationId, roles, projectIds autorisés.
- Refresh Token — durée longue (7 jours). Stocké côté client (httpOnly cookie ou localStorage sécurisé). Stocké hashé en Redis côté serveur pour révocation.

La rotation des refresh tokens est implémentée : chaque appel à /refresh invalide l'ancien refresh token et en génère un nouveau. Cela limite la fenêtre d'exploitation en cas de vol de token.
## **4.4 Guards NestJS — Détail**

|**Guard**|**Décorateur d'activation**|**Logique de vérification**|
| :- | :- | :- |
|JwtAuthGuard|@UseGuards(JwtAuthGuard) ou global|Décode le JWT, vérifie signature + expiration, injecte l'utilisateur dans req.user|
|RolesGuard|@UseGuards(JwtAuthGuard, RolesGuard)|Lit le décorateur @Roles('admin','owner') sur le handler, compare avec req.user.roles|
|ProjectGuard|@UseGuards(JwtAuthGuard, ProjectGuard)|Vérifie que l'utilisateur a accès au projectId passé en paramètre de route|
|ThrottlerGuard|@UseGuards(ThrottlerGuard)|Applique la limite de taux configurée dans ThrottlerModule (5 req / 15 min par IP)|
|WsClientAuthGuard|Appliqué dans ADTPGateway.handleConnection()|Vérifie la clé API dans le query param WebSocket avant d'accepter la connexion|


# **5. Module LLM — Orchestration**
## **5.1 Architecture de l'orchestrateur**
Le module LLM est le cerveau du serveur DomOS. Il reçoit les messages utilisateur depuis le Gateway ADTP, enrichit le contexte avec le Shadow Context et les tools actifs, appelle le LLM via l'adaptateur configuré, gère la boucle tool call → result, et retourne la réponse finale au client via le Gateway.
## **5.2 LLMOrchestratorService — Flux principal**
Le service LLMOrchestratorService expose une méthode principale processUserInput() appelée par le Gateway. Le flux est le suivant :

1. Récupération de la session courante (SessionService) — historique, tools actifs, Shadow Context.
1. Construction du LLMRequest — messages historique + tools (serveur + client) + Shadow Context + system prompt.
1. Appel adapter.chat(request) — appel asynchrone au LLM via l'adaptateur configuré.
1. Si LLMResponse contient des toolCalls — pour chaque tool call :
   - Émettre TOOL\_CALL vers le client via le Gateway.
   - Attendre TOOL\_RESULT avec timeout configurable (défaut 30s).
   - Enregistrer le résultat dans le MetricsService (token count, status).
1. Rappel adapter.chat() avec les résultats des tools — obtenir la réponse finale.
1. Émettre AGENT\_RESPONSE vers le client (streaming si supporté).
1. Mettre à jour la session (historique, métriques) en Redis.
## **5.3 LLMAdapterRegistry**
Le LLMAdapterRegistry est un registre centralisé de tous les adaptateurs LLM disponibles. Il permet de sélectionner dynamiquement l'adaptateur correct en fonction du provider configuré pour un projet donné :

|**Provider**|**Adaptateur**|**Modèles supportés**|**Statut**|
| :- | :- | :- | :- |
|google|GoogleAdapter|gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash|✅ MVP v0.2|
|openai|OpenAIAdapter|gpt-4o, gpt-4o-mini, gpt-4-turbo|Prévu v1.0|
|anthropic|AnthropicAdapter|claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5|Prévu v1.0|
|custom|BaseLLMAdapter (à étendre)|Tout LLM compatible interface LLMAdapter|Disponible|

## **5.4 Gestion du streaming LLM**
Le streaming permet d'envoyer les tokens de réponse du LLM au client au fur et à mesure de leur génération, améliorant la perception de latence. L'implémentation NestJS utilise des générateurs asynchrones (async generators) :

- L'adaptateur LLM implémente chatStream() en plus de chat() — retourne un AsyncGenerator<string>.
- L'orchestrateur émet des AGENT\_RESPONSE avec done: false pour chaque chunk reçu.
- Le dernier AGENT\_RESPONSE est émis avec done: true pour signaler la fin du stream.
- Le MetricsService comptabilise les tokens en temps réel pendant le streaming.
## **5.5 Gestion des outils serveur (server.tool())**
En plus des tools déclarés côté client, le développeur peut déclarer des tools côté serveur via server.tool(). Ces tools sont enregistrés dans le ToolRegistry NestJS et exécutés directement par l'orchestrateur, sans passer par le client :

- Les tools serveur sont injectés dans le LLMRequest avec les tools client — le LLM les voit tous.
- Quand le LLM appelle un tool serveur, l'orchestrateur l'exécute localement sans émettre de TOOL\_CALL vers le client.
- Le résultat est directement injecté dans l'historique pour le prochain appel LLM.
- Les tools serveur sont typiquement utilisés pour les accès BDD, les appels API tierces nécessitant des secrets.


# **6. Module Provider — Gestion des Providers & Modèles LLM**
## **6.1 Objectif du module**
Le module Provider permet aux administrateurs de configurer, depuis le dashboard DomOS Cloud Pro, les providers LLM et les modèles utilisés pour chaque projet. C'est le point central de gestion de la couche intelligence artificielle de DomOS Cloud.

Un provider est une configuration LLM attachée à un projet. Il définit quel service LLM est utilisé, quel modèle spécifique est sélectionné, et quels paramètres de génération sont appliqués (température, max tokens, etc.).
## **6.2 Entité Provider (PostgreSQL)**

|**Champ**|**Type SQL**|**Description**|
| :- | :- | :- |
|id|UUID (PK)|Identifiant unique du provider|
|projectId|UUID (FK → Project)|Projet auquel ce provider est attaché|
|name|VARCHAR(100)|Nom lisible du provider (ex: 'Gemini Flash Production')|
|providerType|ENUM('google','openai','anthropic','custom')|Type de provider LLM|
|modelId|VARCHAR(100)|Identifiant du modèle (ex: gemini-2.0-flash, gpt-4o)|
|isActive|BOOLEAN|Provider actif pour ce projet (un seul actif à la fois par projet)|
|useOwnApiKey|BOOLEAN|Si true, le client fournit sa propre clé API LLM (plan Enterprise)|
|encryptedApiKey|TEXT (nullable)|Clé API chiffrée (AES-256) si useOwnApiKey = true|
|temperature|DECIMAL(3,2)|Température de génération (0.0 à 2.0, défaut: 0.7)|
|maxTokens|INTEGER|Nombre max de tokens par réponse (défaut: 4096)|
|systemPrompt|TEXT|System prompt spécifique à ce provider/projet|
|createdAt|TIMESTAMP|Date de création|
|updatedAt|TIMESTAMP|Date de dernière modification|

## **6.3 Endpoints REST du module Provider**

|**Endpoint**|**Méthode**|**Rôles requis**|**Description**|
| :- | :- | :- | :- |
|GET /api/projects/:projectId/providers|GET|Owner, Admin, Developer|Lister tous les providers d'un projet|
|POST /api/projects/:projectId/providers|POST|Owner, Admin|Créer un nouveau provider pour un projet|
|GET /api/projects/:projectId/providers/:id|GET|Owner, Admin, Developer|Détail d'un provider spécifique|
|PATCH /api/projects/:projectId/providers/:id|PATCH|Owner, Admin|Modifier la configuration d'un provider|
|DELETE /api/projects/:projectId/providers/:id|DELETE|Owner|Supprimer un provider|
|POST /api/projects/:projectId/providers/:id/activate|POST|Owner, Admin|Activer ce provider pour le projet (désactive l'ancien)|
|GET /api/providers/available-models|GET|Authentifié|Liste des modèles disponibles par provider type|
|POST /api/projects/:projectId/providers/:id/test|POST|Owner, Admin, Developer|Tester un provider avec un message simple|

## **6.4 Endpoint — Modèles disponibles**
L'endpoint GET /api/providers/available-models retourne la liste des modèles supportés par DomOS, groupés par provider. Cette liste est utilisée par le dashboard pour alimenter les sélecteurs de modèles. Elle est mise à jour à chaque release de DomOS et peut être enrichie sans migration :

|**Provider**|**Modèles disponibles**|**Capacités**|
| :- | :- | :- |
|google|gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash|text, audio, tools, streaming|
|openai|gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo|text, tools, streaming|
|anthropic|claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5|text, tools, streaming|

## **6.5 Sécurité des clés API LLM**
Les clés API LLM fournies par les clients Enterprise (useOwnApiKey = true) sont chiffrées avant stockage en base de données :

- Chiffrement AES-256-GCM avec une clé maître stockée dans les secrets d'infrastructure (jamais en base de données).
- La clé est déchiffrée uniquement au moment de l'appel LLM — jamais retournée dans les réponses API.
- L'endpoint PATCH ne permet pas de lire la clé existante — uniquement de la remplacer.

*⚠️  Les clés API LLM de Futur4Tech (plans Starter/Pro) ne sont jamais stockées en base de données. Elles sont injectées depuis les secrets d'infrastructure au démarrage du serveur.*


# **7. Module Role — Gestion des Rôles & Accès**
## **7.1 Modèle de permissions**
DomOS Cloud Pro implémente un modèle RBAC (Role-Based Access Control) à deux niveaux : Organisation et Projet. Un membre peut avoir un rôle différent dans chaque organisation et chaque projet auquel il appartient.

|**Rôle**|**Niveau**|**Permissions**|
| :- | :- | :- |
|Owner|Organisation + Projet|Toutes les actions — gestion membres, facturation, suppression organisation/projet|
|Admin|Organisation + Projet|Gestion des providers, clés API, configuration, membres (sauf Owner). Pas d'accès facturation.|
|Developer|Projet uniquement|Lecture des sessions, métriques, providers. Création/révocation de clés API de développement. Pas de modification de config.|
|Viewer|Projet uniquement|Lecture seule — sessions, métriques, logs. Aucune action d'écriture.|

## **7.2 Entités du module Role**

|**Entité**|**Table PostgreSQL**|**Champs principaux**|
| :- | :- | :- |
|Organization|organizations|id, name, slug, ownerId, plan (starter/pro/enterprise), createdAt|
|OrganizationMember|organization\_members|id, organizationId, userId, role (owner/admin/developer/viewer), createdAt|
|Project|projects|id, organizationId, name, slug, status, activeProviderId, createdAt|
|ProjectMember|project\_members|id, projectId, userId, role, createdAt|
|User|users|id, email, passwordHash, isEmailVerified, lastLoginAt, createdAt|
|Invitation|invitations|id, organizationId, email, role, token, expiresAt, acceptedAt|

## **7.3 Endpoints REST du module Role**

|**Endpoint**|**Méthode**|**Rôle requis**|**Description**|
| :- | :- | :- | :- |
|GET /api/organizations|GET|Authentifié|Lister les organisations de l'utilisateur connecté|
|POST /api/organizations|POST|Authentifié|Créer une nouvelle organisation|
|GET /api/organizations/:orgId/members|GET|Owner, Admin|Lister les membres de l'organisation|
|POST /api/organizations/:orgId/invitations|POST|Owner, Admin|Inviter un membre par email avec un rôle|
|PATCH /api/organizations/:orgId/members/:userId|PATCH|Owner|Modifier le rôle d'un membre|
|DELETE /api/organizations/:orgId/members/:userId|DELETE|Owner|Retirer un membre de l'organisation|
|GET /api/projects/:projectId/members|GET|Owner, Admin|Lister les membres d'un projet|
|POST /api/projects/:projectId/members|POST|Owner, Admin|Ajouter un membre à un projet avec un rôle|
|PATCH /api/projects/:projectId/members/:userId|PATCH|Owner, Admin|Modifier le rôle d'un membre sur le projet|

## **7.4 Décorateur @Roles et RolesGuard**
Le contrôle d'accès RBAC est implémenté via un décorateur personnalisé @Roles() combiné au RolesGuard NestJS. Le guard extrait les rôles de l'utilisateur depuis le JWT (req.user.roles), les compare aux rôles requis par le décorateur, et autorise ou rejette la requête. Le ProjectGuard vérifie en plus que l'utilisateur a bien accès au projet spécifié dans les paramètres de route.


# **8. Module Metrics — Tracking & Suivi**
## **8.1 Objectif du module**
Le module Metrics est responsable du suivi en temps réel et historique de toutes les métriques liées aux sessions DomOS : tokens LLM consommés, durée des conversations vocales, coûts LLM estimés, tool calls exécutés, latences et historique des échanges. Ces métriques alimentent le dashboard client et les outils de monitoring interne Futur4Tech.
## **8.2 Métriques trackées par session**

|**Métrique**|**Type**|**Stockage**|**Description**|
| :- | :- | :- | :- |
|Tokens input consommés|Integer|Redis (temps réel) + PostgreSQL (archivage)|Nombre de tokens envoyés au LLM (messages + tools + context)|
|Tokens output consommés|Integer|Redis + PostgreSQL|Nombre de tokens générés par le LLM en réponse|
|Tokens totaux|Integer calculé|Redis + PostgreSQL|input + output — base de calcul du coût|
|Durée conversation vocale|Duration (ms)|Redis + PostgreSQL|Durée cumulée des segments audio envoyés par l'utilisateur|
|Durée réponse vocale agent|Duration (ms)|Redis + PostgreSQL|Durée cumulée des segments audio reçus de l'agent|
|Nombre de tool calls|Integer|Redis + PostgreSQL|Nombre total de TOOL\_CALL émis dans la session|
|Tool calls réussis|Integer|PostgreSQL|TOOL\_RESULT status: success|
|Tool calls refusés (HITL)|Integer|PostgreSQL|TOOL\_RESULT status: error (refus utilisateur)|
|Tool calls en erreur|Integer|PostgreSQL|TOOL\_RESULT status: error (erreur technique)|
|Latence LLM moyenne|Float (ms)|Redis + PostgreSQL|Temps moyen entre envoi LLMRequest et réception LLMResponse|
|Latence P95 LLM|Float (ms)|TimescaleDB|95ème percentile des latences LLM — indicateur de performance|
|Coût LLM estimé|Decimal ($)|PostgreSQL|Calculé : tokens \* prix/1000 tokens selon modèle|
|Messages utilisateur|Integer|Redis + PostgreSQL|Nombre de USER\_INPUT reçus dans la session|
|Durée totale session|Duration (ms)|PostgreSQL|Depuis HANDSHAKE\_ACK jusqu'à déconnexion|

## **8.3 Calcul du coût LLM**
Le coût LLM est estimé en temps réel selon la grille tarifaire de chaque provider. La table de prix est stockée en configuration et mise à jour à chaque changement tarifaire des providers :

|**Provider**|**Modèle**|**Prix input ($/1M tokens)**|**Prix output ($/1M tokens)**|
| :- | :- | :- | :- |
|Google|gemini-2.0-flash|0,075 $|0,30 $|
|Google|gemini-1.5-pro|1,25 $|5,00 $|
|OpenAI|gpt-4o|2,50 $|10,00 $|
|OpenAI|gpt-4o-mini|0,15 $|0,60 $|
|Anthropic|claude-sonnet-4-6|3,00 $|15,00 $|
|Anthropic|claude-haiku-4-5|0,80 $|4,00 $|

*ℹ️  Ces prix sont indicatifs et sujets à changement. Le système de calcul de coût est conçu pour être mis à jour sans redéploiement via la table de configuration en base de données.*

## **8.4 Stockage des métriques — Architecture Redis + PostgreSQL**

|**Données**|**Stockage primaire**|**Clé Redis / Table SQL**|**TTL / Rétention**|
| :- | :- | :- | :- |
|Métriques session en cours|Redis Hash|metrics:session:{sessionId}|Durée session + 1h|
|Métriques agrégées par projet/jour|Redis + TimescaleDB|metrics:project:{projectId}:{date}|Redis 7j / TimescaleDB 90j (Pro)|
|Historique conversations (messages)|PostgreSQL|conversation\_messages|30j (Starter) / 90j (Pro) / 365j (Enterprise)|
|Sessions archivées|PostgreSQL|sessions\_archive|90j (Pro) / 365j (Enterprise)|
|Séries temporelles latences|TimescaleDB|llm\_latency\_metrics|90j (Pro) / 365j (Enterprise)|
|Coûts agrégés par mois|PostgreSQL|billing\_usage|Illimité (nécessaire pour facturation)|

## **8.5 Endpoints REST du module Metrics**

|**Endpoint**|**Méthode**|**Description**|**Rôle requis**|
| :- | :- | :- | :- |
|GET /api/projects/:id/metrics/overview|GET|Vue synthétique : sessions, messages, tokens, coût du mois en cours|Developer+|
|GET /api/projects/:id/metrics/sessions|GET|Liste des sessions avec métriques (pagination, filtres date)|Developer+|
|GET /api/projects/:id/metrics/sessions/:sessionId|GET|Détail complet d'une session (messages, tool calls, latences, coût)|Developer+|
|GET /api/projects/:id/metrics/tools|GET|Statistiques par tool : nb appels, taux succès/refus/erreur|Developer+|
|GET /api/projects/:id/metrics/llm|GET|Métriques LLM : tokens, coût, latences P50/P95/P99 par période|Developer+|
|GET /api/projects/:id/metrics/voice|GET|Métriques vocales : durée totale, nb sessions audio, ratio text/audio|Developer+|
|GET /api/projects/:id/metrics/cost|GET|Détail des coûts par période, par modèle, avec projection fin de mois|Admin+|
|GET /api/projects/:id/metrics/export|GET|Export CSV de toutes les métriques sur période sélectionnée|Admin+|

## **8.6 Tâches planifiées (@nestjs/schedule)**
Le module Metrics utilise des tâches planifiées pour le traitement périodique des données :

|**Tâche planifiée**|**Fréquence (Cron)**|**Action**|
| :- | :- | :- |
|Agrégation métriques horaires|0 \* \* \* \* (toutes les heures)|Agrège les métriques Redis des sessions de l'heure écoulée → PostgreSQL|
|Calcul coûts journaliers|0 0 \* \* \* (minuit)|Calcule les coûts LLM de la journée par projet → billing\_usage|
|Nettoyage sessions expirées|0 \*/6 \* \* \* (toutes les 6h)|Supprime de Redis les sessions dont le TTL est dépassé|
|Archivage conversations|0 2 \* \* \* (2h du matin)|Déplace les conversations > rétention plan de Redis vers PostgreSQL|
|Alerte quota (80% + 95%)|\*/15 \* \* \* \* (toutes les 15min)|Vérifie les compteurs de messages → envoie alertes email si seuils atteints|
|Rapport facturation mensuel|0 0 1 \* \* (1er du mois)|Génère le résumé de facturation du mois écoulé → déclenche facturation|


# **9. Module Session — Gestion des Sessions**
## **9.1 Architecture de la session**
Une session DomOS représente une connexion WebSocket active entre un client SDK et le serveur. Chaque session est identifiée par un sessionId unique (UUID v4) et stockée en Redis pour un accès temps réel rapide. À la fermeture de la session, les données sont archivées en PostgreSQL.
## **9.2 Structure d'une session en Redis**
Chaque session est stockée dans un Redis Hash avec la clé session:{sessionId}. Les champs principaux sont :

|**Champ Redis**|**Type**|**Description**|
| :- | :- | :- |
|sessionId|string|UUID v4 — identifiant unique de la session|
|projectId|string|Projet DomOS auquel appartient cette session|
|apiKeyId|string|Clé API utilisée pour cette connexion|
|socketId|string|Identifiant interne du socket WebSocket (ws instance)|
|status|enum|connecting | active | disconnected | error|
|activeTools|JSON string|Sérialisation de la liste des tools actifs (ToolDeclaration[])|
|shadowContext|JSON string|Shadow Context courant (données de la page)|
|currentUrl|string|URL de la page active côté client|
|conversationHistory|JSON string|Historique ChatMessage[] — transmis à chaque appel LLM|
|tokenCount|integer|Tokens cumulés consommés dans cette session|
|voiceDurationMs|integer|Durée audio cumulée en millisecondes|
|toolCallCount|integer|Nombre de tool calls effectués|
|connectedAt|timestamp|Timestamp de connexion initiale|
|lastActivityAt|timestamp|Timestamp de dernière activité (message ou tool call)|

*ℹ️  Le TTL Redis d'une session active est renouvelé à chaque activité. Une session inactive depuis plus de 30 minutes est automatiquement marquée comme expirée et nettoyée.*
## **9.3 Persistance PostgreSQL — SessionArchive**
À la fermeture d'une session (déconnexion volontaire ou timeout), le SessionService archive les données dans la table sessions\_archive de PostgreSQL. Cette table est la source de vérité pour les analytics historiques et l'audit.

|**Champ SQL**|**Type**|**Description**|
| :- | :- | :- |
|id|UUID (PK)|Identifiant unique de la session archivée|
|projectId|UUID (FK)|Projet DomOS|
|apiKeyId|UUID (FK)|Clé API utilisée|
|startedAt|TIMESTAMP|Début de la session|
|endedAt|TIMESTAMP|Fin de la session|
|durationMs|INTEGER|Durée totale en millisecondes|
|messageCount|INTEGER|Nombre de messages utilisateur|
|tokenInputTotal|INTEGER|Total tokens envoyés au LLM|
|tokenOutputTotal|INTEGER|Total tokens reçus du LLM|
|voiceDurationMs|INTEGER|Durée audio cumulée|
|toolCallCount|INTEGER|Nombre de tool calls|
|toolCallSuccessCount|INTEGER|Tool calls réussis|
|toolCallRefusedCount|INTEGER|Tool calls refusés (HITL)|
|costEstimatedUsd|DECIMAL(10,6)|Coût LLM estimé en dollars|
|endReason|ENUM|client\_disconnect | server\_timeout | error | admin\_terminate|


# **10. Module Keys — Gestion des Clés API Client**
## **10.1 Objectif**
Le module Keys gère le cycle de vie complet des clés API utilisées par les clients WebSocket pour s'authentifier auprès du serveur DomOS. Ces clés sont distinctes des tokens JWT admin — elles authentifient les applications (pas les utilisateurs humains).
## **10.2 Entité ApiKey (PostgreSQL)**

|**Champ**|**Type SQL**|**Description**|
| :- | :- | :- |
|id|UUID (PK)|Identifiant interne|
|projectId|UUID (FK)|Projet auquel appartient cette clé|
|name|VARCHAR(100)|Nom lisible (ex: 'Production', 'Dev local', 'Client Acme')|
|keyHash|VARCHAR(64)|SHA-256 de la clé — jamais la clé en clair stockée|
|prefix|VARCHAR(12)|Préfixe visible pour identification (ex: pk\_live\_abc1)|
|environment|ENUM('live','dev')|Environnement d'utilisation — live ou dev|
|maxConnections|INTEGER|Connexions WebSocket simultanées max (défaut: 10)|
|expiresAt|TIMESTAMP (nullable)|Date d'expiration optionnelle|
|lastUsedAt|TIMESTAMP|Dernière utilisation enregistrée|
|isRevoked|BOOLEAN|Clé révoquée — rejet immédiat de toute connexion|
|createdBy|UUID (FK → User)|Utilisateur qui a créé la clé|
|createdAt|TIMESTAMP|Date de création|

*⚠️  La clé API en clair n'est affichée qu'une seule fois lors de sa création — elle ne peut pas être récupérée ensuite. Le client doit la stocker immédiatement de manière sécurisée.*
## **10.3 Endpoints REST du module Keys**

|**Endpoint**|**Méthode**|**Rôle requis**|**Description**|
| :- | :- | :- | :- |
|GET /api/projects/:id/keys|GET|Admin+|Lister les clés du projet (préfixe + métadonnées, jamais la clé)|
|POST /api/projects/:id/keys|POST|Admin+|Générer une nouvelle clé API — retourne la clé en clair une seule fois|
|PATCH /api/projects/:id/keys/:keyId|PATCH|Admin+|Modifier nom, maxConnections, expiresAt d'une clé|
|DELETE /api/projects/:id/keys/:keyId|DELETE|Admin+|Révoquer une clé — ferme les connexions actives utilisant cette clé|
|GET /api/projects/:id/keys/:keyId/usage|GET|Developer+|Statistiques d'utilisation d'une clé (connexions actives, messages, dernière activité)|


# **11. Persistance — Redis + PostgreSQL**
## **11.1 Architecture de persistance**
DomOS Cloud Pro utilise deux systèmes de persistance complémentaires, chacun optimisé pour son cas d'usage :

|**Système**|**Cas d'usage**|**Raison du choix**|
| :- | :- | :- |
|Redis|Sessions actives, tool registry, tokens en cours, rate limiting, cache, pub/sub|Accès ultra-rapide (< 1ms), structures de données natives (Hash, Set, Sorted Set), TTL natif, pub/sub pour notifications temps réel|
|PostgreSQL|Comptes, organisations, projets, providers, clés, membres, sessions archivées, facturation|Données relationnelles structurées, transactions ACID, requêtes complexes pour analytics, intégrité référentielle|
|TimescaleDB (extension PostgreSQL)|Métriques de latences, séries temporelles des tokens et coûts, données d'utilisation horodatées|Optimisé pour les séries temporelles, compression automatique, requêtes d'agrégation temporelles performantes|

## **11.2 Schéma Redis — Clés et structures**

|**Clé Redis**|**Type**|**Contenu**|**TTL**|
| :- | :- | :- | :- |
|session:{sessionId}|Hash|Données complètes de la session active (voir section 9.2)|30min (renouvelé à chaque activité)|
|sessions:project:{projectId}|Set|Set des sessionIds actifs pour un projet|Synchronisé avec les sessions actives|
|ratelimit:login:{ip}|String (counter)|Compteur de tentatives de login par IP|15 minutes (fenêtre rate limiting)|
|ratelimit:api:{keyId}|String (counter)|Compteur de requêtes par clé API par fenêtre|1 heure|
|auth:refresh:{tokenHash}|String|userId associé au refresh token (pour révocation)|7 jours|
|metrics:session:{sessionId}|Hash|Métriques temps réel de la session (tokens, durée, tool calls)|Durée session + 1h|
|metrics:project:{projectId}:{date}|Hash|Métriques agrégées du projet par jour|7 jours|
|quota:project:{projectId}:{month}|String (counter)|Messages consommés dans le mois courant (pour alertes quota)|Jusqu'à fin du mois + 1j|
|ws:key:{keyHashPrefix}:connections|Set|Set des sessionIds actifs pour une clé API|Synchronisé avec les sessions|

## **11.3 Migrations PostgreSQL (TypeORM)**
Les migrations de base de données sont gérées avec TypeORM Migrations. Chaque changement de schéma est versionné et appliqué automatiquement au démarrage du serveur en environnement de production. Les migrations sont générées automatiquement à partir des entités TypeORM.

- Les migrations sont stockées dans src/database/migrations/.
- La commande pnpm migration:generate génère automatiquement le SQL depuis les changements d'entités.
- La commande pnpm migration:run applique les migrations en attente.
- Les migrations sont irréversibles en production — toujours créer de nouvelles migrations plutôt que de modifier les existantes.

*ℹ️  En développement, synchronize: true peut être utilisé pour synchroniser automatiquement le schéma sans migrations. En production, synchronize est toujours false — seules les migrations explicites sont appliquées.*


# **12. Configuration et déploiement**
## **12.1 Variables d'environnement — Backend NestJS complet**

|**Variable**|**Obligatoire**|**Description**|**Exemple**|
| :- | :- | :- | :- |
|NODE\_ENV|Non|Environnement d'exécution — active les guards de prod|production|
|PORT|Non (3000)|Port d'écoute HTTP + WebSocket|3000|
|GOOGLE\_API\_KEY|Si Gemini|Clé API Google AI Studio (LLM géré Futur4Tech)|AIza...|
|OPENAI\_API\_KEY|Si OpenAI|Clé API OpenAI (LLM géré Futur4Tech)|sk-...|
|ANTHROPIC\_API\_KEY|Si Anthropic|Clé API Anthropic (LLM géré Futur4Tech)|sk-ant-...|
|JWT\_SECRET|Oui|Secret de signature des JWT access tokens (RS256 en prod)|random-256-bit-secret|
|JWT\_EXPIRES\_IN|Non (1h)|Durée de validité des access tokens JWT|3600|
|REFRESH\_TOKEN\_SECRET|Oui|Secret de signature des refresh tokens|random-256-bit-secret-2|
|REFRESH\_TOKEN\_EXPIRES\_IN|Non (7d)|Durée de validité des refresh tokens|604800|
|POSTGRES\_URL|Oui|URL de connexion PostgreSQL complète|postgresql://user:pass@host:5432/domos|
|REDIS\_URL|Oui|URL de connexion Redis|redis://:password@host:6379|
|ENCRYPTION\_KEY|Oui|Clé AES-256 pour chiffrement des clés API LLM clients|hex-64-chars|
|ADMIN\_USERNAME|Non (admin)|Nom d'utilisateur admin par défaut (seed)|admin|
|ADMIN\_PASSWORD|Oui|Mot de passe admin initial (hashé au seed)|s3cur3-p@ss|
|CORS\_ORIGINS|Non|Origines autorisées pour l'API REST (séparées par virgule)|https://cloud.domos.dev|
|THROTTLE\_TTL|Non (900)|Fenêtre rate limiting login en secondes (15 min)|900|
|THROTTLE\_LIMIT|Non (5)|Tentatives max dans la fenêtre rate limiting|5|

## **12.2 Dockerfile**
Le backend NestJS est conteneurisé avec un Dockerfile multi-stage pour optimiser la taille de l'image de production :

\# Stage 1 — Build

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

\# Stage 2 — Production

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node\_modules ./node\_modules

COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]

## **12.3 Health checks NestJS**
Le backend expose un endpoint de santé utilisé par les load balancers et les orchestrateurs de containers pour vérifier l'état du service :

- GET /health — retourne { status: 'ok', timestamp, uptime, version } si tout est nominal.
- GET /health/db — vérifie la connexion PostgreSQL (ping).
- GET /health/redis — vérifie la connexion Redis (ping).
- GET /health/ready — utilisé par Kubernetes readiness probe — retourne 200 uniquement quand le service est prêt à recevoir du trafic.


# **13. Stratégie de tests**
## **13.1 Niveaux de tests**

|**Niveau**|**Outil**|**Scope**|**Cible couverture**|
| :- | :- | :- | :- |
|Tests unitaires|Jest + NestJS Testing Module|Services, Guards, Pipes, Transformers — logique isolée avec mocks|> 80% sur modules core|
|Tests d'intégration|Jest + Supertest|Controllers REST + Guards + Pipes — requêtes HTTP complètes avec base de données test|> 70% sur tous les controllers|
|Tests WebSocket|Jest + ws client|ADTPGateway — scénarios de connexion, messages, déconnexion|Flux principaux couverts|
|Tests E2E|Playwright (prévu v1.0)|Scénarios complets client SDK → serveur → LLM (mock LLM)|CU-01 à CU-06 du CdC Fonctionnel|

## **13.2 Modules prioritaires pour les tests**
Par ordre de priorité de couverture de tests :

1. AuthModule — tests complets bcrypt, JWT, rate limiting, guards.
1. ADTPGateway — tests connexion, handshake, CONTEXT\_UPDATE, TOOL\_CALL/RESULT, erreurs.
1. LLMOrchestratorService — tests boucle tool call, streaming, timeout, erreurs LLM.
1. MetricsService — tests calcul tokens, coût, durée vocale, agrégations.
1. SessionService — tests cycle de vie Redis, TTL, archivage PostgreSQL.
1. KeysService — tests génération, hachage, révocation, validation WebSocket.
1. ProviderService — tests CRUD, chiffrement clés API, sélection modèle.
1. RoleService — tests RBAC, guards, invitations.


# **14. Annexes**
## **14.1 Dépendances inter-modules NestJS**

|**Module**|**Dépend de (imports NestJS)**|
| :- | :- |
|AppModule (racine)|ADTPModule, AuthModule, SessionModule, LLMModule, ProviderModule, RoleModule, MetricsModule, KeysModule, ProjectModule, ConfigModule, TypeOrmModule, ThrottlerModule, ScheduleModule, EventEmitterModule|
|ADTPModule|SessionModule, LLMModule, MetricsModule, KeysModule|
|LLMModule|SessionModule, MetricsModule, ProviderModule, ConfigModule|
|SessionModule|MetricsModule, RedisModule|
|MetricsModule|RedisModule, TypeOrmModule (SessionArchive, BillingUsage)|
|AuthModule|RoleModule, ConfigModule, JwtModule, PassportModule|
|ProviderModule|TypeOrmModule (Provider), ConfigModule|
|RoleModule|TypeOrmModule (Organization, Member, Project, User)|
|KeysModule|TypeOrmModule (ApiKey), SessionModule, RedisModule|
|ProjectModule|TypeOrmModule (Project), RoleModule, ProviderModule, KeysModule|

## **14.2 Références**
- CdC Technique général (Doc 2) — Architecture SDK, protocole ADTP, stack client
- CdC Fonctionnel (Doc 1) — Scénarios, acteurs, cas d'usage et exigences
- CdC Cloud & Monétisation (Doc 3) — Plans, tarification, composants Cloud Pro
- Fiche Stratégie OSS vs Pro (Doc 4) — Décisions open source vs propriétaire
- ADTP\_PROTOCOL.md — Spécification complète du protocole de communication
- MIGRATION\_V0\_2.md — Breaking changes authentification v0.1 → v0.2
- NestJS Documentation — https://docs.nestjs.com
- TypeORM Documentation — https://typeorm.io
- ioredis Documentation — https://github.com/redis/ioredis


*Document confidentiel — Futur4Tech © 2026 — DomOS Backend NestJS*
Page 
