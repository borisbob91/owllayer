import 'dotenv/config';
import { DomOSServer } from '@domos/server';
import { GoogleAdapter, GoogleLiveAdapter } from '@domos/adapter-google';
import { createLogger, setLogLevel, LogLevel } from '@domos/core';
import { configDotenv } from 'dotenv';

const log = createLogger('Demo:Server');
// Niveau de logs du demo-server. Par défaut: INFO pour voir le banner de démarrage.
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

switch (LOG_LEVEL) {
  case 'silent':
    setLogLevel(LogLevel.SILENT);
    break;
  case 'error':
    setLogLevel(LogLevel.ERROR);
    break;
  case 'warn':
    setLogLevel(LogLevel.WARN);
    break;
  case 'debug':
    setLogLevel(LogLevel.DEBUG);
    break;
  default:
    setLogLevel(LogLevel.INFO);
    break;
}

configDotenv({path:'../.env' }); // Recharger les variables d'environnement pour s'assurer que les dernières sont prises en compte

// ============================================================
// Configuration
// ============================================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const DOMOS_API_KEY = process.env.DOMOS_API_KEY || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_EXPOSE_API_KEYS = process.env.ADMIN_EXPOSE_API_KEYS === 'true';
const REQUIRE_API_KEY = process.env.DOMOS_REQUIRE_API_KEY !== 'false';

if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_gemini_api_key_here') {
  log.warn('GOOGLE_API_KEY manquante ! Ajoutez votre cle dans .env');
}

// ============================================================
// Adaptateur LLM (Google Gemini — fallback texte)
// ============================================================

const llm = new GoogleAdapter({
  model: 'gemini-2.5-flash',
  apiKey: GOOGLE_API_KEY,
  systemPrompt: `Tu es l'assistant de la boutique DomOS, une boutique en ligne de peripheriques informatiques.

Tu aides les clients a :
- Trouver des produits dans le catalogue
- Filtrer par categorie
- Ajouter des produits au panier
- Consulter et gerer le panier
- Confirmer des commandes

Tu as acces a des tools qui te permettent d'agir directement sur l'interface utilisateur.
Utilise-les quand le client te le demande.

REGLES CHECKOUT (IMPORTANT) :
1. Pour commencer la commande depuis le panier : utilise start_checkout.
2. Quand l'utilisateur mentionne son nom, email, adresse, ville ou code postal dans son message, APPELLE IMMEDIATEMENT fill_address avec les champs extraits. N'attends pas de confirmation.
   Exemple : "je suis Jean Dupont, email jean@gmail.com, 12 rue de la Paix, Paris 75001" → fill_address({firstName:"Jean", lastName:"Dupont", email:"jean@gmail.com", address:"12 rue de la Paix", city:"Paris", postalCode:"75001"})
   Exemple : "kouacou ghislain boris, boris@gmail.com, 28 rue guesde villeneuses, paris 98144" → fill_address({firstName:"Ghislain", lastName:"Kouacou Boris", email:"boris@gmail.com", address:"28 rue guesde villeneuses", city:"Paris", postalCode:"98144"})
3. Apres fill_address, propose de choisir le mode de livraison via select_shipping.
4. Apres select_shipping, propose le paiement via select_payment.
5. La confirmation finale (confirm_checkout) demandera validation de l'utilisateur.

Sois concis, aimable et professionnel. Reponds en francais.
Quand tu utilises un tool, confirme l'action au client.`,
});

// ============================================================
// Adaptateur Live Audio (Gemini Native — audio bidirectionnel)
// ============================================================

