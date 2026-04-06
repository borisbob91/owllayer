DomOS SDK  —  Cahier des Charges Cloud & Monétisation  —  Futur4Tech






**DomOS**

*DOM Operating System*



**CAHIER DES CHARGES**

**VERSION CLOUD & MONÉTISATION**

DomOS Cloud Pro — Offre SaaS Hébergée

Version 1.0  —  Mars 2026



|**Projet**|DomOS Cloud Pro|
| :- | :- |
|**Type de document**|Cahier des charges Cloud & Monétisation|
|**Version SDK**|v0.2 (cible : v1.0)|
|**Organisation**|Futur4Tech|
|**Responsable**|Kouakou Boris (CEO)|
|**Date**|Mars 2026|
|**Statut**|En conception|
|**Modèle**|Open Source (MIT) + SaaS Cloud Pro (Hybride)|


# **Table des matières**





# **1. Vision et positionnement DomOS Cloud**
## **1.1 Rappel — DomOS, le DOM Operating System**
DomOS (DOM Operating System) est le premier système d'exploitation pour interfaces utilisateur piloté par agents IA. Là où le MCP (Model Context Protocol) définit les outils côté serveur, DomOS inverse ce paradigme : les outils sont déclarés directement dans les composants UI côté client, et l'agent les découvre dynamiquement via le protocole ADTP (Agent-to-DOM Transfer Protocol).

DomOS se compose de plusieurs couches complémentaires :

- Le protocole ADTP — standard de communication bidirectionnel agent ↔ UI via WebSocket.
- Les SDKs clients — @domos/react, @domos/vue, @domos/svelte, @domos/flutter (et Swift/Kotlin en roadmap).
- Le serveur DomOS — orchestrateur LLM avec gestion des sessions, sécurité HITL et API admin.
- DomosAgent (Agentic UI SDK) — composant natif DomOS ajoutant mémoire, rôles, planification et feedback à l'agent. Il transforme DomOS en véritable plateforme agentique pilotant l'interface de bout en bout.
- DomOS Cloud Pro — offre SaaS hébergée permettant aux équipes d'utiliser DomOS sans gérer leur propre infrastructure.
## **1.2 Stratégie Open Core**
Futur4Tech adopte une stratégie open core : le cœur de DomOS est et restera open source (licence MIT). La monétisation repose sur une offre cloud hébergée (DomOS Cloud Pro) qui ajoute de la valeur sans retirer de fonctionnalités à la communauté.

Cette stratégie présente plusieurs avantages stratégiques :

- Adoption communautaire accélérée — les développeurs peuvent utiliser DomOS gratuitement en self-hosted.
- Crédibilité technique — un projet open source actif rassure les entreprises sur la pérennité.
- Funnel de conversion naturel — les équipes qui adoptent DomOS en self-hosted migrent vers Cloud Pro pour éviter la gestion d'infrastructure.
- Attractivité pour les contributeurs — la communauté améliore le core dont Cloud Pro bénéficie.
## **1.3 Positionnement de DomOS Cloud Pro**
DomOS Cloud Pro est destiné aux équipes et entreprises qui souhaitent intégrer DomOS dans leurs produits sans gérer l'infrastructure du serveur. L'offre Cloud Pro fournit :

- Un serveur DomOS managé, haute disponibilité, mis à jour automatiquement.
- Un dashboard d'administration complet avec monitoring temps réel.
- Une gestion multi-tenant permettant de gérer plusieurs projets depuis un seul compte.
- Des analytics avancées sur les sessions agent, les tool calls et l'utilisation LLM.
- Des LLMs premium pré-configurés (Gemini, GPT-4o, Claude) sans gestion de clés API.
- Un support prioritaire et des SLA garantis.


# **2. Composants de l'offre DomOS Cloud Pro**
## **2.1 Vue d'ensemble des composants**

|**Composant**|**Description**|**Destinataire**|
| :- | :- | :- |
|Serveur DomOS Managé|Instance DomOS hébergée par Futur4Tech — déployée, maintenue, mise à l'échelle automatiquement|Toutes les offres payantes|
|Dashboard Admin Web|Interface d'administration en ligne pour gérer projets, clés, sessions et métriques|Toutes les offres payantes|
|Monitoring & Analytics|Tableaux de bord temps réel : sessions actives, tool calls, latences, erreurs LLM|Starter et supérieur|
|Multi-Tenant Manager|Gestion de plusieurs projets/clients depuis un seul compte Cloud Pro|Pro et Enterprise|
|LLMs Premium configurés|Gemini, GPT-4o, Claude pré-intégrés — pas besoin de gérer les clés API LLM|Toutes les offres payantes|
|Webhook & Intégrations|Notifications sur événements (session start, tool call critique, erreur) via webhook HTTP|Pro et Enterprise|
|Audit Logs|Historique complet des actions admin, connexions clients et tool calls pour audit de sécurité|Enterprise|
|Support prioritaire|Ticket support avec SLA de réponse garanti selon le plan|Starter et supérieur|

