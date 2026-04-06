DomOS — Store Connect (Shopify & WooCommerce) — Futur4Tech





**DomOS**

*DOM Operating System*



**CAHIER DES CHARGES**

**Store Connect**

**Connexion & Gestion des Boutiques E-Commerce**

**Shopify**  ·  **WooCommerce**

*OAuth · wc-auth · Clés API DomOS par boutique · Sécurité · v3 Ready*

Version 1.0 —  Mars 2026


|**Projet**|DomOS — Store Connect|
| :- | :- |
|**Type de document**|CdC fonctionnel + technique|
|**Complément de**|CdC @domos/shopify & @domos/woocommerce (Doc 9)|
|**Organisation**|Futur4Tech|
|**Responsable**|Kouakou Boris (CEO)|
|**Date**|Mars 2026|
|**Composant backend**|NestJS — StoreConnectModule|
|**Composant frontend**|Dashboard DomOS Cloud Pro — Store Connect UI|
|**Statut**|En conception — v3 Ready by design|


# <a name="_toc225000912"></a>**Table des matières**
[Table des matières	1](#_toc225000912)

[1. Vision et objectifs	1](#_toc225000913)

[1.1 Pourquoi Store Connect	1](#_toc225000914)

[1.2 Identifiants uniques par plateforme	1](#_toc225000915)

[1.3 Vue d'ensemble du flux Store Connect	1](#_toc225000916)

[2. Acteurs et scénarios	1](#_toc225000917)

[2.1 Acteurs	1](#_toc225000918)

[2.2 CU-SC01 — Connexion automatique Shopify (OAuth)	1](#_toc225000919)

[Flux principal	1](#_toc225000920)

[2.3 CU-SC02 — Connexion automatique WooCommerce (wc-auth)	1](#_toc225000921)

[Flux principal	1](#_toc225000922)

[2.4 CU-SC03 — Connexion manuelle (les deux plateformes)	1](#_toc225000923)

[Flux principal — Shopify manuel	1](#_toc225000924)

[Flux principal — WooCommerce manuel	1](#_toc225000925)

[2.5 CU-SC04 — Génération et gestion des clés API DomOS par boutique	1](#_toc225000926)

[Format des clés API DomOS par boutique	1](#_toc225000927)

[Utilisation dans @domos/shopify	1](#_toc225000928)

[Utilisation dans @domos/woocommerce	1](#_toc225000929)

[2.6 CU-SC05 — Révocation et déconnexion d'une boutique	1](#_toc225000930)

[Flux principal — Révocation depuis le dashboard DomOS	1](#_toc225000931)

[Flux alternatif — Webhook Shopify app/uninstalled	1](#_toc225000932)

[3. Architecture technique — StoreConnectModule	1](#_toc225000933)

[3.1 Vue d'ensemble du module NestJS	1](#_toc225000934)

[3.2 Endpoints REST du StoreConnectModule	1](#_toc225000935)

[3.3 Entité Store — PostgreSQL	1](#_toc225000936)

[3.4 Entité StoreCredential — PostgreSQL	1](#_toc225000937)

[3.5 Entité StoreApiKey — PostgreSQL	1](#_toc225000938)

[4. Mécanismes de sécurité	1](#_toc225000939)

[4.1 Protection CSRF — State parameter	1](#_toc225000940)

[4.2 Vérification des webhooks Shopify (HMAC)	1](#_toc225000941)

[4.3 Chiffrement des credentials — AES-256-GCM	1](#_toc225000942)

[4.4 Validation de la clé API DomOS côté serveur WebSocket	1](#_toc225000943)

[4.5 Rate limiting spécifique aux flux d'autorisation	1](#_toc225000944)

[4.6 Audit trail — Log de sécurité	1](#_toc225000945)

[5. Cas d'erreur et comportements attendus	1](#_toc225000946)

[5.1 Erreurs de connexion OAuth Shopify	1](#_toc225000947)

[5.2 Erreurs de connexion wc-auth WooCommerce	1](#_toc225000948)

[5.3 Erreurs de validation des clés API DomOS	1](#_toc225000949)

[5.4 Erreurs de révocation et de déconnexion	1](#_toc225000950)

[6. Gestion des boutiques — Interface Dashboard	1](#_toc225000951)

[6.1 Page 'Store Connect' dans le dashboard DomOS Cloud Pro	1](#_toc225000952)

[6.1.1 Vue liste des boutiques	1](#_toc225000953)

[6.1.2 Wizard de connexion	1](#_toc225000954)

[6.1.3 Page détail d'une boutique	1](#_toc225000955)

[6.2 Snippet d'intégration généré	1](#_toc225000956)

[Snippet Shopify (theme.liquid)	1](#_toc225000957)

[Snippet WooCommerce (functions.php ou plugin auto-configuré)	1](#_toc225000958)

[6.3 Rotation des clés API DomOS	1](#_toc225000959)

[7. Vérification périodique des credentials	1](#_toc225000960)

[7.1 Tâche de vérification planifiée	1](#_toc225000961)

[7.2 Notifications marchands	1](#_toc225000962)

[8. Scopes et permissions demandés	1](#_toc225000963)

[8.1 Scopes Shopify demandés	1](#_toc225000964)

[8.2 Permissions WooCommerce demandées	1](#_toc225000965)

[9. Préparation v3 — Stores Registry	1](#_toc225000966)

[9.1 Pourquoi le Stores Registry est stratégique	1](#_toc225000967)

[9.2 Architecture cible v3 (aperçu)	1](#_toc225000968)

[10. Exigences	1](#_toc225000969)

[10.1 Exigences fonctionnelles	1](#_toc225000970)

[10.2 Exigences de sécurité	1](#_toc225000971)

[11. Annexes	1](#_toc225000972)

[11.1 Comparaison des mécanismes d'autorisation	1](#_toc225000973)

[11.2 Références	1](#_toc225000974)




# <a name="_toc225000913"></a>**1. Vision et objectifs**
## <a name="_toc225000914"></a>**1.1 Pourquoi Store Connect**
Store Connect est le module de DomOS Cloud Pro qui gère l'ensemble du cycle de vie des boutiques e-commerce connectées à la plateforme. Pour qu'un marchand Shopify ou WooCommerce puisse utiliser DomOS dans sa boutique, plusieurs mécanismes doivent être en place : autorisation d'accès à la plateforme (OAuth ou wc-auth), génération d'une clé API DomOS spécifique à sa boutique, configuration du widget pour son environnement, et identification unique de la boutique pour le suivi et la facturation.

Store Connect répond à trois besoins distincts :

- Pour le marchand — un processus d'installation simple et guidé, avec deux modes (automatique via OAuth et manuel via saisie directe), sans compétences techniques avancées requises.
- Pour Futur4Tech — une identification unique et fiable de chaque boutique connectée, permettant le suivi d'usage, la facturation et la préparation de la v3 (exposition MCP par boutique).
- Pour la sécurité — des mécanismes robustes de vérification d'identité de boutique, de rotation de credentials, de révocation et d'audit trail.
## <a name="_toc225000915"></a>**1.2 Identifiants uniques par plateforme**
L'identifiant unique d'une boutique est la clé de voûte de Store Connect. Il doit être stable, immuable et global pour permettre le suivi cross-session et la préparation de la v3 :

|**Plateforme**|**Identifiant unique**|**Format**|**Immuabilité**|**Usage v3**|
| :- | :- | :- | :- | :- |
|Shopify|shop\_domain|ma-boutique.myshopify.com|Permanent — jamais modifiable|Clé primaire MCP endpoint par boutique|
|WooCommerce|site\_url|https://ma-boutique.com|Stable — change si migration domaine|Clé primaire MCP endpoint par boutique|

*ℹ️  Le shop\_domain Shopify est garanti unique et immuable par Shopify. Le site\_url WooCommerce peut changer en cas de migration de domaine — un mécanisme de re-liaison est prévu dans ce cas.*
## <a name="_toc225000916"></a>**1.3 Vue d'ensemble du flux Store Connect**

|**Étape**|**Shopify (Auto)**|**WooCommerce (Auto)**|**Les deux (Manuel)**|
| :- | :- | :- | :- |
|1\. Initiation|Marchand clique 'Connecter Shopify' dans le dashboard DomOS|Marchand clique 'Connecter WooCommerce' dans le dashboard DomOS|Marchand clique 'Connexion manuelle' dans le dashboard DomOS|
|2\. Identification|Saisie du shop\_domain (ma-boutique.myshopify.com)|Saisie de l'URL WordPress (https://ma-boutique.com)|Saisie du type de plateforme + identifiant boutique|
|3\. Autorisation|Redirection OAuth Shopify — écran consentement Shopify|Redirection wc-auth WordPress — écran approbation WP Admin|Saisie manuelle des credentials (access\_token ou consumer\_key/secret)|
|4\. Réception credentials|DomOS reçoit access\_token Shopify via callback OAuth|DomOS reçoit consumer\_key + consumer\_secret via POST wc-auth|DomOS enregistre les credentials fournis manuellement|
|5\. Vérification|DomOS vérifie le token en appelant Shopify API /shop.json|DomOS vérifie les clés en appelant WooCommerce /system-status|DomOS vérifie les credentials selon le type de plateforme|
|6\. Enregistrement|Boutique enregistrée avec shopId unique, access\_token chiffré, clé API DomOS générée|Boutique enregistrée avec storeId unique, credentials chiffrés, clé API DomOS générée|Idem — même enregistrement final|
|7\. Configuration widget|Snippet d'intégration généré avec la clé API DomOS et le shop\_domain|Plugin WordPress configuré automatiquement avec la clé API DomOS|Snippet généré avec la clé API DomOS|


# <a name="_toc225000917"></a>**2. Acteurs et scénarios**
## <a name="_toc225000918"></a>**2.1 Acteurs**

|**Acteur**|**Profil**|**Interactions avec Store Connect**|
| :- | :- | :- |
|Marchand Shopify|Propriétaire d'une boutique Shopify — peut être non-technique|Initie la connexion, approuve les scopes OAuth Shopify, consulte et révoque sa connexion|
|Marchand WooCommerce|Administrateur WordPress + WooCommerce — niveau technique variable|Initie la connexion wc-auth ou saisit manuellement les clés, configure le plugin|
|Développeur intégrateur|Développeur qui intègre @domos/shopify ou @domos/woocommerce pour le compte d'un marchand|Utilise le mode manuel, génère et gère les clés API DomOS pour la boutique|
|Administrateur DomOS (Futur4Tech)|Équipe Futur4Tech — accès ops complet|Consulte toutes les boutiques connectées, révoque des accès, monitore les connexions suspectes|
|Système Shopify|Plateforme Shopify — émetteur des tokens OAuth|Valide les scopes, émet les access\_tokens, envoie les webhooks de désinstallation|
|Système WooCommerce|Instance WordPress + WooCommerce du marchand|Génère et transmet les consumer\_key/secret via wc-auth, valide les requêtes API|

## <a name="_toc225000919"></a>**2.2 CU-SC01 — Connexion automatique Shopify (OAuth)**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-SC01|
|Nom|Connexion automatique d'une boutique Shopify via OAuth 2.0|
|Acteurs|Marchand Shopify, Dashboard DomOS Cloud Pro, Système Shopify, StoreConnectModule (NestJS)|
|Déclencheur|Le marchand clique sur 'Connecter une boutique Shopify' dans le dashboard DomOS|
|Précondition|Marchand connecté à son compte DomOS Cloud Pro, boutique Shopify active|
|Résultat attendu|Boutique Shopify enregistrée, access\_token chiffré, clé API DomOS générée, snippet d'intégration disponible|

### <a name="_toc225000920"></a>**Flux principal**
1. Le marchand clique 'Connecter Shopify' dans le dashboard DomOS Cloud Pro.
1. Le dashboard affiche un champ de saisie : 'Entrez votre domaine Shopify (ex: ma-boutique.myshopify.com)'.
1. Le marchand saisit son shop\_domain et clique 'Continuer'.
1. Le StoreConnectModule génère un state CSRF unique (UUID v4) et le stocke en Redis (TTL 10 min).
1. Le marchand est redirigé vers l'URL d'autorisation Shopify avec les paramètres : client\_id, scope, redirect\_uri, state.
1. Shopify affiche l'écran de consentement avec la liste des scopes demandés par DomOS.
1. Le marchand clique 'Installer l'application' — il approuve les scopes.
1. Shopify redirige vers le callback DomOS (/api/store-connect/shopify/callback) avec code et state.
1. Le StoreConnectModule vérifie le state contre le Redis (protection CSRF). Si invalide : ERR-SC03.
1. Le StoreConnectModule échange le code contre un access\_token via POST à Shopify.
1. Il appelle GET /admin/api/2024-01/shop.json pour vérifier le token et récupérer les métadonnées de la boutique.
1. L'access\_token est chiffré (AES-256-GCM) et stocké en PostgreSQL avec le shop\_domain comme clé.
1. Une clé API DomOS unique est générée pour cette boutique (format : pk\_shopify\_{shop\_hash}\_{random}).
1. La boutique est enregistrée dans la table stores avec un storeId UUID unique.
1. Le marchand est redirigé vers le dashboard avec un snippet d'intégration prêt à copier.
## <a name="_toc225000921"></a>**2.3 CU-SC02 — Connexion automatique WooCommerce (wc-auth)**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-SC02|
|Nom|Connexion automatique d'une boutique WooCommerce via wc-auth|
|Acteurs|Marchand WooCommerce, Dashboard DomOS Cloud Pro, WordPress Admin, StoreConnectModule|
|Déclencheur|Le marchand clique sur 'Connecter une boutique WooCommerce' dans le dashboard DomOS|
|Précondition|Marchand connecté à DomOS Cloud Pro, WordPress + WooCommerce installé et accessible publiquement|
|Résultat attendu|Boutique WooCommerce enregistrée, consumer\_key/secret chiffrés, clé API DomOS générée|

### <a name="_toc225000922"></a>**Flux principal**
1. Le marchand clique 'Connecter WooCommerce' dans le dashboard DomOS.
1. Le dashboard demande l'URL de la boutique WordPress (ex: https://ma-boutique.com).
1. Le StoreConnectModule génère un state CSRF unique (UUID v4) stocké en Redis (TTL 10 min).
1. Le StoreConnectModule construit l'URL wc-auth : {site\_url}/wc-auth/v1/authorize?app\_name=DomOS&scope=read\_write&user\_id={userId}&return\_url={dashboard\_url}&callback\_url={callback\_url}.
1. Le marchand est redirigé vers cette URL — il arrive sur son admin WordPress.
1. WordPress affiche la page d'approbation WooCommerce avec les permissions demandées.
1. Le marchand clique 'Approuver' — WooCommerce génère les clés API.
1. WooCommerce envoie un POST à notre callback\_url avec : key\_id, user\_id, consumer\_key, consumer\_secret, key\_permissions.
1. Le StoreConnectModule valide le user\_id contre le state Redis (protection CSRF).
1. Il appelle GET {site\_url}/wp-json/wc/v3/system-status avec les clés pour vérification.
1. consumer\_key et consumer\_secret sont chiffrés (AES-256-GCM) et stockés en PostgreSQL.
1. L'URL canonique (site\_url normalisée) est enregistrée comme identifiant unique de boutique.
1. Une clé API DomOS unique est générée (format : pk\_woo\_{site\_hash}\_{random}).
1. La boutique est enregistrée dans la table stores avec un storeId UUID unique.
1. Le plugin WordPress reçoit la clé API DomOS via la réponse de vérification — il se configure automatiquement.
1. Le marchand est redirigé vers le dashboard — boutique connectée et configurée.
## <a name="_toc225000923"></a>**2.4 CU-SC03 — Connexion manuelle (les deux plateformes)**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-SC03|
|Nom|Connexion manuelle d'une boutique via saisie directe des credentials|
|Acteurs|Développeur intégrateur, Dashboard DomOS Cloud Pro, StoreConnectModule|
|Déclencheur|Le développeur choisit le mode 'Connexion manuelle' dans le dashboard|
|Cas d'usage|Développeur qui configure DomOS pour le compte d'un marchand, accès OAuth impossible (Shopify private app), environnement de développement local|
|Résultat attendu|Boutique enregistrée avec les credentials fournis manuellement, clé API DomOS générée|

### <a name="_toc225000924"></a>**Flux principal — Shopify manuel**
1. Le développeur sélectionne 'Shopify' + 'Connexion manuelle'.
1. Le dashboard affiche un formulaire : shop\_domain + access\_token (Shopify Private App ou Custom App token).
1. Le développeur saisit les valeurs et clique 'Vérifier et connecter'.
1. Le StoreConnectModule appelle GET /admin/api/2024-01/shop.json pour valider le token.
1. Si valide : enregistrement identique au flux OAuth (chiffrement, storeId, clé API DomOS).
1. Si invalide : ERR-SC06 — message d'erreur descriptif avec guide de résolution.
### <a name="_toc225000925"></a>**Flux principal — WooCommerce manuel**
1. Le développeur sélectionne 'WooCommerce' + 'Connexion manuelle'.
1. Le dashboard affiche : site\_url + consumer\_key + consumer\_secret.
1. Le StoreConnectModule appelle GET /wp-json/wc/v3/system-status pour valider les clés.
1. Si valide : enregistrement identique au flux wc-auth.
1. Si invalide : ERR-SC07 avec guide de résolution (vérifier permissions, SSL, URL WordPress).
## <a name="_toc225000926"></a>**2.5 CU-SC04 — Génération et gestion des clés API DomOS par boutique**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-SC04|
|Nom|Génération, consultation et gestion des clés API DomOS spécifiques à une boutique|
|Acteurs|Marchand / Développeur intégrateur, Dashboard DomOS Cloud Pro|
|Déclencheur|Boutique connectée — clé API DomOS générée automatiquement, ou demande manuelle de régénération|
|Résultat attendu|Clé API DomOS unique par boutique, utilisable dans @domos/shopify ou @domos/woocommerce pour instancier le widget|

### <a name="_toc225000927"></a>**Format des clés API DomOS par boutique**
Chaque boutique connectée reçoit une clé API DomOS unique dans un format qui encode le type de plateforme et un hash de l'identifiant de la boutique :

// Format général

pk\_{environment}\_{platform}\_{store\_hash}\_{random\_suffix}

// Exemples

pk\_live\_shopify\_a3f8b2\_x9kL4mN7pQ2  // Boutique Shopify en production

pk\_live\_woo\_c7d1e9\_mK5nP8rT3vW     // Boutique WooCommerce en production

pk\_dev\_shopify\_a3f8b2\_test123      // Boutique Shopify en développement

### <a name="_toc225000928"></a>**Utilisation dans @domos/shopify**
DomOSShopify.init({

`  `// Clé API DomOS spécifique à cette boutique Shopify

`  `apiKey: 'pk\_live\_shopify\_a3f8b2\_x9kL4mN7pQ2',

`  `endpoint: 'wss://cloud.domos.dev/domos',

`  `// shop\_domain est auto-détecté depuis Shopify Liquid

`  `// Le serveur DomOS valide apiKey + shop\_domain en combinaison

});

### <a name="_toc225000929"></a>**Utilisation dans @domos/woocommerce**
// Via plugin WordPress — wp\_localize\_script injecte automatiquement

DomOSWoo.init({

`  `apiKey: 'pk\_live\_woo\_c7d1e9\_mK5nP8rT3vW',

`  `endpoint: 'wss://cloud.domos.dev/domos',

`  `// site\_url est auto-détecté depuis WordPress

`  `// Le serveur DomOS valide apiKey + site\_url en combinaison

});

*ℹ️  La clé API DomOS ne donne accès qu'à la boutique pour laquelle elle a été générée. Une tentative d'utiliser la clé d'une boutique A sur une boutique B est rejetée par le serveur DomOS (validation combinée apiKey + identifiant boutique).*
## <a name="_toc225000930"></a>**2.6 CU-SC05 — Révocation et déconnexion d'une boutique**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-SC05|
|Nom|Révocation de l'accès DomOS pour une boutique|
|Acteurs|Marchand, Dashboard DomOS, StoreConnectModule, Système Shopify/WooCommerce|
|Déclencheur|Le marchand déconnecte sa boutique depuis le dashboard DomOS, OU Shopify envoie un webhook app/uninstalled|
|Résultat attendu|Tous les accès sont révoqués, les credentials supprimés, les sessions WebSocket actives fermées, les clés API DomOS invalidées|

### <a name="_toc225000931"></a>**Flux principal — Révocation depuis le dashboard DomOS**
1. Le marchand clique 'Déconnecter cette boutique' dans la page de gestion Store Connect.
1. Un modal HITL critical s'affiche : 'Cette action révoquera tous les accès DomOS pour votre boutique. Cette action est irréversible. Confirmer ?'
1. Le marchand confirme. Le StoreConnectModule déclenche le flux de révocation.
1. Toutes les sessions WebSocket actives liées à cette boutique sont fermées avec un SYSTEM\_EVENT kind: disconnect.
1. Toutes les clés API DomOS de la boutique sont invalidées en Redis.
1. Les credentials chiffrés (access\_token Shopify ou consumer\_key/secret WooCommerce) sont supprimés de PostgreSQL.
1. Un audit log est créé : révocation volontaire, timestamp, userId.
1. Pour Shopify : appel à l'API Shopify pour révoquer l'access\_token côté Shopify.
1. Le storeId est marqué comme disconnected (pas supprimé — conservation pour historique et v3).
### <a name="_toc225000932"></a>**Flux alternatif — Webhook Shopify app/uninstalled**
1. Le marchand désinstalle l'app DomOS depuis son admin Shopify.
1. Shopify envoie un webhook POST à /api/webhooks/shopify/app-uninstalled avec shop\_domain et topic.
1. DomOS valide la signature HMAC du webhook Shopify.
1. Le flux de révocation est déclenché automatiquement (étapes 4-9 identiques).
1. Un email de notification est envoyé au marchand : 'Votre boutique a été déconnectée de DomOS.'


# <a name="_toc225000933"></a>**3. Architecture technique — StoreConnectModule**
## <a name="_toc225000934"></a>**3.1 Vue d'ensemble du module NestJS**
Le StoreConnectModule est un module NestJS dédié dans le backend DomOS Cloud Pro. Il gère l'ensemble du cycle de vie des boutiques connectées : autorisation, enregistrement, validation, gestion des credentials et génération des clés API DomOS.

packages/server/src/store-connect/

├── store-connect.module.ts

├── store-connect.controller.ts      # Endpoints REST — dashboard + callbacks OAuth

├── store-connect.service.ts         # Logique métier orchestration

│

├── shopify/

│   ├── shopify-oauth.service.ts     # Flux OAuth Shopify — init, callback, exchange

│   ├── shopify-verify.service.ts    # Vérification token + métadonnées boutique

│   ├── shopify-webhook.service.ts   # Réception et traitement webhooks Shopify

│   └── shopify-revoke.service.ts    # Révocation token côté Shopify API

│

├── woocommerce/

│   ├── woo-auth.service.ts          # Flux wc-auth — génération URL, réception callback

│   ├── woo-verify.service.ts        # Vérification consumer\_key/secret

│   └── woo-revoke.service.ts        # Révocation clés API WooCommerce

│

├── common/

│   ├── store-key.service.ts         # Génération clés API DomOS par boutique

│   ├── credentials.service.ts       # Chiffrement/déchiffrement AES-256-GCM

│   └── store-validator.service.ts   # Validation identifiant boutique (format, unicité)

│

└── entities/

`    `├── store.entity.ts              # Entité PostgreSQL principale

`    `├── store-credential.entity.ts   # Entité credentials chiffrés

`    `└── store-api-key.entity.ts      # Entité clés API DomOS

## <a name="_toc225000935"></a>**3.2 Endpoints REST du StoreConnectModule**

|**Endpoint**|**Méthode**|**Auth**|**Description**|
| :- | :- | :- | :- |
|POST /api/store-connect/shopify/init|POST|JWT (marchand)|Initie le flux OAuth Shopify — valide shop\_domain, génère state CSRF, retourne l'URL d'autorisation Shopify|
|GET /api/store-connect/shopify/callback|GET|Aucune (callback Shopify)|Reçoit le code OAuth Shopify, vérifie state CSRF, échange contre access\_token|
|POST /api/store-connect/shopify/manual|POST|JWT (marchand)|Connexion manuelle Shopify — vérifie access\_token fourni et enregistre la boutique|
|POST /api/store-connect/woocommerce/init|POST|JWT (marchand)|Génère l'URL wc-auth pour la boutique WooCommerce fournie|
|POST /api/store-connect/woocommerce/callback|POST|Aucune (callback WooCommerce)|Reçoit consumer\_key/secret via wc-auth POST, valide user\_id CSRF, enregistre la boutique|
|POST /api/store-connect/woocommerce/manual|POST|JWT (marchand)|Connexion manuelle WooCommerce — vérifie consumer\_key/secret et enregistre la boutique|
|GET /api/store-connect/stores|GET|JWT (marchand)|Lister toutes les boutiques connectées du compte avec statut et métriques|
|GET /api/store-connect/stores/:storeId|GET|JWT (marchand)|Détail d'une boutique — statut, clés API, dernière activité, métriques|
|POST /api/store-connect/stores/:storeId/keys/rotate|POST|JWT (marchand)|Régénérer la clé API DomOS d'une boutique (rotation)|
|DELETE /api/store-connect/stores/:storeId|DELETE|JWT (marchand)|Révoquer l'accès et déconnecter une boutique|
|POST /api/webhooks/shopify/app-uninstalled|POST|HMAC Shopify|Webhook Shopify — déconnexion automatique si l'app est désinstallée|

## <a name="_toc225000936"></a>**3.3 Entité Store — PostgreSQL**

|**Champ**|**Type SQL**|**Description**|
| :- | :- | :- |
|id|UUID (PK)|Identifiant interne unique DomOS — storeId — jamais exposé au client|
|organizationId|UUID (FK → organizations)|Organisation DomOS Cloud Pro à laquelle appartient la boutique|
|platform|ENUM('shopify','woocommerce')|Type de plateforme e-commerce|
|shopIdentifier|VARCHAR(255) UNIQUE|Identifiant unique de la boutique : shop\_domain (Shopify) ou site\_url normalisé (WooCommerce)|
|shopName|VARCHAR(255)|Nom de la boutique récupéré lors de la vérification (shop.name)|
|shopEmail|VARCHAR(255)|Email propriétaire récupéré lors de la vérification|
|shopCountry|VARCHAR(10)|Code pays ISO de la boutique (pour facturation et conformité)|
|shopCurrency|VARCHAR(10)|Devise principale de la boutique|
|connectionMode|ENUM('oauth','wc\_auth','manual')|Mode de connexion utilisé|
|status|ENUM('active','disconnected','suspended','pending')|Statut de la connexion|
|lastVerifiedAt|TIMESTAMP|Dernière vérification réussie des credentials|
|disconnectedAt|TIMESTAMP (nullable)|Date de déconnexion (si applicable)|
|disconnectReason|VARCHAR(255) (nullable)|Raison de déconnexion (user\_request, webhook\_uninstall, credential\_invalid)|
|metadata|JSONB|Métadonnées plateforme — version Shopify/WooCommerce, plugins actifs, thème|
|v3Ready|BOOLEAN (défaut: true)|Flag indiquant que la boutique est indexée pour la v3 MCP|
|createdAt|TIMESTAMP|Date de première connexion|
|updatedAt|TIMESTAMP|Dernière mise à jour|

## <a name="_toc225000937"></a>**3.4 Entité StoreCredential — PostgreSQL**

|**Champ**|**Type SQL**|**Description**|
| :- | :- | :- |
|id|UUID (PK)|Identifiant interne|
|storeId|UUID (FK → stores)|Boutique associée|
|credentialType|ENUM('shopify\_access\_token','woo\_consumer\_key','woo\_consumer\_secret')|Type de credential|
|encryptedValue|TEXT|Valeur chiffrée AES-256-GCM|
|iv|VARCHAR(32)|Vecteur d'initialisation AES (unique par entrée)|
|authTag|VARCHAR(32)|Tag d'authentification GCM (intégrité garantie)|
|keyVersion|INTEGER|Version de la clé de chiffrement (pour rotation des clés maîtres)|
|expiresAt|TIMESTAMP (nullable)|Expiration si token Shopify limité dans le temps|
|createdAt|TIMESTAMP|Date de création|
|rotatedAt|TIMESTAMP (nullable)|Dernière rotation du credential|

## <a name="_toc225000938"></a>**3.5 Entité StoreApiKey — PostgreSQL**

|**Champ**|**Type SQL**|**Description**|
| :- | :- | :- |
|id|UUID (PK)|Identifiant interne|
|storeId|UUID (FK → stores)|Boutique associée|
|keyHash|VARCHAR(64)|SHA-256 de la clé API DomOS — jamais la clé en clair|
|keyPrefix|VARCHAR(30)|Préfixe visible — pk\_live\_shopify\_a3f8b2\_... (pour identification dans les logs)|
|platform|ENUM('shopify','woocommerce')|Plateforme de la boutique|
|environment|ENUM('live','dev')|Environnement de la clé|
|isActive|BOOLEAN|Clé active — false si révoquée ou remplacée|
|lastUsedAt|TIMESTAMP|Dernière connexion WebSocket utilisant cette clé|
|usageCount|BIGINT|Nombre total de connexions WebSocket effectuées avec cette clé|
|revokedAt|TIMESTAMP (nullable)|Date de révocation|
|revokedReason|VARCHAR(255) (nullable)|Raison de révocation|
|createdAt|TIMESTAMP|Date de génération|


# <a name="_toc225000939"></a>**4. Mécanismes de sécurité**
## <a name="_toc225000940"></a>**4.1 Protection CSRF — State parameter**
Chaque flux OAuth (Shopify) et wc-auth (WooCommerce) utilise un paramètre state UUID v4 pour prévenir les attaques CSRF. Le state est généré côté serveur DomOS, stocké en Redis avec un TTL de 10 minutes, et vérifié à la réception du callback :

|**Étape**|**Mécanisme**|**Protection contre**|
| :- | :- | :- |
|Génération state|UUID v4 cryptographiquement aléatoire — crypto.randomUUID()|Prédiction de state par un attaquant|
|Stockage Redis|SET csrf:state:{state} {userId} EX 600 — TTL 10 min|Réutilisation de state expiré|
|Transmission|Paramètre state dans l'URL de redirection OAuth/wc-auth|Interception et modification|
|Vérification callback|Lecture Redis + comparaison stricte + suppression immédiate après usage|Replay attack, CSRF|
|Échec vérification|HTTP 400 + log sécurité + alerte monitoring|Tentatives d'exploitation silencieuses|

## <a name="_toc225000941"></a>**4.2 Vérification des webhooks Shopify (HMAC)**
Les webhooks Shopify (notamment app/uninstalled) sont signés par Shopify avec HMAC-SHA256. DomOS vérifie cette signature avant tout traitement :

// Vérification HMAC webhook Shopify

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string): boolean {

`  `const computed = crypto

.createHmac('sha256', process.env.SHOPIFY\_CLIENT\_SECRET)

.update(rawBody)

.digest('base64');

`  `// Comparaison constant-time pour éviter timing attacks

`  `return crypto.timingSafeEqual(

`    `Buffer.from(computed),

`    `Buffer.from(hmacHeader)

`  `);

}

*⚠️  Le rawBody du webhook Shopify doit être conservé intact (non parsé) pour le calcul HMAC. NestJS RawBodyMiddleware est activé exclusivement sur les routes webhook Shopify.*
## <a name="_toc225000942"></a>**4.3 Chiffrement des credentials — AES-256-GCM**
Tous les credentials platform (access\_token Shopify, consumer\_key/secret WooCommerce) sont chiffrés avec AES-256-GCM avant stockage en PostgreSQL. Ce mode de chiffrement authentifié garantit à la fois la confidentialité et l'intégrité des données :

|**Aspect**|**Détail**|
| :- | :- |
|Algorithme|AES-256-GCM — chiffrement authentifié (confidentialité + intégrité)|
|Clé maître|256 bits stockée dans les secrets d'infrastructure (Vault/Docker Secrets) — jamais en base de données|
|IV (vecteur init.)|96 bits aléatoires générés par connexion — unique par entrée — stocké en base|
|Auth Tag|128 bits — garantit que les données n'ont pas été altérées — stocké en base|
|Versioning clés|Chaque credential stocke la version de la clé maître utilisée — permet la rotation des clés maîtres|
|Déchiffrement|Uniquement au moment de l'appel API plateforme — jamais exposé dans les réponses API DomOS|
|Rotation credentials|À chaque rotation, les nouveaux credentials chiffrés remplacent les anciens — audit log créé|

## <a name="_toc225000943"></a>**4.4 Validation de la clé API DomOS côté serveur WebSocket**
Quand un widget @domos/shopify ou @domos/woocommerce se connecte au serveur DomOS via WebSocket, la validation de la clé API est renforcée par une double vérification :

1. La clé API DomOS est hashée (SHA-256) et comparée aux hashes en base de données.
1. L'identifiant de la boutique (shop\_domain ou site\_url) est extrait du CONTEXT\_UPDATE initial envoyé par le SDK.
1. Le serveur DomOS vérifie que la clé API correspond bien à la boutique identifiée — une clé d'une boutique A ne peut pas être utilisée pour une boutique B.
1. Le storeId est injecté dans la session WebSocket — toutes les métriques sont automatiquement attribuées à la bonne boutique.

*✅  Cette validation double garantit qu'un attaquant ayant récupéré la clé API d'une boutique ne peut pas l'utiliser pour se connecter en tant qu'une autre boutique.*
## <a name="_toc225000944"></a>**4.5 Rate limiting spécifique aux flux d'autorisation**

|**Endpoint**|**Limite**|**Fenêtre**|**Raison**|
| :- | :- | :- | :- |
|POST /store-connect/shopify/init|5 req/IP|15 minutes|Prévenir l'abus de génération de redirections OAuth|
|GET /store-connect/shopify/callback|10 req/IP|15 minutes|Prévenir le brute force des codes OAuth|
|POST /store-connect/woocommerce/callback|10 req/IP|15 minutes|Prévenir la soumission de faux credentials wc-auth|
|POST /store-connect/\*/manual|3 req/compte|15 minutes|Prévenir les tentatives de connexion avec credentials volés|
|POST /store-connect/stores/:id/keys/rotate|2 req/boutique|1 heure|Prévenir la rotation abusive de clés|
|DELETE /store-connect/stores/:id|1 req/boutique|1 heure|Prévenir la révocation accidentelle répétée|

## <a name="_toc225000945"></a>**4.6 Audit trail — Log de sécurité**
Toutes les actions sensibles de Store Connect génèrent un audit log immuable en PostgreSQL :

|**Événement audité**|**Données loggées**|
| :- | :- |
|Connexion OAuth Shopify réussie|storeId, shop\_domain, userId, IP, timestamp, scopes accordés|
|Connexion wc-auth WooCommerce réussie|storeId, site\_url, userId, IP, timestamp, permissions accordées|
|Connexion manuelle|storeId, platform, userId, IP, timestamp, mode: manual|
|Échec vérification CSRF|state\_reçu, IP, userId\_tenté, timestamp — ALERTE SÉCURITÉ|
|Échec validation credentials|platform, identifiant\_boutique, IP, timestamp, raison\_échec|
|Rotation clé API DomOS|storeId, ancienne\_key\_prefix, nouvelle\_key\_prefix, userId, timestamp|
|Révocation boutique (dashboard)|storeId, shop\_identifier, userId, IP, timestamp|
|Révocation boutique (webhook)|storeId, shop\_identifier, webhook\_topic, timestamp|
|Tentative connexion avec clé révoquée|key\_prefix, IP, timestamp — ALERTE SÉCURITÉ|
|Accès depuis identifiant boutique non correspondant|key\_prefix, expected\_store, received\_store, IP — ALERTE SÉCURITÉ|


# <a name="_toc225000946"></a>**5. Cas d'erreur et comportements attendus**
## <a name="_toc225000947"></a>**5.1 Erreurs de connexion OAuth Shopify**

|**Code**|**Scénario**|**Comportement attendu**|**Action utilisateur**|
| :- | :- | :- | :- |
|ERR-SC01|shop\_domain invalide ou inexistant (boutique fermée, typo)|HTTP 400 — message : 'Domaine Shopify introuvable. Vérifiez l'URL (ex: ma-boutique.myshopify.com)'|Corriger le domaine et réessayer|
|ERR-SC02|Marchand refuse les scopes sur l'écran de consentement Shopify|Redirection vers le dashboard avec message : 'Installation annulée. Vous pouvez réessayer quand vous le souhaitez.'|Relancer le flux et approuver les scopes|
|ERR-SC03|State CSRF invalide ou expiré au callback|HTTP 400 — log sécurité créé — message : 'Session expirée ou lien invalide. Veuillez relancer l'installation.'|Relancer le flux depuis le début|
|ERR-SC04|Échange du code OAuth échoue (code expiré)|HTTP 400 — message : 'Le code d'autorisation a expiré. Veuillez relancer l'installation.'|Relancer le flux — les codes OAuth Shopify expirent en 60s|
|ERR-SC05|Boutique Shopify déjà connectée à un autre compte DomOS|HTTP 409 — message : 'Cette boutique est déjà connectée à un autre compte DomOS. Contactez le support si vous en êtes le propriétaire.'|Contacter le support ou révoquer depuis l'autre compte|

## <a name="_toc225000948"></a>**5.2 Erreurs de connexion wc-auth WooCommerce**

|**Code**|**Scénario**|**Comportement attendu**|**Action utilisateur**|
| :- | :- | :- | :- |
|ERR-SC06|URL WordPress inaccessible (site hors ligne, SSL invalide)|HTTP 400 — message : 'Impossible d'accéder à votre site WordPress. Vérifiez que le site est en ligne et que le SSL est valide.'|Vérifier l'accessibilité du site|
|ERR-SC07|WooCommerce non installé ou désactivé sur le site WordPress|HTTP 400 — message : 'WooCommerce n'est pas détecté sur ce site. Installez et activez WooCommerce.'|Installer WooCommerce et réessayer|
|ERR-SC08|Marchand refuse l'approbation wc-auth|Redirection vers le dashboard — message : 'Connexion annulée depuis votre admin WordPress.'|Relancer le flux depuis le dashboard DomOS|
|ERR-SC09|consumer\_key/secret reçus mais vérification système échoue (permissions insuffisantes)|HTTP 403 — message : 'Les clés API WooCommerce reçues n'ont pas les permissions suffisantes (read\_write requis).'|Régénérer les clés avec les bonnes permissions|
|ERR-SC10|URL WordPress valide mais wc-auth endpoint absent (version WooCommerce trop ancienne)|HTTP 400 — message : 'Votre version de WooCommerce n'est pas compatible. Version minimum requise : 3.5.'|Mettre à jour WooCommerce|
|ERR-SC11|callback\_url DomOS bloquée par un pare-feu WordPress (WP hardening)|Timeout callback — message : 'DomOS n'a pas reçu de réponse de votre boutique. Vérifiez que l'URL callback n'est pas bloquée.'|Whitelist l'IP DomOS ou utiliser le mode manuel|

## <a name="_toc225000949"></a>**5.3 Erreurs de validation des clés API DomOS**

|**Code**|**Scénario**|**Comportement attendu**|**Impact sur le widget**|
| :- | :- | :- | :- |
|ERR-SC12|Clé API DomOS invalide (format incorrect ou inconnue)|WebSocket rejeté — SYSTEM\_EVENT kind: error, code: INVALID\_API\_KEY|Widget affiche l'état error — aucun agent disponible|
|ERR-SC13|Clé API DomOS révoquée|WebSocket rejeté — SYSTEM\_EVENT kind: error, code: REVOKED\_API\_KEY — audit log créé|Widget affiche état error — marchand notifié par email|
|ERR-SC14|Clé API DomOS valide mais identifiant boutique ne correspond pas (clé d'une autre boutique)|WebSocket rejeté — SYSTEM\_EVENT kind: error, code: STORE\_MISMATCH — ALERTE sécurité créée|Widget erreur — incident de sécurité loggé|
|ERR-SC15|Clé API DomOS valide mais boutique déconnectée (status: disconnected)|WebSocket rejeté — SYSTEM\_EVENT kind: error, code: STORE\_DISCONNECTED|Widget erreur — marchand invité à reconnecter sa boutique|
|ERR-SC16|Quota de connexions simultanées de la boutique atteint|WebSocket rejeté — SYSTEM\_EVENT kind: error, code: QUOTA\_EXCEEDED|Widget erreur — indicateur quota dans le dashboard|

## <a name="_toc225000950"></a>**5.4 Erreurs de révocation et de déconnexion**

|**Code**|**Scénario**|**Comportement attendu**|
| :- | :- | :- |
|ERR-SC17|Webhook Shopify app/uninstalled reçu avec signature HMAC invalide|HTTP 401 — webhook ignoré — alerte sécurité créée — aucune révocation déclenchée|
|ERR-SC18|Révocation demandée pour une boutique déjà déconnectée|HTTP 409 — message : 'Cette boutique est déjà déconnectée.' — aucune action effectuée|
|ERR-SC19|Appel à l'API Shopify pour révoquer le token échoue (token déjà révoqué côté Shopify)|Révocation locale DomOS effectuée quand même — log note que la révocation Shopify a échoué (déjà révoqué)|
|ERR-SC20|Credentials expirés ou invalides détectés lors d'une vérification périodique|Statut boutique passé à suspended — marchand notifié par email — invitation à reconnecter|


# <a name="_toc225000951"></a>**6. Gestion des boutiques — Interface Dashboard**
## <a name="_toc225000952"></a>**6.1 Page 'Store Connect' dans le dashboard DomOS Cloud Pro**
La page Store Connect est accessible depuis le dashboard DomOS Cloud Pro. Elle permet au marchand de gérer toutes ses boutiques connectées depuis une interface centralisée :
### <a name="_toc225000953"></a>**6.1.1 Vue liste des boutiques**
- Tableau des boutiques connectées : nom, plateforme (icône Shopify/WooCommerce), statut (active, disconnected, suspended), date de connexion, dernière activité.
- Indicateur de santé par boutique : vert (active et credentials valides), orange (credentials à renouveler), rouge (disconnected ou suspended).
- Métriques rapides par boutique : sessions actives en ce moment, messages du mois, coût LLM estimé du mois.
- Bouton 'Connecter une boutique' — lance le wizard de connexion.
### <a name="_toc225000954"></a>**6.1.2 Wizard de connexion**
- Étape 1 — Sélection plateforme : Shopify ou WooCommerce, avec icônes et descriptions.
- Étape 2 — Choix du mode : Automatique (recommandé) ou Manuel (avancé).
- Étape 3a (Auto) — Saisie de l'identifiant boutique + redirection OAuth/wc-auth.
- Étape 3b (Manuel) — Formulaire de saisie des credentials avec documentation inline.
- Étape 4 — Vérification en cours (spinner) + résultat (succès ou erreur avec guide).
- Étape 5 — Succès : affichage de la clé API DomOS générée + snippet d'intégration + guide d'installation.
### <a name="_toc225000955"></a>**6.1.3 Page détail d'une boutique**
- Informations de la boutique : nom, URL/domaine, pays, devise, date de connexion, mode de connexion.
- Statut de connexion avec date de dernière vérification et badge de santé.
- Section 'Clé API DomOS' : préfixe visible (pk\_live\_shopify\_a3f8b2...), date de génération, bouton 'Voir le snippet d'intégration', bouton 'Rotation de clé'.
- Snippet d'intégration : code complet pour @domos/shopify ou @domos/woocommerce avec la clé API pré-remplie.
- Section 'Métriques' : sessions, messages, tokens, coût du mois en cours.
- Section 'Audit trail' : 10 dernières actions de sécurité liées à cette boutique.
- Bouton 'Déconnecter cette boutique' (HITL critical).
## <a name="_toc225000956"></a>**6.2 Snippet d'intégration généré**
Après connexion, le dashboard génère automatiquement le snippet d'intégration adapté à la plateforme. Ce snippet est prêt à copier-coller par le marchand ou son développeur :

### <a name="_toc225000957"></a>**Snippet Shopify (theme.liquid)**
{%- comment -%} Copier dans theme.liquid avant </body> {%- endcomment -%}

<script src="https://cdn.domos.dev/browser@1.0.0/domos.min.js"></script>

<script src="https://cdn.domos.dev/shopify@1.0.0/domos-shopify.min.js"></script>

<script>

`  `DomOSShopify.init({

`    `apiKey: 'pk\_live\_shopify\_a3f8b2\_x9kL4mN7pQ2',

`    `endpoint: 'wss://cloud.domos.dev/domos',

`    `widget: {

`      `agentName: 'Alex',

`      `agentTitle: 'Assistant boutique',

`      `mode: 'text'

`    `}

`  `});

</script>

### <a name="_toc225000958"></a>**Snippet WooCommerce (functions.php ou plugin auto-configuré)**
// Via le plugin WordPress DomOS — configuration automatique

// OU manuellement dans functions.php :

function domos\_enqueue() {

`  `wp\_enqueue\_script('domos-browser',

`    `'https://cdn.domos.dev/browser@1.0.0/domos.min.js', [], '1.0.0', true);

`  `wp\_enqueue\_script('domos-woo',

`    `'https://cdn.domos.dev/woocommerce@1.0.0/domos-woo.min.js',

`    `['domos-browser'], '1.0.0', true);

`  `wp\_add\_inline\_script('domos-woo', '

`    `DomOSWoo.init({

`      `apiKey: "pk\_live\_woo\_c7d1e9\_mK5nP8rT3vW",

`      `endpoint: "wss://cloud.domos.dev/domos"

`    `});

`  `');

}

add\_action('wp\_enqueue\_scripts', 'domos\_enqueue');

## <a name="_toc225000959"></a>**6.3 Rotation des clés API DomOS**
La rotation de clé API est le mécanisme permettant de régénérer une nouvelle clé API DomOS pour une boutique, par exemple en cas de suspicion de compromission ou de changement d'équipe :

1. Le marchand clique 'Rotation de clé' sur la page détail de sa boutique.
1. Un modal HITL high s'affiche : 'La rotation de clé invalidera l'ancienne clé. Toutes les connexions actives seront fermées. Continuer ?'
1. Le marchand confirme. Une nouvelle clé API DomOS est générée instantanément.
1. L'ancienne clé est marquée is\_active: false en base de données.
1. Toutes les sessions WebSocket utilisant l'ancienne clé reçoivent un SYSTEM\_EVENT kind: disconnect avec message: 'Clé API invalidée — reconnexion requise'.
1. Le nouveau snippet d'intégration est affiché — le marchand doit le déployer sur sa boutique.
1. Une période de grâce configurable (défaut: 24h) permet à l'ancienne clé de fonctionner en read-only pendant la transition.

*⚠️  La rotation de clé nécessite un déploiement du nouveau snippet sur la boutique. Sans ce déploiement, le widget de la boutique sera hors service après la période de grâce.*


# <a name="_toc225000960"></a>**7. Vérification périodique des credentials**
## <a name="_toc225000961"></a>**7.1 Tâche de vérification planifiée**
Le StoreConnectModule inclut une tâche planifiée (@nestjs/schedule) qui vérifie périodiquement la validité des credentials de chaque boutique connectée. Cette vérification est essentielle car les tokens peuvent être révoqués de l'extérieur (marchand révoque depuis son admin Shopify, changement de mot de passe WooCommerce, etc.) :

|**Vérification**|**Fréquence**|**Action si échec**|
| :- | :- | :- |
|Toutes les boutiques actives — appel API léger (Shopify /shop.json, WooCommerce /system-status)|Toutes les 6 heures|Statut → suspended, email au marchand, alerte dashboard|
|Boutiques suspendues — retry de vérification|Toutes les 24 heures (3 tentatives max)|Après 3 échecs → statut disconnected, email de notification finale|
|Vérification au premier appel WebSocket d'une boutique non vérifiée depuis > 24h|À la demande (lazy verification)|Déconnexion WebSocket si credentials invalides — statut mis à jour|

## <a name="_toc225000962"></a>**7.2 Notifications marchands**
Le StoreConnectModule envoie des emails automatiques aux marchands selon les événements de leur connexion boutique :

|**Événement**|**Email envoyé**|**Urgence**|
| :- | :- | :- |
|Connexion réussie (OAuth/wc-auth/manuel)|Confirmation avec résumé : boutique connectée, clé API DomOS, guide démarrage rapide|Informatif|
|Vérification credentials échouée (première fois)|Alerte : 'Problème de connexion détecté sur votre boutique {nom}. Cliquez pour reconnecter.'|Attention|
|Boutique suspendue (3 échecs de vérification)|Alerte urgente : 'Votre boutique {nom} est suspendue. Le widget DomOS ne fonctionne plus. Action requise.'|Urgent|
|Déconnexion via webhook Shopify (désinstallation)|Information : 'DomOS a été désinstallé de votre boutique Shopify. Vos données restent disponibles 30 jours.'|Informatif|
|Rotation de clé API DomOS|Confirmation avec nouveau snippet et rappel de déploiement dans les 24h|Important|
|Clé API utilisée depuis une IP suspecte|Alerte sécurité : 'Activité suspecte détectée sur la clé API de votre boutique. Vérifiez et effectuez une rotation si nécessaire.'|Sécurité|


# <a name="_toc225000963"></a>**8. Scopes et permissions demandés**
## <a name="_toc225000964"></a>**8.1 Scopes Shopify demandés**
DomOS demande uniquement les scopes Shopify strictement nécessaires au fonctionnement des features déclarées. Le principe de moindre privilège est appliqué :

|**Scope Shopify**|**Justification**|**Features utilisant ce scope**|
| :- | :- | :- |
|read\_products|Recherche et affichage des produits, variantes, stocks|woo\_search\_products, get\_product, productRecommendations|
|write\_checkouts|Création et mise à jour des checkouts pour In-Chat Payments|initiate\_checkout, update\_shipping\_address, apply\_discount|
|read\_orders|Consultation du statut des commandes pour le suivi in-chat|get\_order\_status|
|read\_customers|Accès aux données du client connecté pour personnalisation DomosAgent|Contexte client auto-injecté, recommandations personnalisées|
|read\_script\_tags (optionnel)|Injection automatique du script via l'API Shopify (alternative à l'App Embed Block)|Mode d'injection script automatique|

*ℹ️  Les scopes write\_products, write\_customers, delete\_orders et tout scope d'administration ne sont jamais demandés par DomOS. DomOS est une plateforme de lecture et d'interaction — pas de modification de catalogue.*
## <a name="_toc225000965"></a>**8.2 Permissions WooCommerce demandées**
DomOS demande des permissions read\_write sur l'API WooCommerce via wc-auth. Le scope read\_write est nécessaire car les opérations de panier (ajout, modification) et de checkout requièrent des opérations d'écriture :

|**Permission WooCommerce**|**Opérations couvertes**|**Justification**|
| :- | :- | :- |
|Products — read|Recherche, détail produit, variations, stocks|Affichage et recommandations produits|
|Orders — read|Statut commandes, historique client|Suivi de commande in-chat|
|Customers — read|Données client connecté, adresses sauvegardées|Personnalisation DomosAgent, pré-remplissage adresses|
|Cart — read/write|Ajout, modification, suppression articles, application coupons|Tools cart — add\_to\_cart, update\_cart\_item, apply\_coupon|
|Checkout — read/write|Création et finalisation de commande|In-Chat Payments — woo\_initiate\_checkout|


# <a name="_toc225000966"></a>**9. Préparation v3 — Stores Registry**
## <a name="_toc225000967"></a>**9.1 Pourquoi le Stores Registry est stratégique**
La v3 de DomOS introduira l'exposition des tools DomOS via le protocole MCP (Model Context Protocol), permettant à des LLMs externes (Claude, GPT-4o) d'appeler directement les tools d'une boutique DomOS. Pour que cette feature fonctionne, chaque boutique doit avoir un identifiant stable et unique dans DomOS — c'est exactement ce que le Store Connect construit dès la v1.

La table stores en PostgreSQL avec les champs shopIdentifier, platform et v3Ready est conçue dès maintenant pour servir de registre de base aux endpoints MCP v3. Aucune migration cassante ne sera nécessaire quand la v3 sera implémentée.
## <a name="_toc225000968"></a>**9.2 Architecture cible v3 (aperçu)**

|**Composant v3**|**Base v1 déjà en place**|**Ce qui s'ajoutera en v3**|
| :- | :- | :- |
|Endpoint MCP par boutique|storeId + shopIdentifier dans la table stores|Route /mcp/store/{storeId} exposée par le StoreConnectModule|
|Authentification MCP|Clé API DomOS par boutique (StoreApiKey)|MCP Bearer Token dérivé de la clé API DomOS existante|
|Tools disponibles via MCP|Tool registry ADTP par session (SessionManager)|Agrégation des tools actifs de toutes les sessions de la boutique|
|Contexte boutique via MCP|shopIdentifier + metadata dans la table stores|Resource MCP 'store\_context' exposant le catalogue et les données boutique|
|Sécurité MCP|Validation double apiKey + shopIdentifier (section 4.4)|Extension de la validation pour les appels MCP cross-session|

*ℹ️  Le champ v3Ready dans la table stores est positionné à true par défaut pour toutes les boutiques connectées via Store Connect. Cela signifie que chaque boutique connectée aujourd'hui sera automatiquement éligible aux features v3 sans aucune action de la part du marchand.*


# <a name="_toc225000969"></a>**10. Exigences**
## <a name="_toc225000970"></a>**10.1 Exigences fonctionnelles**

|**ID**|**Exigence**|**Priorité**|
| :- | :- | :- |
|EF-SC01|Les deux modes de connexion (automatique et manuel) doivent être disponibles pour Shopify et WooCommerce.|Critique|
|EF-SC02|Chaque boutique connectée doit recevoir une clé API DomOS unique au format pk\_{env}\_{platform}\_{store\_hash}\_{random}.|Critique|
|EF-SC03|La validation combinée (clé API DomOS + identifiant boutique) doit être effectuée à chaque connexion WebSocket.|Critique|
|EF-SC04|Les credentials (access\_token Shopify, consumer\_key/secret WooCommerce) doivent être chiffrés AES-256-GCM avant stockage.|Critique|
|EF-SC05|Le flux OAuth Shopify et le flux wc-auth WooCommerce doivent implémenter la protection CSRF via state parameter.|Critique|
|EF-SC06|Les webhooks Shopify (app/uninstalled) doivent être vérifiés par signature HMAC avant tout traitement.|Critique|
|EF-SC07|La révocation d'une boutique doit fermer toutes les sessions WebSocket actives dans les 5 secondes.|Critique|
|EF-SC08|Un audit trail immuable doit logger toutes les actions sensibles (connexion, rotation, révocation, tentatives échouées).|Critique|
|EF-SC09|Le dashboard doit générer automatiquement le snippet d'intégration complet et prêt à déployer après connexion.|Haute|
|EF-SC10|Une vérification périodique (toutes les 6h) doit détecter les credentials expirés ou révoqués externalement.|Haute|
|EF-SC11|La table stores doit inclure les champs shopIdentifier, platform et v3Ready pour préparer l'intégration MCP v3.|Haute|
|EF-SC12|La rotation de clé API DomOS doit inclure une période de grâce configurable (défaut 24h).|Moyenne|

## <a name="_toc225000971"></a>**10.2 Exigences de sécurité**

|**ID**|**Exigence**|**Priorité**|
| :- | :- | :- |
|ES-SC01|Les credentials platform ne doivent jamais apparaître en clair dans les logs, les réponses API ou les emails.|Critique|
|ES-SC02|La clé API DomOS ne doit être affichée en clair qu'une seule fois — au moment de sa génération.|Critique|
|ES-SC03|Le rate limiting spécifique aux endpoints d'autorisation doit être activé (voir section 4.5).|Critique|
|ES-SC04|Toute tentative d'utilisation d'une clé API avec un identifiant boutique non correspondant doit générer une alerte sécurité.|Critique|
|ES-SC05|Les scopes demandés aux plateformes doivent respecter le principe de moindre privilège (voir section 8).|Haute|
|ES-SC06|Toutes les communications entre DomOS et les APIs Shopify/WooCommerce doivent être en HTTPS.|Critique|


# <a name="_toc225000972"></a>**11. Annexes**
## <a name="_toc225000973"></a>**11.1 Comparaison des mécanismes d'autorisation**

|**Critère**|**OAuth Shopify**|**wc-auth WooCommerce**|**Manuel (les deux)**|
| :- | :- | :- | :- |
|Standard|OAuth 2.0 Authorization Code|wc-auth v1 (standard WooCommerce)|Saisie directe credentials|
|Expérience marchand|Très simple — clic + approbation Shopify|Simple — redirection WP Admin|Technique — copier-coller credentials|
|Audience|Tous marchands Shopify|Tous marchands WooCommerce|Développeurs et intégrateurs|
|Sécurité|Élevée — PKCE + HMAC webhook|Moyenne — state CSRF + HMAC callback WooCommerce|Dépend du soin du développeur|
|Identifiant boutique|shop\_domain (immuable Shopify)|site\_url (stable, changeable si migration)|Fourni par le développeur|
|Révocation externe|Webhook app/uninstalled automatique|Pas de webhook natif — vérification périodique|Vérification périodique uniquement|
|Temps d'intégration|< 2 min|< 5 min|5-15 min selon expérience|

## <a name="_toc225000974"></a>**11.2 Références**
- CdC @domos/shopify & @domos/woocommerce (Doc 9) — Packages e-commerce utilisant Store Connect
- CdC Technique Backend NestJS (Doc 5) — Architecture du backend DomOS Cloud Pro
- Shopify OAuth documentation — https://shopify.dev/docs/apps/auth/oauth
- Shopify Webhooks HMAC — https://shopify.dev/docs/apps/build/webhooks/secure/validate-webhooks
- WooCommerce REST API Authentication — https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication
- WooCommerce wc-auth — https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication-over-https
- OAuth 2.0 RFC 6749 — https://www.rfc-editor.org/rfc/rfc6749
- AES-GCM Specification — NIST SP 800-38D


*Document confidentiel — Futur4Tech © 2026 — DomOS Store Connect*
Page 1
