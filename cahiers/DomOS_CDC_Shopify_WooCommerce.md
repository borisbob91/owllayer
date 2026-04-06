DomOS — @domos/shopify & @domos/woocommerce — Futur4Tech





**DomOS**

*DOM Operating System*



**CAHIER DES CHARGES**

**@domos/shopify**  &  **@domos/woocommerce**

Packages E-Commerce Propriétaires

*Basés sur @domos/browser (core OSS)*

Version 1.0  —  Mars 2026


|**Projet**|DomOS E-Commerce Packages|
| :- | :- |
|**Packages couverts**|@domos/shopify + @domos/woocommerce|
|**Type de document**|Cahier des charges fonctionnel + technique|
|**Base commune**|@domos/browser (core OSS — MIT)|
|**Organisation**|Futur4Tech|
|**Responsable**|Kouakou Boris (CEO)|
|**Date**|Mars 2026|
|**Licence packages**|Propriétaire — DomOS Cloud Pro|
|**Statut**|@domos/browser implémenté — packages e-commerce en conception|


# <a name="_toc225003275"></a>**Table des matières**
[Table des matières	1](#_toc225003275)

[1. Contexte et architecture globale	1](#_toc225003276)

[1.1 Rappel — @domos/browser comme fondation	1](#_toc225003277)

[1.2 Architecture de dépendances	1](#_toc225003278)

[1.3 Principe d'extension de @domos/browser	1](#_toc225003279)

[2. @domos/shopify — Vue d'ensemble	1](#_toc225003280)

[2.1 Positionnement	1](#_toc225003281)

[2.2 Ce que @domos/shopify apporte en plus de @domos/browser	1](#_toc225003282)

[2.3 Modes de distribution	1](#_toc225003283)

[3. Fonctionnalités @domos/shopify	1](#_toc225003284)

[3.1 Initialisation automatique	1](#_toc225003285)

[3.2 Auto-injection du contexte Shopify	1](#_toc225003286)

[3.3 Tools Shopify natifs	1](#_toc225003287)

[3.4 In-Chat Payments Shopify	1](#_toc225003288)

[3.4.1 Flux de paiement in-chat	1](#_toc225003289)

[3.4.2 Composants du PaymentWidget Shopify	1](#_toc225003290)

[3.5 Suivi de commande in-chat	1](#_toc225003291)

[3.6 Recommandations personnalisées	1](#_toc225003292)

[4. Architecture technique @domos/shopify	1](#_toc225003293)

[4.1 Structure du package	1](#_toc225003294)

[4.2 StorefrontClient — Queries GraphQL principales	1](#_toc225003295)

[4.3 Synchronisation temps réel du panier	1](#_toc225003296)

[4.4 Sécurité	1](#_toc225003297)

[4.5 App Embed Block — Distribution officielle Shopify	1](#_toc225003298)

[5. Scénarios d'utilisation @domos/shopify	1](#_toc225003299)

[5.1 CU-S01 — Achat guidé par l'agent	1](#_toc225003300)

[Flux principal	1](#_toc225003301)

[5.2 CU-S02 — Suivi de commande in-chat	1](#_toc225003302)

[Flux principal	1](#_toc225003303)

[5.3 CU-S03 — Recommandations post-achat	1](#_toc225003304)

[Flux principal	1](#_toc225003305)

[6. @domos/woocommerce — Vue d'ensemble	1](#_toc225003306)

[6.1 Positionnement	1](#_toc225003307)

[6.2 Ce que @domos/woocommerce apporte en plus de @domos/browser	1](#_toc225003308)

[6.3 Architecture du plugin WordPress	1](#_toc225003309)

[7. Fonctionnalités @domos/woocommerce	1](#_toc225003310)

[7.1 Initialisation via plugin WordPress	1](#_toc225003311)

[7.2 Auto-injection du contexte WooCommerce	1](#_toc225003312)

[7.3 Tools WooCommerce natifs	1](#_toc225003313)

[7.4 In-Chat Payments WooCommerce	1](#_toc225003314)

[7.4.1 Gateway Stripe in-chat	1](#_toc225003315)

[7.4.2 Gateway PayPal in-chat	1](#_toc225003316)

[7.4.3 Composants du WooPaymentWidget	1](#_toc225003317)

[7.5 Flux de paiement WooCommerce in-chat	1](#_toc225003318)

[8. Architecture technique @domos/woocommerce	1](#_toc225003319)

[8.1 Structure du package JS	1](#_toc225003320)

[8.2 Structure du plugin WordPress PHP	1](#_toc225003321)

[8.3 WooCommerce Store API — Endpoints utilisés	1](#_toc225003322)

[8.4 Sécurité @domos/woocommerce	1](#_toc225003323)

[9. Scénarios d'utilisation @domos/woocommerce	1](#_toc225003324)

[9.1 CU-W01 — Achat guidé WooCommerce avec paiement Stripe	1](#_toc225003325)

[Flux principal	1](#_toc225003326)

[9.2 CU-W02 — Assistance retour produit	1](#_toc225003327)

[Flux principal	1](#_toc225003328)

[10. Points communs — Exigences et Roadmap	1](#_toc225003329)

[10.1 Exigences fonctionnelles communes	1](#_toc225003330)

[10.2 Roadmap commune	1](#_toc225003331)

[11. Annexes	1](#_toc225003332)

[11.1 Comparaison des trois packages e-commerce	1](#_toc225003333)

[11.2 Références	1](#_toc225003334)




# <a name="_toc225003276"></a>**1. Contexte et architecture globale**
## <a name="_toc225003277"></a>**1.1 Rappel — @domos/browser comme fondation**
@domos/browser est le SDK DomOS universel open source (MIT) pour tous les sites sans framework frontend. Il fournit le protocole ADTP, le tool registry impératif, l'auto-discovery via attributs HTML, la session persistence, le Widget DomOS et le système HITL. Ce package est déjà implémenté et constitue la fondation technique sur laquelle reposent @domos/shopify et @domos/woocommerce.

Les packages e-commerce sont propriétaires car ils requièrent un investissement spécifique à chaque plateforme (APIs privées, App Store, certification, maintenance des intégrations) et constituent un avantage compétitif direct de Futur4Tech sur le marché e-commerce conversationnel.
## <a name="_toc225003278"></a>**1.2 Architecture de dépendances**

|**Package**|**Licence**|**Dépend de**|**Rôle**|
| :- | :- | :- | :- |
|@domos/core|MIT|—|Types ADTP, HITLPolicy, protocole — fondation partagée|
|@domos/browser|MIT|@domos/core|SDK universel OSS — core tool registry, session, Widget, HITL|
|@domos/shopify|Propriétaire|@domos/browser + @domos/core|Couche Shopify native — Storefront API, tools e-commerce, App Embed|
|@domos/woocommerce|Propriétaire|@domos/browser + @domos/core|Couche WooCommerce native — Store API, Stripe, tools WooCommerce|

*ℹ️  @domos/shopify et @domos/woocommerce n'implémentent pas le protocole ADTP ni le Widget — ils étendent @domos/browser avec des tools, des contextes et des composants spécifiques à chaque plateforme.*
## <a name="_toc225003279"></a>**1.3 Principe d'extension de @domos/browser**
Chaque package e-commerce étend @domos/browser via le pattern d'extension DomOS : ils utilisent l'API DomOS.registerTool() et DomOS.setContext() du core pour déclarer leurs tools et injecter leur contexte spécifique. Le développeur n'a qu'à appeler la fonction d'initialisation du package — tout le reste est automatique.

// @domos/shopify — ce que le développeur écrit

<script src="https://cdn.domos.dev/browser@1.0.0/domos.min.js"></script>

<script src="https://cdn.domos.dev/shopify@1.0.0/domos-shopify.min.js"></script>

<script>

`  `// Une seule ligne — tout le reste est automatique

`  `DomOSShopify.init({

`    `apiKey: 'pk\_live\_xxx',

`    `endpoint: 'wss://cloud.domos.dev/domos',

`  `});

</script>

// @domos/woocommerce — ce que le développeur écrit

// (Via le plugin WordPress — zéro code manuel requis)

// Installation depuis WordPress Admin > Extensions > Ajouter

// Configuration depuis DomOS > Réglages dans l'admin WordPress



`  `**PARTIE 1 — @domos/shopify**  


# <a name="_toc225003280"></a>**2. @domos/shopify — Vue d'ensemble**
## <a name="_toc225003281"></a>**2.1 Positionnement**
@domos/shopify est le package DomOS natif pour Shopify. Il transforme n'importe quelle boutique Shopify en une expérience e-commerce conversationnelle complète. Le package gère automatiquement le contexte Shopify (produit actuel, panier, client connecté, variantes), déclare les tools e-commerce natifs et s'intègre dans l'écosystème Shopify via les mécanismes officiels (App Embed Block, Metafields, Storefront API).
## <a name="_toc225003282"></a>**2.2 Ce que @domos/shopify apporte en plus de @domos/browser**

|**Fonctionnalité**|**@domos/browser (OSS)**|**@domos/shopify (Propriétaire)**|
| :- | :- | :- |
|Initialisation|DomOS.init() manuel avec config|DomOSShopify.init() — auto-détecte l'environnement Shopify|
|Contexte produit|Manuel via DomOS.setContext()|Auto-injecté depuis Shopify Liquid (product, variant, collection)|
|Contexte panier|Manuel|Auto-synchronisé en temps réel via Cart API AJAX|
|Contexte client|Manuel|Auto-injecté (customer.id, tags, commandes passées) si connecté|
|Tools e-commerce|À implémenter manuellement|10 tools natifs pré-configurés (add\_to\_cart, checkout, etc.)|
|Storefront API|Non incluse|Client Storefront GraphQL intégré|
|In-Chat Payments|Non inclus|Shopify Pay / Shop Pay / Apple Pay / Google Pay intégrés|
|App Embed Block|Non|Injection officielle dans tous les thèmes Shopify 2.0|
|Metafields config|Non|Configuration stockée dans les Metafields boutique|
|Webhooks Shopify|Non|Abonnement order/created, cart/updated pour sync DomosAgent|

## <a name="_toc225003283"></a>**2.3 Modes de distribution**

|**Mode**|**Fichier**|**Usage**|**Audience**|
| :- | :- | :- | :- |
|CDN Script|domos-shopify.min.js|Injection manuelle dans theme.liquid — <script src=CDN>|Développeurs de thèmes avancés|
|App Embed Block|Via Shopify App Store|Installation 1-clic — aucune modification de thème|Marchands non-techniques|
|NPM Package|@domos/shopify|Import ESM pour les thèmes avec pipeline de build (Vite)|Développeurs front-end Shopify|


# <a name="_toc225003284"></a>**3. Fonctionnalités @domos/shopify**
## <a name="_toc225003285"></a>**3.1 Initialisation automatique**
DomOSShopify.init() détecte automatiquement le contexte Shopify courant et configure DomOS en conséquence. Il appelle DomOS.init() du core en injectant le contexte Shopify, puis enregistre tous les tools natifs :

// theme.liquid — intégration complète

<script src="https://cdn.domos.dev/browser@1.0.0/domos.min.js"></script>

<script src="https://cdn.domos.dev/shopify@1.0.0/domos-shopify.min.js"></script>

<script>

`  `DomOSShopify.init({

`    `apiKey: '{{ shop.metafields.domos.api\_key | escape }}',

`    `endpoint: '{{ shop.metafields.domos.endpoint | default: "wss://cloud.domos.dev/domos" }}',

`    `// Options optionnelles

`    `widget: {

`      `agentName: '{{ shop.metafields.domos.agent\_name | default: "Alex" }}',

`      `agentTitle: 'Assistant boutique',

`      `mode: 'text'

`    `},

`    `features: {

`      `inChatPayments: true,   // Activer les paiements in-chat

`      `orderTracking: true,    // Suivi de commande dans le chat

`      `productRecommendations: true  // Recommandations personnalisées

`    `}

`  `});

</script>

## <a name="_toc225003286"></a>**3.2 Auto-injection du contexte Shopify**
@domos/shopify lit automatiquement les variables Shopify disponibles dans le DOM (injectées par Liquid en JSON) et construit le Shadow Context DomOS. Cela évite au développeur de mapper manuellement les données Shopify :

|**Page Shopify**|**Données auto-injectées dans le Shadow Context**|
| :- | :- |
|Page produit|productId, productTitle, productHandle, price, compareAtPrice, available, variants (id, title, price, available), productType, tags, vendor, images|
|Page collection|collectionId, collectionTitle, collectionHandle, productsCount, sortOrder|
|Page panier|cartToken, itemCount, totalPrice, currency, items (id, title, quantity, price, variantId)|
|Page commande|orderId, orderName, orderStatus, financialStatus, fulfillmentStatus, lineItems, totalPrice|
|Toutes les pages|shopName, shopDomain, currency, locale, customerId (si connecté), customerTags, cartItemCount|

## <a name="_toc225003287"></a>**3.3 Tools Shopify natifs**
@domos/shopify enregistre automatiquement 12 tools natifs couvrant l'ensemble du parcours e-commerce Shopify :

|**Tool**|**Risque HITL**|**Description**|**API Shopify**|
| :- | :- | :- | :- |
|search\_products|none|Rechercher des produits par texte, collection, tag, type ou fourchette de prix|Storefront API — products query|
|get\_product|none|Obtenir les détails complets d'un produit et ses variantes disponibles|Storefront API — product(handle)|
|select\_variant|none|Sélectionner une variante (taille, couleur) et mettre à jour l'UI Shopify|DOM — sélecteur variante natif Shopify|
|add\_to\_cart|low|Ajouter un produit ou une variante au panier Shopify|Cart AJAX API — /cart/add.js|
|update\_cart|low|Modifier la quantité d'un article du panier|Cart AJAX API — /cart/change.js|
|remove\_from\_cart|low|Retirer un article du panier|Cart AJAX API — /cart/change.js (qty 0)|
|get\_cart|none|Obtenir le contenu complet et détaillé du panier actuel|Cart AJAX API — /cart.js|
|apply\_discount|none|Appliquer un code promo ou de réduction au panier|Storefront API — checkoutDiscountCodeApply|
|initiate\_checkout|high|Créer un checkout Shopify et afficher le PaymentWidget in-chat|Storefront API — checkoutCreate|
|get\_order\_status|none|Consulter le statut d'une commande par numéro de commande ou email|Storefront API — customer.orders|
|navigate\_to\_product|none|Naviguer vers la page d'un produit spécifique|window.location.href|
|navigate\_to\_collection|none|Naviguer vers une page de collection|window.location.href|

## <a name="_toc225003288"></a>**3.4 In-Chat Payments Shopify**
Quand features.inChatPayments est activé, @domos/shopify rend disponible le PaymentWidget — un composant Preact rendu dans le Shadow DOM du Widget DomOS qui permet à l'utilisateur de finaliser son achat sans quitter la conversation.
### <a name="_toc225003289"></a>**3.4.1 Flux de paiement in-chat**
1. L'agent appelle initiate\_checkout , modal HITL high pour approbation.
1. Le CheckoutBuilder crée un checkout via Storefront API GraphQL.
1. Le PaymentWidget s'affiche dans le Widget : récapitulatif commande, champ adresse, options de livraison, code promo, boutons de paiement.
1. L'utilisateur remplit son adresse , les options de livraison se chargent dynamiquement.
1. L'utilisateur choisit son mode de paiement : Shop Pay (1-click), Apple Pay, Google Pay ou carte bancaire.
1. Pour Shop Pay : redirection vers le flux Shop Pay natif, retour automatique au chat après confirmation.
1. Pour Apple Pay / Google Pay : Payment Request API, paiement natif navigateur sans formulaire.
1. Pour carte : Shopify Payment Fields (iframe sécurisé Shopify , DomOS ne touche jamais les données carte).
1. Confirmation de commande affichée dans le chat avec numéro de commande et délai estimé.
### <a name="_toc225003290"></a>**3.4.2 Composants du PaymentWidget Shopify**

|**Composant Preact**|**Rôle**|
| :- | :- |
|OrderSummary|Récapitulatif produits, sous-total, frais de port, total , mis à jour en temps réel|
|ShippingAddressForm|Formulaire adresse de livraison inline — auto-complétion si client connecté|
|ShippingRateSelector|Sélection des options de livraison chargées depuis Storefront API|
|DiscountCodeInput|Champ code promo avec validation en temps réel et affichage de la remise|
|PaymentMethodSelector|Boutons Shop Pay, Apple Pay, Google Pay, carte — affichés selon disponibilité|
|ShopifyPaymentFields|Iframe Shopify pour la saisie sécurisée de carte bancaire|
|SecurityBadge|Badge « Paiement sécurisé par Shopify » pour rassurer l'acheteur|
|OrderConfirmation|Écran de confirmation post-paiement avec numéro commande et prochaines étapes|

## <a name="_toc225003291"></a>**3.5 Suivi de commande in-chat**
Le tool get\_order\_status permet à l'agent de répondre aux questions de suivi de commande directement dans le chat, sans rediriger l'utilisateur vers une page externe :

- Recherche par numéro de commande (ex: #1234) ou par email du client.
- Affichage du statut financier (payé, remboursé), du statut de fulfillment (en préparation, expédié, livré).
- Lien de suivi du transporteur directement dans la conversation si disponible.
- Estimation de livraison si fournie par le transporteur.
- Option de lancer un retour ou une réclamation directement depuis le chat (tool initiate\_return — risk: high).
## <a name="_toc225003292"></a>**3.6 Recommandations personnalisées**
Quand features.productRecommendations est activé et que DomosAgent est disponible, @domos/shopify enrichit les recommandations produits avec l'historique de navigation et d'achat de l'utilisateur :

- Recommandations basées sur les produits consultés dans la session courante.
- Recommandations basées sur l'historique d'achats mémorisé par DomosAgent (si userId disponible).
- Filtrage automatique selon les préférences mémorisées (taille habituelle, marques favorites, budget).
- Utilisation de l'API Shopify Product Recommendations pour les suggestions natives de la boutique.


# <a name="_toc225003293"></a>**4. Architecture technique @domos/shopify**
## <a name="_toc225003294"></a>**4.1 Structure du package**

packages/shopify/src/

├── index.ts                       # Export public — DomOSShopify

├── DomOSShopify.ts                # Classe principale — init(), orchestration

│

├── context/

│   ├── ShopifyContextBuilder.ts   # Lecture variables Liquid → Shadow Context DomOS

│   ├── CartContextSync.ts         # Sync temps réel panier → CONTEXT\_UPDATE

│   └── CustomerContext.ts         # Données client connecté

│

├── tools/

│   ├── ProductTools.ts            # search\_products, get\_product, select\_variant

│   ├── CartTools.ts               # add\_to\_cart, update\_cart, remove\_from\_cart, get\_cart

│   ├── CheckoutTools.ts           # initiate\_checkout, apply\_discount

│   ├── OrderTools.ts              # get\_order\_status, initiate\_return

│   └── NavigationTools.ts         # navigate\_to\_product, navigate\_to\_collection

│

├── payments/

│   ├── CheckoutBuilder.ts         # Création checkout via Storefront API GraphQL

│   ├── PaymentWidget/             # Composants Preact du widget de paiement

│   │   ├── PaymentWidget.tsx

│   │   ├── OrderSummary.tsx

│   │   ├── ShippingAddressForm.tsx

│   │   ├── ShippingRateSelector.tsx

│   │   ├── DiscountCodeInput.tsx

│   │   ├── PaymentMethodSelector.tsx

│   │   └── OrderConfirmation.tsx

│   └── PaymentRequestAdapter.ts   # Apple Pay + Google Pay via Payment Request API

│

├── storefront/

│   └── StorefrontClient.ts        # Client GraphQL Storefront API — queries + mutations

│

└── embed/

`    `└── app-embed.liquid           # App Embed Block Shopify (distribué via App Store)

## <a name="_toc225003295"></a>**4.2 StorefrontClient — Queries GraphQL principales**

|**Query / Mutation GraphQL**|**Usage dans @domos/shopify**|
| :- | :- |
|products(query, first, sortKey)|search\_products — recherche full-text avec filtres|
|product(handle)|get\_product — détails complet produit + variantes|
|productRecommendations(productId)|Recommandations natives Shopify pour un produit|
|checkoutCreate(input)|initiate\_checkout — création du checkout avec les articles du panier|
|checkoutShippingAddressUpdateV2(id, address)|Mise à jour adresse dans PaymentWidget|
|checkoutShippingLineUpdate(id, shippingRateHandle)|Sélection option de livraison|
|checkoutDiscountCodeApplyV2(id, discountCode)|Application code promo|
|checkoutCompleteWithTokenizedPaymentV3(id, payment)|Finalisation paiement par carte|
|customer(customerAccessToken)|Récupération données client connecté + historique commandes|
|node(id) — Order type|Suivi statut commande par ID|

## <a name="_toc225003296"></a>**4.3 Synchronisation temps réel du panier**
CartContextSync écoute les événements du DOM Shopify pour détecter les modifications du panier et mettre à jour le Shadow Context DomOS automatiquement. Cela garantit que l'agent DomOS connaît toujours l'état exact du panier, même quand l'utilisateur le modifie en dehors du chat :

- Écoute de l'événement cart:updated émis nativement par Shopify lors de toute modification.
- Appel automatique de /cart.js après chaque modification pour récupérer l'état frais.
- Envoi d'un CONTEXT\_UPDATE via @domos/browser avec le nouveau contenu du panier.
- L'agent DomOS est ainsi toujours synchronisé avec l'état réel du panier.
## <a name="_toc225003297"></a>**4.4 Sécurité**

|**Aspect**|**Implémentation**|
| :- | :- |
|Clé API DomOS|Stockée dans les Metafields boutique Shopify — jamais exposée en dur dans le thème|
|Storefront API token|Token public Shopify (lecture seule) — différent de l'Admin API (privée). Aucun accès admin.|
|Données carte bancaire|Jamais collectées par DomOS — traitées exclusivement par Shopify Payment Fields (iframe cross-origin Shopify)|
|Tool initiate\_checkout|Niveau de risque HITL high — modal d'approbation Shadow DOM obligatoire avant création du checkout|
|Données client|Accès uniquement si le client est connecté à son compte Shopify — customer access token Shopify requis|
|HTTPS|Toutes les communications Storefront API et DomOS Cloud Pro en HTTPS/WSS — pas de support HTTP en production|

## <a name="_toc225003298"></a>**4.5 App Embed Block — Distribution officielle Shopify**
Le mode de distribution privilégié pour les marchands non-techniques est l'App Embed Block Shopify. C'est le mécanisme officiel Shopify pour injecter des scripts dans tous les thèmes sans modification manuelle :

- Le marchand installe l'app DomOS depuis le Shopify App Store en 1 clic.
- L'App Embed Block est activé depuis l'éditeur de thème Shopify (Online Store > Thème > Personnaliser > App Embeds).
- Un panneau de configuration apparaît directement dans l'éditeur de thème — clé API, nom de l'agent, mode, thème du widget.
- Le script @domos/browser + @domos/shopify est injecté automatiquement dans toutes les pages.
- La configuration est sauvegardée dans les Metafields boutique — aucune connaissance technique requise.

*ℹ️  L'App Embed Block contourne également la restriction Service Worker de Shopify — c'est la solution officielle et recommandée pour la persistance du Widget sur toutes les pages Shopify.*


# <a name="_toc225003299"></a>**5. Scénarios d'utilisation @domos/shopify**
## <a name="_toc225003300"></a>**5.1 CU-S01 — Achat guidé par l'agent**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-S01|
|Nom|Achat guidé complet par l'agent DomOS sur Shopify|
|Acteurs|Utilisateur final, Agent DomOS, @domos/shopify, Shopify Storefront API|
|Déclencheur|L'utilisateur ouvre le Widget DomOS sur une boutique Shopify|
|Résultat attendu|L'utilisateur complète un achat entièrement dans la conversation|

### <a name="_toc225003301"></a>**Flux principal**
1. L'utilisateur : « Je cherche une veste imperméable pour la randonnée, budget 150€. »
1. L'agent appelle search\_products avec les critères — retourne 3 produits correspondants.
1. L'agent présente les options avec prix, disponibilité et lien vers la page produit.
1. L'utilisateur : « La première m'intéresse, elle est disponible en L ? »
1. L'agent appelle get\_product — vérifie la disponibilité de la variante L.
1. L'agent appelle select\_variant L — met à jour le sélecteur de taille sur la page.
1. L'utilisateur confirme. L'agent appelle add\_to\_cart (risk: low) — toast de confirmation.
1. L'utilisateur : « Je prends aussi, tu peux me faire le checkout directement ? »
1. L'agent appelle initiate\_checkout (risk: high) — modal HITL d'approbation.
1. L'utilisateur approuve. Le PaymentWidget s'affiche dans le chat.
1. L'utilisateur saisit son adresse, choisit Shop Pay et finalise le paiement.
1. L'agent : « Votre commande #4821 est confirmée ! Livraison estimée dans 3-5 jours ouvrés. »
## <a name="_toc225003302"></a>**5.2 CU-S02 — Suivi de commande in-chat**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-S02|
|Nom|Consultation du statut d'une commande directement dans le chat|
|Acteurs|Utilisateur final, Agent DomOS, Shopify Storefront API|
|Déclencheur|L'utilisateur demande le statut de sa commande|
|Résultat attendu|L'agent affiche le statut, la date d'expédition et le lien de suivi dans le chat|

### <a name="_toc225003303"></a>**Flux principal**
1. L'utilisateur : « Où en est ma commande #4821 ? »
1. L'agent appelle get\_order\_status avec le numéro de commande.
1. Storefront API retourne : statut financier (payé), fulfillment (expédié), transporteur (Colissimo), numéro de suivi.
1. L'agent : « Votre commande #4821 a été expédiée le 18/03. Numéro de suivi Colissimo : [lien]. Livraison estimée demain. »
1. L'utilisateur : « Super merci ! »
## <a name="_toc225003304"></a>**5.3 CU-S03 — Recommandations post-achat**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-S03|
|Nom|L'agent propose des produits complémentaires après un ajout au panier|
|Acteurs|Utilisateur final, Agent DomOS, DomosAgent, Shopify Storefront API|
|Déclencheur|Exécution réussie de add\_to\_cart|
|Résultat attendu|L'agent propose des produits complémentaires pertinents basés sur le produit ajouté|

### <a name="_toc225003305"></a>**Flux principal**
1. L'agent vient d'ajouter la veste imperméable au panier.
1. DomosAgent détecte que c'est un produit de randonnée — active la stratégie de cross-sell.
1. L'agent appelle productRecommendations(productId) via Storefront API.
1. L'agent : « Parfait ! Avec cette veste, nos clients prennent souvent aussi les guêtres imperméables et le sac à dos 30L — voulez-vous que je vous les montre ? »
1. L'utilisateur accepte. L'agent affiche les recommandations avec prix et disponibilité.



`  `**PARTIE 2 — @domos/woocommerce**  


# <a name="_toc225003306"></a>**6. @domos/woocommerce - Vue d'ensemble**
## <a name="_toc225003307"></a>**6.1 Positionnement**
@domos/woocommerce est le package DomOS natif pour WordPress + WooCommerce. Il s'intègre dans l'écosystème WordPress via un plugin officiel (wordpress.org) et étend @domos/browser avec les tools, le contexte et les composants de paiement spécifiques à WooCommerce. Il supporte les gateways de paiement WooCommerce les plus répandus (Stripe, PayPal) et s'intègre nativement avec WooCommerce Blocks et l'architecture REST de WooCommerce.
## <a name="_toc225003308"></a>**6.2 Ce que @domos/woocommerce apporte en plus de @domos/browser**

|**Fonctionnalité**|**@domos/browser (OSS)**|**@domos/woocommerce (Propriétaire)**|
| :- | :- | :- |
|Initialisation|Manuelle via PHP/functions.php|Plugin WordPress — zéro code, configuration via admin WP|
|Contexte produit|Manuel|Auto-injecté (WooCommerce product, price, stock, variations)|
|Contexte panier|Manuel|Auto-synchronisé via WooCommerce Store API|
|Contexte client|Manuel|Auto-injecté (customer data, commandes, adresses)|
|Tools e-commerce|À implémenter|12 tools natifs WooCommerce pré-configurés|
|WooCommerce Store API|Non|Client intégré pour cart, checkout, products|
|In-Chat Payments Stripe|Non|Stripe Elements in-chat avec 3DS2|
|In-Chat Payments PayPal|Non|PayPal Smart Buttons in-chat|
|Plugin WordPress officiel|Non|Distribué sur wordpress.org|
|Service Worker auto|Manuel|Enregistré automatiquement par le plugin|
|WooCommerce Blocks|Non|Bloc Gutenberg DomOS pour placement custom du widget|

## <a name="_toc225003309"></a>**6.3 Architecture du plugin WordPress**
@domos/woocommerce est distribué principalement comme plugin WordPress. Le plugin se charge de toute l'intégration technique, laissant le marchand configurer DomOS depuis son admin WordPress :

|**Composant plugin**|**Rôle**|
| :- | :- |
|domos-woocommerce.php|Fichier principal du plugin — hooks WordPress (wp\_enqueue\_scripts, init, woocommerce\_loaded)|
|includes/class-context-builder.php|Construction du Shadow Context depuis les variables WooCommerce PHP|
|includes/class-admin-settings.php|Page de réglages WordPress (DomOS > Réglages) — clé API, endpoint, configuration widget|
|includes/class-sw-registrar.php|Enregistrement automatique du Service Worker DomOS pour la persistance navigation|
|assets/js/domos-woocommerce.js|Bundle @domos/woocommerce compilé — chargé via wp\_enqueue\_script|
|assets/js/domos-browser.min.js|Bundle @domos/browser core — chargé en premier|
|blocks/domos-widget/|Bloc Gutenberg pour placer le widget à un endroit précis|
|templates/|Templates PHP pour l'injection du contexte JSON dans les pages WooCommerce|


# <a name="_toc225003310"></a>**7. Fonctionnalités @domos/woocommerce**
## <a name="_toc225003311"></a>**7.1 Initialisation via plugin WordPress**
Avec le plugin WordPress, zéro code n'est requis du développeur. Le plugin gère tout automatiquement via les hooks WordPress standards :

- wp\_enqueue\_scripts — chargement de @domos/browser puis @domos/woocommerce dans le bon ordre.
- wp\_footer — injection du bloc JSON de contexte WooCommerce avant </body>.
- init — enregistrement des hooks WooCommerce (cart\_updated, order\_placed, etc.).
- Service Worker — enregistrement automatique pour la persistance de navigation.

Le développeur peut néanmoins initialiser manuellement via l'API JavaScript pour des configurations avancées :

// Initialisation manuelle avancée (optionnelle)

DomOSWoo.init({

`  `apiKey: domos\_config.api\_key,  // Passé par wp\_localize\_script

`  `endpoint: domos\_config.endpoint,

`  `features: {

`    `inChatPayments: true,

`    `gateway: 'stripe',  // 'stripe' | 'paypal' | 'auto' (détection automatique)

`    `orderTracking: true,

`  `},

`  `widget: {

`    `agentName: domos\_config.agent\_name,

`    `mode: 'text'

`  `}

});

## <a name="_toc225003312"></a>**7.2 Auto-injection du contexte WooCommerce**
Le plugin PHP injecte un bloc JSON dans chaque page WooCommerce avec les données du contexte. @domos/woocommerce lit ce bloc et appelle DomOS.setContext() automatiquement :

|**Page WooCommerce**|**Données auto-injectées**|
| :- | :- |
|Page produit (single)|productId, productName, sku, price, regularPrice, salePrice, stockStatus, stockQuantity, variations (id, attributes, price, stock), categories, tags, images|
|Page boutique / archive|categoryId, categoryName, productsCount, currentPage, filters appliqués|
|Page panier|cartItems (productId, variationId, quantity, price, name), cartTotal, cartSubtotal, taxTotal, shippingTotal, appliedCoupons|
|Page checkout|cartItems, billingAddress (pré-rempli si client connecté), shippingAddress, availablePaymentMethods, shippingMethods|
|Page commande|orderId, orderStatus, orderTotal, paymentMethod, lineItems, shippingAddress, trackingNumber|
|Toutes les pages|shopName, currency, userId (si connecté), customerEmail, isLoggedIn, cartItemCount, woocommerceVersion|

## <a name="_toc225003313"></a>**7.3 Tools WooCommerce natifs**

|**Tool**|**Risque HITL**|**Description**|**API WooCommerce**|
| :- | :- | :- | :- |
|woo\_search\_products|none|Rechercher des produits WooCommerce par nom, catégorie, tag, prix, attributs|WooCommerce Store API — /wc/store/v1/products|
|woo\_get\_product|none|Obtenir le détail complet d'un produit et ses variations|WooCommerce Store API — /wc/store/v1/products/{id}|
|woo\_select\_variation|none|Sélectionner une variation produit et mettre à jour l'UI WooCommerce|DOM — variation form WooCommerce|
|woo\_add\_to\_cart|low|Ajouter un produit ou une variation au panier WooCommerce|WooCommerce Store API — /wc/store/v1/cart/add-item|
|woo\_update\_cart\_item|low|Modifier la quantité d'un article dans le panier|WooCommerce Store API — /wc/store/v1/cart/update-item|
|woo\_remove\_cart\_item|low|Retirer un article du panier|WooCommerce Store API — /wc/store/v1/cart/remove-item|
|woo\_get\_cart|none|Obtenir le contenu détaillé du panier avec totaux|WooCommerce Store API — /wc/store/v1/cart|
|woo\_apply\_coupon|none|Appliquer un coupon au panier|WooCommerce Store API — /wc/store/v1/cart/apply-coupon|
|woo\_initiate\_checkout|high|Initialiser le checkout et afficher le PaymentWidget WooCommerce|WooCommerce Store API — /wc/store/v1/checkout|
|woo\_get\_order\_status|none|Consulter le statut d'une commande|WooCommerce REST API — /wp-json/wc/v3/orders/{id}|
|woo\_get\_shipping\_methods|none|Lister les méthodes de livraison disponibles pour l'adresse donnée|WooCommerce Store API — shipping|
|woo\_initiate\_return|high|Initier une demande de retour pour une commande|WooCommerce REST API — order notes / refund request|

## <a name="_toc225003314"></a>**7.4 In-Chat Payments WooCommerce**
### <a name="_toc225003315"></a>**7.4.1 Gateway Stripe in-chat**
Stripe est le gateway de paiement principal supporté par @domos/woocommerce. Le WooPaymentWidget intègre Stripe Elements pour une saisie de carte sécurisée directement dans le Widget DomOS :

- Stripe Elements est rendu dans le Shadow DOM du Widget — iframe Stripe sécurisé, DomOS ne touche jamais les données carte.
- Support de Stripe Payment Request API — Apple Pay et Google Pay natifs si le navigateur et l'appareil le supportent.
- 3D Secure 2 géré automatiquement par Stripe — modale d'authentification intégrée si requise par la banque.
- Stripe Radar (anti-fraude) appliqué automatiquement sur chaque transaction.
- Le token de paiement Stripe est envoyé au backend WooCommerce via WooCommerce Store API — jamais en clair.
### <a name="_toc225003316"></a>**7.4.2 Gateway PayPal in-chat**
PayPal est le second gateway supporté. L'intégration utilise les PayPal Smart Buttons SDK officiels :

- Les PayPal Smart Buttons sont rendus dans le Shadow DOM du Widget via un iframe PayPal officiel.
- Support de PayPal, PayPal Credit et PayLater selon la disponibilité dans le pays du marchand.
- Flux de paiement PayPal standard — fenêtre popup PayPal pour authentification, retour automatique au chat.
- Validation de la commande WooCommerce après confirmation PayPal via webhook IPN.
### <a name="_toc225003317"></a>**7.4.3 Composants du WooPaymentWidget**

|**Composant Preact**|**Rôle**|
| :- | :- |
|WooOrderSummary|Récapitulatif articles, sous-total, TVA, frais de port, total WooCommerce|
|WooBillingForm|Formulaire facturation inline — auto-rempli si client WooCommerce connecté|
|WooShippingForm|Formulaire livraison — option « même adresse que facturation »|
|WooShippingMethodSelector|Sélection méthode de livraison (tarif plat, Colissimo, point relais, etc.)|
|WooCouponInput|Champ coupon WooCommerce avec validation temps réel et affichage remise|
|StripePaymentElement|Stripe Elements — saisie sécurisée carte + Apple Pay + Google Pay|
|PayPalButtons|PayPal Smart Buttons officiels — rendu iframe PayPal SDK|
|WooOrderConfirmation|Confirmation commande avec numéro WooCommerce et prochaines étapes|

## <a name="_toc225003318"></a>**7.5 Flux de paiement WooCommerce in-chat**
1. L'agent appelle woo\_initiate\_checkout (risk: high) — modal HITL d'approbation.
1. L'utilisateur approuve. Le WooPaymentWidget s'affiche dans le Widget DomOS.
1. Le WooCheckoutBuilder initialise un checkout via WooCommerce Store API.
1. L'utilisateur remplit les adresses de facturation et livraison.
1. Les méthodes de livraison disponibles sont chargées dynamiquement selon l'adresse.
1. L'utilisateur saisit un coupon optionnel — validation temps réel affichée.
1. L'utilisateur choisit le gateway : Stripe (carte/Apple Pay/Google Pay) ou PayPal.
1. Pour Stripe carte : Stripe Elements collecte les données — token créé et envoyé à WooCommerce.
1. Pour Apple/Google Pay : Payment Request API — paiement natif 1-tap.
1. Pour PayPal : popup PayPal s'ouvre — l'utilisateur s'authentifie et revient au chat.
1. La commande WooCommerce est créée (status: processing). Webhook Stripe/PayPal confirme le paiement.
1. L'agent affiche la confirmation avec le numéro de commande WooCommerce.


# <a name="_toc225003319"></a>**8. Architecture technique @domos/woocommerce**
## <a name="_toc225003320"></a>**8.1 Structure du package JS**

packages/woocommerce/src/

├── index.ts                          # Export public — DomOSWoo

├── DomOSWoocommerce.ts               # Classe principale — init(), orchestration

│

├── context/

│   ├── WooContextBuilder.ts          # Lecture JSON injecté par PHP → Shadow Context

│   ├── CartContextSync.ts            # Sync panier WooCommerce Store API temps réel

│   └── CustomerContext.ts            # Données client WooCommerce connecté

│

├── tools/

│   ├── ProductTools.ts               # woo\_search\_products, woo\_get\_product

│   ├── CartTools.ts                  # woo\_add\_to\_cart, woo\_update\_cart\_item, etc.

│   ├── CheckoutTools.ts              # woo\_initiate\_checkout, woo\_apply\_coupon

│   ├── OrderTools.ts                 # woo\_get\_order\_status, woo\_initiate\_return

│   └── ShippingTools.ts              # woo\_get\_shipping\_methods

│

├── payments/

│   ├── WooCheckoutBuilder.ts         # Création commande via WooCommerce Store API

│   ├── WooPaymentWidget/             # Composants Preact du widget de paiement

│   │   ├── WooPaymentWidget.tsx

│   │   ├── WooOrderSummary.tsx

│   │   ├── WooBillingForm.tsx

│   │   ├── WooShippingForm.tsx

│   │   ├── WooShippingMethodSelector.tsx

│   │   ├── WooCouponInput.tsx

│   │   └── WooOrderConfirmation.tsx

│   ├── stripe/

│   │   ├── StripeAdapter.ts          # Initialisation Stripe.js + Stripe Elements

│   │   └── StripePaymentElement.tsx  # Composant Preact Stripe Elements

│   └── paypal/

│       ├── PayPalAdapter.ts          # Initialisation PayPal SDK

│       └── PayPalButtons.tsx         # Composant Preact PayPal Smart Buttons

│

└── store-api/

`    `└── WooStoreAPIClient.ts          # Client REST WooCommerce Store API v1

## <a name="_toc225003321"></a>**8.2 Structure du plugin WordPress PHP**

wordpress-plugin/

├── domos-woocommerce.php             # Fichier principal — déclaration plugin, hooks

├── readme.txt                        # Description wordpress.org

├── includes/

│   ├── class-domos-loader.php        # Chargement conditionnel selon page WooCommerce

│   ├── class-context-injector.php    # Génération JSON contexte → wp\_footer

│   ├── class-admin-settings.php      # Page Options WordPress DomOS > Réglages

│   ├── class-sw-registrar.php        # Enregistrement Service Worker

│   ├── class-assets-manager.php      # wp\_enqueue\_scripts — chargement JS/CSS

│   └── class-woo-hooks.php           # Hooks WooCommerce (cart, order, checkout)

├── blocks/

│   └── domos-widget/                 # Bloc Gutenberg — placement custom widget

│       ├── block.json

│       ├── edit.js

│       └── save.js

├── templates/

│   ├── single-product-context.php    # Template contexte page produit

│   ├── cart-context.php              # Template contexte page panier

│   └── checkout-context.php          # Template contexte page checkout

└── assets/

`    `├── js/

`    `│   ├── domos-browser.min.js      # @domos/browser bundle (copie du CDN)

`    `│   └── domos-woocommerce.min.js  # @domos/woocommerce bundle compilé

`    `└── css/

`        `└── domos-admin.css           # Styles page de réglages admin WP

## <a name="_toc225003322"></a>**8.3 WooCommerce Store API — Endpoints utilisés**

|**Endpoint Store API**|**Méthode**|**Usage dans @domos/woocommerce**|
| :- | :- | :- |
|/wc/store/v1/products|GET|woo\_search\_products — recherche avec filtres (search, category, tag, min\_price, max\_price)|
|/wc/store/v1/products/{id}|GET|woo\_get\_product — détail produit + variations|
|/wc/store/v1/cart|GET|woo\_get\_cart — état complet du panier|
|/wc/store/v1/cart/add-item|POST|woo\_add\_to\_cart — ajout article (id, quantity, variation)|
|/wc/store/v1/cart/update-item|POST|woo\_update\_cart\_item — modification quantité|
|/wc/store/v1/cart/remove-item|POST|woo\_remove\_cart\_item — suppression article|
|/wc/store/v1/cart/apply-coupon|POST|woo\_apply\_coupon — application code promo|
|/wc/store/v1/cart/remove-coupon|POST|Suppression coupon appliqué|
|/wc/store/v1/cart/select-shipping-rate|POST|Sélection méthode de livraison|
|/wc/store/v1/checkout|GET/POST|woo\_initiate\_checkout — récupération checkout + soumission commande|

## <a name="_toc225003323"></a>**8.4 Sécurité @domos/woocommerce**

|**Aspect**|**Implémentation**|
| :- | :- |
|Clé API DomOS|Stockée dans wp\_options (chiffrée) — transmise via wp\_localize\_script en front-end|
|WooCommerce Store API|API publique WooCommerce (authentification par nonce WordPress) — pas d'accès admin|
|Données carte Stripe|Jamais collectées par DomOS — Stripe Elements est un iframe cross-origin Stripe. DomOS reçoit uniquement le PaymentMethod ID.|
|Données PayPal|Jamais collectées par DomOS — popup PayPal cross-origin. DomOS reçoit uniquement l'Order ID PayPal.|
|Nonce WordPress|Chaque requête Store API utilise un nonce WooCommerce valide — protection CSRF|
|woo\_initiate\_checkout|Niveau de risque HITL high — modal Shadow DOM obligatoire avant création commande|
|Conformité PCI DSS|DomOS ne stocke, ne traite, ni ne transmet de données de carte — périmètre PCI DSS minimal (SAQ A)|
|HTTPS|Toutes les communications Stripe, PayPal et DomOS Cloud Pro en HTTPS/WSS — obligatoire en production|


# <a name="_toc225003324"></a>**9. Scénarios d'utilisation @domos/woocommerce**
## <a name="_toc225003325"></a>**9.1 CU-W01 — Achat guidé WooCommerce avec paiement Stripe**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-W01|
|Nom|Achat guidé complet sur WooCommerce avec paiement Stripe in-chat|
|Acteurs|Utilisateur, Agent DomOS, @domos/woocommerce, WooCommerce Store API, Stripe|
|Résultat attendu|L'utilisateur finalise son achat entièrement dans la conversation sans quitter le chat|

### <a name="_toc225003326"></a>**Flux principal**
1. L'utilisateur : « Je voudrais commander 2 kg de café arabica torréfié. »
1. L'agent appelle woo\_search\_products — trouve le produit.
1. L'agent appelle woo\_add\_to\_cart (2 unités) — toast de confirmation (risk: low).
1. L'agent propose le checkout in-chat. L'utilisateur accepte.
1. woo\_initiate\_checkout (risk: high) — modal HITL d'approbation. L'utilisateur approuve.
1. WooPaymentWidget s'affiche : récapitulatif, formulaires adresse, méthodes de livraison.
1. L'utilisateur remplit son adresse. Les options de livraison se chargent.
1. L'utilisateur saisit sa carte dans le Stripe Elements iframe sécurisé.
1. L'utilisateur clique Payer — 3DS2 si requis par sa banque (modale intégrée Stripe).
1. WooCommerce crée la commande (order status: processing). Stripe confirme le paiement.
1. L'agent : « Commande #856 confirmée ! Paiement reçu. Expédition dans 24h. »
## <a name="_toc225003327"></a>**9.2 CU-W02 — Assistance retour produit**

|**Champ**|**Détail**|
| :- | :- |
|Identifiant|CU-W02|
|Nom|L'agent guide l'utilisateur dans une demande de retour produit|
|Acteurs|Utilisateur, Agent DomOS, WooCommerce REST API|
|Résultat attendu|La demande de retour est initiée et l'utilisateur reçoit les instructions|

### <a name="_toc225003328"></a>**Flux principal**
1. L'utilisateur : « Je voudrais retourner ma commande #856, le café est moisi. »
1. L'agent appelle woo\_get\_order\_status pour vérifier l'éligibilité au retour.
1. L'agent vérifie la politique de retour (délai, conditions).
1. L'agent propose d'initier le retour. woo\_initiate\_return (risk: high) — modal HITL.
1. L'utilisateur confirme. Une note de commande WooCommerce est créée.
1. L'agent : « Votre demande de retour pour la commande #856 a été enregistrée. Vous recevrez un email avec l'étiquette de retour dans les 24h. »


# <a name="_toc225003329"></a>**10. Points communs — Exigences et Roadmap**
## <a name="_toc225003330"></a>**10.1 Exigences fonctionnelles communes**

|**ID**|**Exigence**|**Shopify**|**WooCommerce**|
| :- | :- | :- | :- |
|EF-EC01|Le package doit s'initialiser avec une seule fonction — toute la configuration est automatique.|✅|✅ (via plugin)|
|EF-EC02|Le contexte e-commerce doit être auto-injecté selon la page courante sans code manuel.|✅|✅|
|EF-EC03|Tous les tools e-commerce natifs doivent être pré-configurés avec les bons niveaux de risque HITL.|✅|✅|
|EF-EC04|Le PaymentWidget doit être rendu dans un Shadow DOM isolé — le CSS de la page ne l'affecte pas.|✅|✅|
|EF-EC05|Les données de carte bancaire ne doivent jamais passer par DomOS — uniquement par les iframes des gateways officiels.|✅|✅|
|EF-EC06|La session persistence de @domos/browser doit fonctionner — reprise transparente lors des navigations.|✅|✅|
|EF-EC07|Le package doit être compatible avec DomosAgent — les tools et le contexte enrichissent la mémoire de l'agent.|✅|✅|
|EF-EC08|Les tools critiques (checkout, payment) doivent avoir un niveau de risque HITL minimum high.|✅|✅|

## <a name="_toc225003331"></a>**10.2 Roadmap commune**

|**Version**|**Feature**|**@domos/shopify**|**@domos/woocommerce**|**Trimestre**|
| :- | :- | :- | :- | :- |
|v1.0|Tools e-commerce natifs + contexte auto-injecté + Widget|✅|✅|Q3 2026|
|v1.0|In-Chat Payments (Stripe)|✅ (Shopify Pay)|✅ (Stripe Elements)|Q3 2026|
|v1.0|Suivi commande in-chat|✅|✅|Q3 2026|
|v1.0|Distribution officielle|App Shopify App Store|Plugin wordpress.org|Q3 2026|
|v1.1|In-Chat Payments PayPal|✅ (via Shopify)|✅ (PayPal Smart Buttons)|Q4 2026|
|v1.1|Recommandations personnalisées (DomosAgent)|✅|✅|Q4 2026|
|v1.1|Retours et SAV in-chat|✅|✅|Q4 2026|
|v1.2|Multi-langue (i18n) — support FR/EN/ES/AR|✅|✅|Q1 2027|
|v1.2|Analytics e-commerce (taux conversion, abandons)|✅ (Cloud Pro)|✅ (Cloud Pro)|Q1 2027|
|v2.0|Abonnements et paiements récurrents|Shopify Subscriptions|WooCommerce Subscriptions|Q2 2027|


# <a name="_toc225003332"></a>**11. Annexes**
## <a name="_toc225003333"></a>**11.1 Comparaison des trois packages e-commerce**

|**Critère**|**@domos/browser**|**@domos/shopify**|**@domos/woocommerce**|
| :- | :- | :- | :- |
|Licence|MIT — Open Source|Propriétaire|Propriétaire|
|Plateforme cible|Toutes (générique)|Shopify uniquement|WordPress + WooCommerce|
|Installation|Balise <script> manuelle|App Store 1-clic ou <script>|Plugin wordpress.org|
|Contexte e-commerce|Manuel|Automatique (Shopify Liquid)|Automatique (PHP WooCommerce)|
|Tools e-commerce|À implémenter|12 tools natifs Shopify|12 tools natifs WooCommerce|
|In-Chat Payments|Non inclus|Shopify Pay + Apple/Google Pay|Stripe + PayPal|
|Dépendance|@domos/core|@domos/browser + core|@domos/browser + core|
|Disponibilité|Disponible (implémenté)|Q3 2026|Q3 2026|

## <a name="_toc225003334"></a>**11.2 Références**
- CdC @domos/browser v1 (Doc 6) — Fondation technique commune
- CdC @domos/browser v2 (Doc 7) — In-Chat Payments et roadmap e-commerce
- CdC DomosAgent (Doc 8) — Intégration mémoire et recommandations personnalisées
- Shopify Storefront API — https://shopify.dev/docs/api/storefront
- Shopify App Embed Blocks — https://shopify.dev/docs/themes/architecture/blocks/app-blocks
- WooCommerce Store API — https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/StoreApi/README.md
- WooCommerce REST API — https://woocommerce.github.io/woocommerce-rest-api-docs
- Stripe.js + Stripe Elements — https://stripe.com/docs/js
- PayPal JS SDK — https://developer.paypal.com/sdk/js/


*Document confidentiel — Futur4Tech © 2026 — @domos/shopify & @domos/woocommerce*
Page 1