## **2.2 Dashboard Admin Web — Fonctionnalités détaillées**
### **2.2.1 Vue d'ensemble du dashboard**
Le dashboard DomOS Cloud Pro est une application web accessible depuis cloud.domos.dev (nom de domaine provisoire). Il offre une interface unifiée pour gérer l'ensemble des ressources DomOS d'un compte.
### **2.2.2 Module : Gestion des projets**
- Création et suppression de projets DomOS (chaque projet = une instance serveur managée isolée).
- Configuration du serveur : adaptateur LLM, system prompt, options HITL, paramètres de connexion.
- Sélection du LLM utilisé (Gemini, GPT-4o, Claude) et du modèle spécifique.
- Statut en temps réel de chaque projet (en ligne, hors ligne, dégradé).
- Historique des déploiements et des mises à jour de configuration.
### **2.2.3 Module : Gestion des clés API client**
- Génération de nouvelles clés API (format pk\_live\_\* ou pk\_dev\_\*).
- Révocation instantanée d'une clé (ferme les connexions WebSocket actives utilisant cette clé).
- Attribution de quotas par clé : connexions simultanées max, messages par heure, expiration.
- Vue d'utilisation par clé : nombre de connexions actives, messages envoyés, dernière activité.
- Export CSV de l'historique d'utilisation par clé.
### **2.2.4 Module : Monitoring des sessions**
- Liste des sessions WebSocket actives en temps réel (sessionId, IP, durée, tools actifs).
- Détail d'une session : historique des messages, tool calls exécutés, erreurs rencontrées.
- Terminaison manuelle d'une session depuis le dashboard.
- Alertes configurables : session anormalement longue, taux d'erreur élevé, quota dépassé.
### **2.2.5 Module : Analytics & métriques**
- Graphiques temporels : nombre de sessions, messages, tool calls par heure/jour/semaine.
- Top tools les plus appelés et leur taux de succès/erreur/refus HITL.
- Latences P50/P95/P99 pour : handshake, tool call execution, LLM response.
- Utilisation LLM : tokens consommés, coût estimé par modèle et par période.
- Taux d'approbation/refus HITL par niveau de risque (low/high/critical).
- Export des métriques en CSV ou via API REST.
### **2.2.6 Module : Multi-tenant (plans Pro et Enterprise)**
- Création d'organisations regroupant plusieurs projets.
- Gestion des membres de l'organisation avec rôles (Owner, Admin, Developer, Viewer).
- Facturation centralisée pour toutes les ressources de l'organisation.
- Isolation complète des données entre organisations.
- Tableau de bord consolidé pour visualiser l'utilisation de tous les projets d'une organisation.


# **3. Plans et tarification**
## **3.1 Vue d'ensemble des plans**
DomOS propose une offre à 4 niveaux couvrant l'ensemble des besoins, du développeur individuel à l'entreprise :

|**Plan**|**Cible**|**Modèle de prix**|**Positionnement**|
| :- | :- | :- | :- |
|Community (OSS)|Développeurs, indie hackers, contributeurs|Gratuit — self-hosted|Open Source MIT — infrastructure gérée par l'utilisateur|
|Starter Cloud|Startups, petites équipes, projets SaaS naissants|Abonnement fixe + usage LLM|Premier accès Cloud managé sans gestion d'infrastructure|
|Pro Cloud|Équipes produit, PME, SaaS en croissance|Abonnement fixe + usage LLM|Multi-projets, analytics avancées, webhooks, support prioritaire|
|Enterprise Cloud|Grandes entreprises, intégrateurs, clients B2B|Contrat sur devis|SLA garanti, audit logs, SSO, support dédié, déploiement custom|

## **3.2 Détail des plans**
### **3.2.1 Plan Community (Open Source — Gratuit)**