const live = GOOGLE_API_KEY
  ? new GoogleLiveAdapter({
      apiKey: GOOGLE_API_KEY,
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      voice: 'Fenrir',
      systemPrompt: `Tu es l'assistant vocal de la boutique DomOS, une boutique en ligne de peripheriques informatiques.

Tu aides les clients a :
- Trouver des produits dans le catalogue
- Filtrer par categorie
- Ajouter des produits au panier
- Consulter et gerer le panier
- Confirmer des commandes

Tu as acces a des tools qui te permettent d'agir directement sur l'interface utilisateur.
Utilise-les quand le client te le demande.

REGLES CHECKOUT (IMPORTANT) :
1. Pour commencer la commande depuis le panier : utilise start_checkout.
2. Quand l'utilisateur mentionne son nom, email, adresse, ville ou code postal dans son message, APPELLE IMMEDIATEMENT fill_address avec les champs extraits. N'attends pas de confirmation.
   Exemple : "je suis Jean Dupont, email jean@gmail.com, 12 rue de la Paix, Paris 75001" → fill_address({firstName:"Jean", lastName:"Dupont", email:"jean@gmail.com", address:"12 rue de la Paix", city:"Paris", postalCode:"75001"})
3. Apres fill_address, propose de choisir le mode de livraison via select_shipping.
4. Apres select_shipping, propose le paiement via select_payment.
5. La confirmation finale (confirm_checkout) demandera validation de l'utilisateur.

Sois concis, aimable et professionnel. Reponds en francais.
Quand tu utilises un tool, confirme l'action au client.`,
    })
  : undefined;

// ============================================================
// Serveur DomOS
// ============================================================

const server = new DomOSServer({
  llm,
  live,
  port: PORT,
  path: '/domos',
  rateLimit: {
    maxRequests: 60,
    windowMs: 60_000,
  },
  toolTimeout: 15_000,
  maxConversationMessages: 50,
  
  // Admin auth (username/password)
  admin: {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    path: '/admin',
  },
  
  // Client auth (API keys WebSocket)
  client: {
    requireApiKey: REQUIRE_API_KEY,
    enableApiKeyManagement: ADMIN_EXPOSE_API_KEYS,
    maxConnectionsPerKey: 10,
  },

  // Virtual Lines — desactivees temporairement pour test
  // virtualLines: {
  //   lines: [
  //     {
  //       apiKey: DOMOS_API_KEY,
  //       count: 4,
  //       ttlMs: 5 * 60_000,
  //       waitingTtlMs: 2 * 60_000,
  //     },
  //   ],
  // },
});

// ============================================================
// Enregistrer les API keys autorisees
// ============================================================

if (REQUIRE_API_KEY && DOMOS_API_KEY) {
  server.addApiKey(DOMOS_API_KEY);
  log.info(`API key enregistree: ${DOMOS_API_KEY.slice(0, 12)}...`);
} else if (REQUIRE_API_KEY) {
  log.warn('DOMOS_API_KEY manquante ! Les connexions seront refusees (requireAuth=true)');
} else {
  log.info('Client auth sans API key active (DOMOS_REQUIRE_API_KEY=false).');
}

// ============================================================
// Tools cote serveur (optionnel)
//
// Ces tools sont executes sur le serveur.
// Les tools definis dans les composants React/Vue (via useAgentTool)
// sont automatiquement synchronises via CONTEXT_UPDATE
// et executes cote client.
// ============================================================

server.tool('get_server_time', async () => {
  return {
    timestamp: Date.now(),
    formatted: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
  };
});

server.tool('get_store_info', async () => {
  return {
    name: 'Boutique DomOS',
    description: 'Peripheriques informatiques de qualite',
    hours: 'Lun-Ven 9h-18h',
    email: 'contact@domos-demo.local',
    shipping: 'Livraison gratuite des 50 EUR',
  };
});

// ============================================================
// Demarrage
// ============================================================

server.listen(() => {
  log.info(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║       DomOS Demo Server                           ║
  ║                                                   ║
  ║   WebSocket:  ws://localhost:${PORT}/domos        ║
  ║   Admin API:  http://localhost:${PORT}/admin      ║
  ║                                                   ║
  ║   Tools serveur: get_server_time,                 ║
  ║                  get_store_info                   ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log.info('Arret en cours...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});