|**Ressource**|**Limite / Inclus**|
| :- | :- |
|Licence|MIT — Open Source complet|
|Hébergement|Self-hosted uniquement (infrastructure client)|
|Serveur DomOS|Fonctionnalités complètes du core open source|
|SDKs clients|@domos/react, @domos/vue, @domos/svelte, @domos/flutter — complets|
|DomosAgent (Agentic UI SDK)|Inclus — complet|
|Protocole ADTP|Inclus — spécification publique|
|Système HITL|Inclus — complet|
|LLMs|Clés API gérées par l'utilisateur (Google, OpenAI, Anthropic)|
|Dashboard admin|Interface admin locale (port /admin) — basique|
|Analytics|Logs locaux uniquement|
|Support|Communauté GitHub (Issues, Discussions)|
|SLA|Aucun — best effort communauté|

### **3.2.2 Plan Starter Cloud**

|**Ressource**|**Limite / Inclus**|
| :- | :- |
|Prix abonnement|29 $/mois (facturation annuelle) ou 35 $/mois (mensuel)|
|Projets DomOS managés|1 projet actif|
|Sessions WebSocket simultanées|Jusqu'à 50 sessions|
|Messages / mois (inclus)|50 000 messages (texte + audio)|
|Usage LLM au-delà du quota|+ 0,50 $ par tranche de 10 000 messages supplémentaires|
|Clés API client|10 clés maximum|
|LLMs disponibles|Gemini Flash, GPT-4o Mini — clés Futur4Tech gérées|
|Dashboard Cloud|Accès complet (projets, clés, sessions)|
|Analytics|Métriques de base (sessions, messages, top tools) — rétention 30 jours|
|DomosAgent|Inclus — mémoire session uniquement|
|Multi-tenant|Non — 1 compte = 1 organisation|
|Webhooks|Non|
|Support|Email — réponse sous 48h ouvrées|
|SLA uptime|99,5 % mensuel|

### **3.2.3 Plan Pro Cloud**

|**Ressource**|**Limite / Inclus**|
| :- | :- |
|Prix abonnement|99 $/mois (facturation annuelle) ou 119 $/mois (mensuel)|
|Projets DomOS managés|5 projets actifs|
|Sessions WebSocket simultanées|Jusqu'à 500 sessions (tous projets)|
|Messages / mois (inclus)|250 000 messages|
|Usage LLM au-delà du quota|+ 0,30 $ par tranche de 10 000 messages supplémentaires|
|Clés API client|100 clés par projet|
|LLMs disponibles|Gemini Pro/Flash, GPT-4o, Claude Sonnet — clés Futur4Tech gérées|
|Dashboard Cloud|Accès complet + analytics avancées|
|Analytics|Métriques complètes + latences + coût LLM estimé — rétention 90 jours|
|DomosAgent|Inclus — mémoire session + persistante (Redis)|
|Multi-tenant|Oui — gestion d'organisations et membres avec rôles|
|Webhooks|Oui — jusqu'à 10 endpoints configurables|
|Audit Logs|Partiel — actions admin seulement|
|Support|Email prioritaire — réponse sous 24h ouvrées|
|SLA uptime|99,9 % mensuel|

### **3.2.4 Plan Enterprise Cloud**

|**Ressource**|**Limite / Inclus**|
| :- | :- |
|Prix|Sur devis — contrat annuel minimum|
|Projets DomOS managés|Illimité|
|Sessions WebSocket simultanées|Illimité (auto-scaling)|
|Messages / mois|Volume contractualisé — tarif dégressif|
|LLMs disponibles|Tous + possibilité d'intégrer un LLM privé ou on-premise|
|Dashboard Cloud|Accès complet + branding custom possible|
|Analytics|Métriques complètes + export API + intégration BI (Metabase, Grafana)|
|DomosAgent|Inclus — complet avec mémoire longue cross-session|
|Multi-tenant|Oui — multi-organisations, isolation complète|
|Webhooks|Illimité|
|Audit Logs|Complets — toutes actions, sessions, tool calls|
|SSO / SAML|Oui — intégration SSO entreprise (Okta, Azure AD, etc.)|
|Déploiement|Cloud mutualisé Futur4Tech OU déploiement dédié (VPC privé)|
|Support|Slack dédié + Customer Success Manager + SLA réponse < 4h|
|SLA uptime|99,99 % mensuel avec compensation financière|
|Formation|Sessions d'onboarding technique (2h) incluses|

## **3.3 Tableau comparatif des plans**

|**Feature**|**Community**|**Starter**|**Pro**|**Enterprise**|
| :- | :- | :- | :- | :- |
|Prix mensuel|Gratuit|29-35 $|99-119 $|Sur devis|
|Hébergement|Self-hosted|Cloud géré|Cloud géré|Cloud / VPC dédié|
|Projets|Illimité\*|1|5|Illimité|
|Sessions simultanées|Illimité\*|50|500|Illimité|
|Messages inclus/mois|—|50 000|250 000|Contractualisé|
|LLMs gérés Futur4Tech|Non|Gemini, GPT-4o Mini|Gemini, GPT-4o, Claude|Tous + custom|
|Dashboard Cloud|Non (local)|Oui|Oui|Oui + branding|
|Analytics avancées|Non|Basiques|Complètes|Complètes + BI|
|DomosAgent mémoire persistante|Non|Non|Oui|Oui (longue durée)|
|Multi-tenant|Non|Non|Oui|Oui|
|Webhooks|Non|Non|Oui (10)|Illimité|
|Audit Logs|Non|Non|Partiel|Complet|
|SSO / SAML|Non|Non|Non|Oui|
|Support|Communauté|Email 48h|Email 24h|Slack + CSM 4h|
|SLA uptime|—|99,5%|99,9%|99,99%|

*ℹ️  \* Community : illimité sur infrastructure propre — Futur4Tech ne fournit pas l'hébergement.*


# **4. Modèle de facturation hybride**
## **4.1 Principe du modèle hybride**
Le modèle de facturation DomOS Cloud Pro est hybride : il combine un abonnement mensuel fixe (base prévisible pour le client et Futur4Tech) avec une composante usage variable (messages LLM au-delà du quota inclus). Ce modèle présente plusieurs avantages :

- Prévisibilité budgétaire pour le client — la base mensuelle est connue d'avance.
- Scalabilité naturelle — les clients en forte croissance paient proportionnellement à leur usage.
- Alignement des intérêts — Futur4Tech est incité à fournir un service fiable pour que les clients utilisent plus.
- Barrière d'entrée faible — le plan Starter à 29 $/mois permet d'essayer sans engagement lourd.
## **4.2 Composantes de facturation**

|**Composante**|**Type**|**Description**|**Exemple**|
| :- | :- | :- | :- |
|Abonnement mensuel|Fixe|Accès au plan (infrastructure, dashboard, support)|Starter : 29 $/mois|
|Messages inclus|Quota fixe|Volume de messages inclus dans l'abonnement|Starter : 50 000 msg/mois|
|Messages supplémentaires|Variable (usage)|Facturation par tranche au-delà du quota|Starter : +0,50 $ / 10k msg|
|Coût LLM|Transparent|Les LLMs gérés Futur4Tech incluent le coût API — pas de surprises|Inclus dans le prix|
|Sessions simultanées|Incluses dans le plan|Pas de facturation par session — limité par plan|Starter : 50 sessions max|

## **4.3 Exemples de calcul de facturation**
### **Exemple 1 — Startup avec plan Starter**
Contexte : application e-commerce avec 800 utilisateurs actifs/mois, 60 messages/utilisateur en moyenne.

- Messages totaux : 800 × 60 = 48 000 messages/mois → dans le quota Starter (50 000).
- Facturation : 29 $/mois (abonnement) + 0 $ (dans quota) = 29 $/mois.
- Coût par utilisateur actif : 0,036 $/utilisateur.
### **Exemple 2 — SaaS en croissance avec plan Starter (dépassement)**
Contexte : même application, 1 200 utilisateurs actifs, 60 messages/utilisateur.

- Messages totaux : 1 200 × 60 = 72 000 messages/mois → dépassement de 22 000 messages.
- Coût dépassement : (22 000 / 10 000) × 0,50 $ = 1,10 $.
- Facturation totale : 29 $ + 1,10 $ = 30,10 $/mois.
- Signal de migration : à ce niveau d'usage, le plan Pro devient plus avantageux.
### **Exemple 3 — Équipe produit avec plan Pro**
Contexte : 3 projets DomOS, 5 000 utilisateurs actifs/mois, 40 messages/utilisateur.

- Messages totaux : 5 000 × 40 = 200 000 messages/mois → dans le quota Pro (250 000).
- Facturation : 99 $/mois (abonnement) + 0 $ = 99 $/mois.
- Coût par utilisateur actif : 0,0198 $/utilisateur.
## **4.4 Politique de dépassement et alertes**
- Le dashboard affiche en temps réel le pourcentage de quota consommé (barre de progression).
- Une alerte email est envoyée à 80% du quota mensuel.
- Une alerte critique est envoyée à 95% du quota.
- Au-delà du quota, les messages supplémentaires sont facturés automatiquement sans interruption de service.
- Le client peut configurer un plafond de dépenses (spending cap) pour bloquer les dépassements si souhaité.
- En cas de plafond atteint, le service retourne un message d'erreur élégant à l'utilisateur final.


# **5. Architecture technique de l'offre Cloud**
## **5.1 Infrastructure cible**
L'infrastructure DomOS Cloud Pro est conçue pour être haute disponibilité, multi-région et scalable horizontalement. La cible initiale utilise une architecture conteneurisée sur un provider cloud (AWS ou GCP) :

|**Composant infrastructure**|**Technologie cible**|**Rôle**|
| :- | :- | :- |
|Reverse proxy / Load balancer|Nginx ou Caddy + Cloudflare|Terminaison TLS, distribution du trafic WebSocket|
|Serveurs DomOS|Docker containers (Node.js)|Instances DomOS managées par projet/client|
|Orchestration containers|Docker Compose (MVP) → Kubernetes (scale)|Déploiement, scaling, health checks|
|Base de données sessions|Redis (cluster)|Sessions WebSocket persistantes, clés API, rate limiting|
|Base de données métier|PostgreSQL|Comptes, projets, organisations, facturation, audit logs|
|Stockage métriques|TimescaleDB ou InfluxDB|Séries temporelles pour analytics et monitoring|
|Queue de messages|Redis Pub/Sub ou BullMQ|Traitement asynchrone des webhooks et alertes|
|Dashboard frontend|Next.js (App Router)|Interface web DomOS Cloud Pro (cloud.domos.dev)|
|API Gateway|NestJS ou Fastify|API REST pour dashboard, facturation, gestion ressources|
|Monitoring infra|Prometheus + Grafana|Alertes internes, métriques infra, SLA tracking|

## **5.2 Isolation multi-tenant**
Chaque projet DomOS Cloud Pro est isolé des autres projets selon les niveaux suivants :

- Isolation des données : chaque projet a son propre namespace Redis et ses propres tables PostgreSQL.
- Isolation réseau : les instances DomOS peuvent être déployées dans des containers isolés avec des réseaux Docker dédiés.
- Isolation des clés API : les clés d'un projet ne fonctionnent pas sur un autre projet.
- Isolation des LLMs : chaque projet a sa propre configuration LLM (modèle, system prompt, HITL policies).

  *ℹ️  Pour le plan Enterprise avec VPC dédié, l'isolation est totale — instance serveur physiquement séparée du cluster mutualisé.*
## **5.3 Gestion des clés LLM par Futur4Tech**
Dans les plans Starter, Pro et Enterprise, Futur4Tech gère les clés API LLM pour le compte des clients. Ce modèle implique :

- Les clés API Google, OpenAI, Anthropic sont détenues par Futur4Tech et mutualisées (avec isolation par projet).
- Le coût LLM est inclus dans le prix de l'abonnement — pas de surprises pour le client.
- Futur4Tech négocie des tarifs volumes avec les providers LLM, améliorant les marges à l'échelle.
- Le client peut optionnellement fournir ses propres clés LLM (plan Enterprise) pour garder le contrôle.

  *⚠️  Les clés LLM Futur4Tech ne sont jamais transmises au client ni exposées dans les SDKs. Elles restent exclusivement côté infrastructure.*
## **5.4 Sécurité de l'offre Cloud**

|**Domaine**|**Mesure de sécurité**|
| :- | :- |
|Transport|TLS 1.3 obligatoire pour toutes les connexions (WSS + HTTPS) — certificats gérés automatiquement (Let's Encrypt via Caddy)|
|Authentification dashboard|Email + password (bcrypt) + 2FA TOTP obligatoire pour les comptes Enterprise|
|Tokens d'accès|JWT signés (RS256) avec expiration courte (1h) + refresh tokens (7j) pour le dashboard|
|Clés API client|Stockées hashées (SHA-256) en base — jamais en clair — révocables instantanément|
|Audit logs|Tous les accès admin, modifications de config et tool calls critiques loggés avec IP, user-agent, timestamp|
|Chiffrement au repos|Données PostgreSQL et Redis chiffrées at-rest (AES-256) sur le provider cloud|
|Backup|Snapshots automatiques PostgreSQL toutes les 6h — rétention 30 jours (Pro) / 365 jours (Enterprise)|
|RGPD / Conformité|Données hébergées en Europe (région EU) par défaut — DPA disponible sur demande|


# **6. Expérience client — Onboarding et suivi**
## **6.1 Parcours d'onboarding client**
Le parcours d'onboarding DomOS Cloud Pro est conçu pour permettre à un développeur de créer son premier agent opérationnel en moins de 15 minutes :

|**Étape**|**Action client**|**Support Futur4Tech**|**Durée estimée**|
| :- | :- | :- | :- |
|1\. Inscription|Création compte cloud.domos.dev (email + password)|Email de bienvenue automatique|2 min|
|2\. Création projet|Nom du projet, sélection LLM, system prompt|Template de system prompt fourni|3 min|
|3\. Génération clé API|Créer une clé pk\_live\_\* depuis le dashboard|Guide contextuel inline|1 min|
|4\. Intégration SDK|Remplacer l'endpoint self-hosted par l'URL Cloud Pro|Snippet de code généré automatiquement|5 min|
|5\. Test & validation|Envoyer un premier message via le dashboard live test|Console de debug intégrée|2 min|
|6\. Déploiement|L'application cliente pointe vers l'URL Cloud Pro|Checklist de déploiement|2 min|

## **6.2 Outils de suivi client (Dashboard)**
Le dashboard DomOS Cloud Pro met à disposition des clients les outils suivants pour suivre leur utilisation et anticiper leurs besoins :
### **6.2.1 Tableau de bord principal**
- Compteur de messages consommés vs quota du mois en cours (barre de progression visuelle).
- Nombre de sessions actives en ce moment (widget temps réel).
- Coût estimé du mois en cours (abonnement + dépassements).
- Statut de tous les projets actifs (vert / orange / rouge).
- Derniers événements système (erreurs, alertes, dépassements).
### **6.2.2 Page Analytics par projet**
- Courbes d'utilisation : messages, sessions, tool calls sur période sélectionnable (7j, 30j, 90j).
- Breakdown par LLM : volume de tokens consommés par modèle.
- Carte des tool calls : liste des tools les plus invoqués avec taux succès/erreur/refus HITL.
- Distribution des latences LLM (histogramme P50/P95/P99).
- Export CSV des données brutes.
### **6.2.3 Gestion des alertes**
- Alerte à 80% et 95% du quota messages mensuel.
- Alerte sur taux d'erreur LLM > seuil configurable (défaut : 5%).
- Alerte sur latence P95 > seuil configurable (défaut : 5 secondes).
- Alerte sur dépassement du nombre de sessions simultanées configuré.
- Canaux d'alerte disponibles : email (tous plans), webhook HTTP (Pro+), Slack (Pro+).
### **6.2.4 Historique de facturation**
- Factures mensuelles téléchargeables en PDF.
- Détail des dépassements par période (date, nombre de messages supplémentaires, coût).
- Projection de facturation pour le mois en cours basée sur la tendance d'utilisation.
- Historique complet des paiements.
## **6.3 Outils de suivi Futur4Tech (opérations internes)**
En parallèle du dashboard client, Futur4Tech dispose d'outils internes pour gérer la plateforme Cloud Pro :

|**Outil interne**|**Objectif**|**Métriques clés suivies**|
| :- | :- | :- |
|Dashboard ops Futur4Tech|Vue globale de la plateforme — santé de tous les projets clients|Sessions totales, erreurs globales, charge CPU/mémoire des instances|
|Alerting infra (PagerDuty / Opsgenie)|Incidents production — escalade automatique selon sévérité|Uptime, latence P99, taux d'erreur WebSocket|
|Tableau de bord MRR / ARR|Suivi des revenus récurrents et de la croissance|MRR, ARR, churn, NRR, nombre de clients par plan|
|Rapport utilisation LLM|Coût réel des LLMs par client vs revenu — calcul des marges|Tokens consommés, coût API LLM, marge par plan|
|Funnel conversion|Suivi Community → Starter → Pro → Enterprise|Taux de conversion, time-to-upgrade, plans abandonnés|


# **7. Stratégie Open Source vs DomOS Cloud Pro**
## **7.1 Ce qui reste Open Source (MIT) — toujours et à jamais**
Futur4Tech s'engage formellement à ne jamais retirer les éléments suivants de la licence MIT :

|**Composant**|**Statut OSS**|**Justification stratégique**|
| :- | :- | :- |
|Protocole ADTP (spécification)|MIT — permanent|Standard ouvert — l'écosystème doit pouvoir implémenter le protocole librement|
|@domos/server (core)|MIT — permanent|Self-hosting garanti — les clients ne sont jamais captifs|
|@domos/core (types, HITL, validation)|MIT — permanent|Fondation partagée — toute l'écosystème en dépend|
|@domos/react, @domos/vue, @domos/svelte, @domos/flutter|MIT — permanent|Adoption maximale — les développeurs doivent pouvoir intégrer sans friction|
|@domos/adapter-google, openai, anthropic|MIT — permanent|Interopérabilité LLM — pas de lock-in sur le choix du modèle|
|Système HITL (HITLPolicy, modaux)|MIT — permanent|Sécurité universelle — toute application DomOS doit pouvoir être sécurisée|
|DomosAgent — Agentic UI SDK (core)|MIT — permanent|Valeur différenciante cœur — partagée avec la communauté pour l'adoption|

## **7.2 Ce qui est exclusif à DomOS Cloud Pro**

|**Composant**|**Exclusif Cloud Pro**|**Justification**|
| :- | :- | :- |
|Serveur DomOS managé (hébergement)|Oui|Valeur d'usage — pas de gestion d'infrastructure pour le client|
|Dashboard admin web (cloud.domos.dev)|Oui|Interface propriétaire — valeur ajoutée UI/UX Futur4Tech|
|Analytics avancées (rétention > 30j, export BI)|Oui (Pro+)|Data insights — investissement produit significatif|
|Multi-tenant manager|Oui (Pro+)|Complexité infrastructure — justifie le plan payant|
|LLMs gérés (clés Futur4Tech)|Oui|Coût opérationnel — inclus dans le prix d'abonnement|
|Webhooks & intégrations|Oui (Pro+)|Connectivité entreprise — valeur B2B|
|Audit logs complets|Oui (Enterprise)|Conformité réglementaire — valeur enterprise|
|SSO / SAML|Oui (Enterprise)|Prérequis enterprise — infrastructure IAM dédiée|
|SLA contractuels avec compensation|Oui (payant)|Engagement financier Futur4Tech — impossible sans revenu|
|Support prioritaire & CSM|Oui (payant)|Ressource humaine Futur4Tech — scalable avec le revenu|

## **7.3 Ligne directrice — Décision OSS vs Payant**
Pour chaque nouvelle feature DomOS, Futur4Tech applique la règle suivante pour décider si elle doit être OSS ou Cloud Pro :

- OSS si la feature améliore la sécurité, la fiabilité ou l'interopérabilité du protocole pour tous les utilisateurs.
- OSS si la feature est un composant SDK côté client (React, Vue, Svelte, Flutter) — adoption maximale.
- Cloud Pro si la feature requiert une infrastructure hébergée pour fonctionner.
- Cloud Pro si la feature représente un avantage compétitif opérationnel de Futur4Tech (analytics, monitoring, support).
- Cloud Pro si la feature requiert un investissement récurrent de Futur4Tech (support humain, LLM costs, SLA).

  *ℹ️  En cas de doute, Futur4Tech privilégie l'OSS pour maintenir la confiance et l'adoption de la communauté.*
## **7.4 Stratégie communauté — Conversion OSS → Cloud Pro**
Le funnel de conversion naturel repose sur la progression de complexité :

1. Le développeur découvre DomOS via GitHub, la documentation ou un article technique.
1. Il intègre DomOS en self-hosted (Community) — adoption sans friction, gratuit.
1. Son projet grandit — la gestion de l'infrastructure devient une charge (updates, monitoring, sécurité).
1. Il migre vers Starter Cloud pour 29 $/mois — aucun changement de code côté client SDK.
1. Son équipe et son usage augmentent — il monte vers Pro Cloud pour le multi-tenant et les analytics.
1. Son entreprise exige des SLA et un SSO — passage Enterprise sur contrat.

La clé de ce funnel : la migration Community → Cloud ne nécessite qu'un changement d'URL de connexion WebSocket dans le code client. Aucune refactorisation.


# **8. Roadmap DomOS Cloud Pro**
## **8.1 Phases de lancement**

|**Phase**|**Période**|**Objectifs**|**Livrables**|
| :- | :- | :- | :- |
|Phase 0 — Foundation|Q1-Q2 2026|Finalisation SDK v1.0, infrastructure Cloud MVP|SDK stable, CI/CD, infrastructure Docker, domaine cloud.domos.dev|
|Phase 1 — Alpha Cloud|Q2 2026|Premiers clients early adopters (10-20 clients)|Dashboard basique, plan Starter, 1 région EU, monitoring interne|
|Phase 2 — Beta publique|Q3 2026|Ouverture inscriptions, plan Pro disponible|Plans Starter + Pro, analytics v1, webhooks, onboarding automatisé|
|Phase 3 — GA (General Availability)|Q4 2026|Lancement officiel, plan Enterprise|Tous les plans, SLA contractuels, SSO, support CSM, marketing|
|Phase 4 — Scale|2027|Croissance internationale, nouvelles régions|Multi-région (US, Africa), partenariats intégrateurs, SDK Swift/Kotlin|

## **8.2 Métriques de succès Cloud Pro**

|**Métrique**|**Cible Phase 1 (Alpha)**|**Cible Phase 3 (GA)**|**Cible Phase 4 (Scale)**|
| :- | :- | :- | :- |
|Clients actifs payants|10-20|100+|500+|
|MRR (Monthly Recurring Revenue)|500-2 000 $|10 000-30 000 $|100 000+ $|
|Taux de conversion Community → Payant|—|3-5%|5-8%|
|NPS (Net Promoter Score)|> 40|> 50|> 60|
|Uptime SLA respecté|99,5%|99,9%|99,99%|
|Churn mensuel|< 10%|< 5%|< 3%|


# **9. Risques et plan de mitigation**

|**Risque**|**Probabilité**|**Impact**|**Mitigation**|
| :- | :- | :- | :- |
|Coût LLM supérieur aux prévisions (modèles chers)|Moyenne|Élevé|Négociation volume avec providers, mise en cache des réponses LLM, modèles économiques par défaut (Flash/Mini)|
|Compétiteur majeur copie le modèle (AG-UI, Vercel)|Haute|Moyen|Différenciation DomosAgent, rapidité d'exécution, communauté active, brevets éventuels sur ADTP|
|Adoption OSS faible — funnel conversion insuffisant|Moyenne|Élevé|Marketing contenu (articles, vidéos), présence GitHub, contributions open source, partenariats devrel|
|Incident sécurité sur l'infrastructure Cloud|Faible|Très élevé|Pen testing régulier, WAF Cloudflare, isolation containers, backup automatique, plan de réponse incident|
|Migration vers concurrents si pricing trop élevé|Faible|Moyen|Tarification compétitive, lock-in doux (dashboard, analytics, support), plan Community toujours disponible|
|Dépendance aux APIs LLM tierces (OpenAI, Google)|Haute|Moyen|Multi-providers, adaptateurs interchangeables, possibilité d'apporter ses propres clés (Enterprise)|


# **10. Annexes**
## **10.1 Glossaire Cloud**

|**Terme**|**Définition**|
| :- | :- |
|MRR|Monthly Recurring Revenue — revenus récurrents mensuels issus des abonnements actifs.|
|ARR|Annual Recurring Revenue — MRR × 12 — indicateur de la taille annualisée du business.|
|NRR|Net Revenue Retention — pourcentage du revenu conservé et expansé auprès des clients existants.|
|Churn|Taux de désabonnement — pourcentage de clients qui annulent leur abonnement sur une période.|
|MQL|Marketing Qualified Lead — prospect ayant montré de l'intérêt (signup Community, étoile GitHub, etc.).|
|Multi-tenant|Architecture permettant à plusieurs clients (tenants) de partager la même infrastructure avec isolation complète.|
|VPC|Virtual Private Cloud — environnement réseau isolé dédié à un client Enterprise.|
|SLA|Service Level Agreement — engagement contractuel sur la disponibilité et les temps de réponse du service.|
|Open Core|Modèle commercial combinant un cœur open source et des fonctionnalités premium payantes.|
|CSM|Customer Success Manager — référent dédié Futur4Tech pour accompagner les clients Enterprise.|
|DomosAgent|Agentic UI SDK — composant natif DomOS transformant le DOM Operating System en plateforme agentique complète avec mémoire, rôles et planification.|

## **10.2 Références**
- CdC Fonctionnel DomOS — Scénarios, acteurs, cas d'usage et exigences fonctionnelles
- CdC Technique DomOS — Architecture, stack, protocole ADTP et sécurité
- DomosAgent.md — Architecture et vision du composant Agentic UI SDK
- PRICING-MODELS.md — Modèles de tarification détaillés (document de référence interne)
- HITL\_SECURITY.md — Documentation du système HITL intégré à l'offre Cloud
## **10.3 Contacts**

|**Rôle**|**Nom**|**Organisation**|
| :- | :- | :- |
|CEO & Architecte principal|Kouakou Ghislain Boris (BorisBob)|Futur4Tech|
|Organisation|Futur4Tech|Abidjan, Côte d'Ivoire|
|Projet Cloud|DomOS Cloud Pro|cloud.domos.dev (provisoire)|


*Document confidentiel — Futur4Tech © 2026 — DomOS Cloud Pro*
Page 
