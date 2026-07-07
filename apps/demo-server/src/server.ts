import 'dotenv/config';
import { DomOSServer } from '@domos/server';
import { GoogleAdapter, GoogleLiveAdapter } from '@domos/adapter-google';
import { GoogleSTT, GoogleTTS } from '@domos/adapter-google';
import {
  createLiveKitRoomToken,
  isLiveKitServerEnvConfigured,
  resolveLiveKitRuntimeConfig,
} from '@domos/adapter-livekit';
import { createLogger, setLogLevel, LogLevel } from '@domos/core';
import { configDotenv } from 'dotenv';
import { PromotionsPlugin } from '@domos-plugins/demo-promotions';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';

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
const DOMOS_ADMIN_API_KEY = process.env.DOMOS_ADMIN_API_KEY || '';
const DOMOS_HOME_API_KEY  = process.env.DOMOS_HOME_API_KEY  || '';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_EXPOSE_API_KEYS = process.env.ADMIN_EXPOSE_API_KEYS !== 'false';
const REQUIRE_API_KEY = process.env.DOMOS_REQUIRE_API_KEY !== 'false';
const LIVEKIT_TOKEN_PATH = '/domos/livekit/token';
const httpServer = createServer();

if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_gemini_api_key_here') {
  log.warn('GOOGLE_API_KEY manquante ! Ajoutez votre cle dans .env');
}

// ============================================================
// Adaptateur LLM (Google Gemini — fallback texte)
// ============================================================

const llm = new GoogleAdapter({
  model: 'gemini-2.5-flash',
  apiKey: GOOGLE_API_KEY,
  systemPrompt: `Tu es un assistant intelligent de DomOS.
Tu adaptes ton comportement aux outils disponibles fournis par l'interface cliente.

Selon le contexte tu peux etre :
- Un assistant boutique (catalogue, panier, checkout) — demo React
- Un assistant admin (gestion du catalogue produits : ajout, modification, suppression) — demo Vue

Utilise SYSTEMATIQUEMENT les outils mis a ta disposition quand l'utilisateur te le demande.
Ne refuse jamais d'utiliser un outil sous pretexte qu'il ne correspond pas a un role predetermine.

REGLES CHECKOUT (si tu as acces aux outils de panier/checkout) :
1. Pour commencer la commande depuis le panier : utilise start_checkout.
2. Si l'utilisateur mentionne un code promo, appelle IMMEDIATEMENT apply_promo_code avec le code et le total du panier.
   Exemple : "j'ai le code BIENVENUE10" → apply_promo_code({code:"BIENVENUE10", cartTotal:<montant_panier>})
3. Quand l'utilisateur mentionne son nom, email, adresse, ville ou code postal, APPELLE IMMEDIATEMENT fill_address avec les champs extraits. N'attends pas de confirmation.
   Exemple : "je suis Jean Dupont, email jean@gmail.com, 12 rue de la Paix, Paris 75001" → fill_address({firstName:"Jean", lastName:"Dupont", email:"jean@gmail.com", address:"12 rue de la Paix", city:"Paris", postalCode:"75001"})
   Exemple : "kouacou ghislain boris, boris@gmail.com, 28 rue guesde villeneuses, paris 98144" → fill_address({firstName:"Ghislain", lastName:"Kouacou Boris", email:"boris@gmail.com", address:"28 rue guesde villeneuses", city:"Paris", postalCode:"98144"})
4. Apres fill_address, propose de choisir le mode de livraison via select_shipping.
5. Apres select_shipping, propose le paiement via select_payment.
6. La confirmation finale (confirm_checkout) demandera validation de l'utilisateur.

CODES PROMO (outils serveur disponibles) :
- get_current_promotions : liste les codes actifs et les ventes flash en cours
- apply_promo_code(code, cartTotal) : valide un code et calcule la remise
- get_flash_sale : verifie si une vente flash est en cours

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
      systemPrompt: `Tu es un assistant intelligent de DomOS en mode vocal.
Tu adaptes ton comportement aux outils disponibles fournis par l'interface cliente.

Selon le contexte tu peux etre :
- Un assistant boutique (catalogue, panier, checkout) — demo React
- Un assistant admin (gestion du catalogue produits : ajout, modification, suppression) — demo Vue

Utilise SYSTEMATIQUEMENT les outils mis a ta disposition quand l'utilisateur te le demande.
Ne refuse jamais d'utiliser un outil sous pretexte qu'il ne correspond pas a un role predetermine.

Si tu as acces aux outils de panier/checkout : utilise start_checkout pour demarrer une commande,
fill_address des que l'utilisateur donne ses coordonnees, puis select_shipping, select_payment, confirm_checkout.

Sois tres concis a l'oral. Reponds en francais.
Confirme chaque action realisee en une phrase courte.`,
    })
  : undefined;

// ============================================================
// Pipeline STT/TTS (Google Cloud — mode hybride)
// Activé quand le client envoie USER_INPUT audio (live: false)
// ============================================================

const stt = GOOGLE_API_KEY
  ? new GoogleSTT({
      apiKey: GOOGLE_API_KEY,
      defaultLanguage: 'fr-FR',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      debug: true,
    })
  : undefined;

const tts = GOOGLE_API_KEY
  ? new GoogleTTS({
      apiKey: GOOGLE_API_KEY,
      voice: 'fr-FR-Neural2-A',
      defaultLanguage: 'fr-FR',
      voiceType: 'Neural2',
      debug: true,
    })
  : undefined;

// ============================================================
// Serveur DomOS
// ============================================================

const server = new DomOSServer({
  llm,
  live,
  stt,
  tts,
  port: PORT,
  server: httpServer,
  path: '/domos',
  toolTimeout: 15_000,
  maxConversationMessages: 50,
  
  // Admin auth (username/password)
  admin: {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    path: '/admin',
  },

  // Dashboard embarqué @domos/ui — http://localhost:<PORT>/domos-ui
  ui: {
    enabled: true,
  },
  
  // Client auth (API keys WebSocket)
  client: {
    requireApiKey: REQUIRE_API_KEY,
    enableApiKeyManagement: ADMIN_EXPOSE_API_KEYS,
    maxConnectionsPerKey: 10,
  },

  // Virtual Lines — controle de concurrence par API key
  // POST /lines/acquire?apiKey=pk_xxx  →  { success, lineNumber, token }
  // Passer le token en query WS: new WebSocket("ws://host/domos?lineToken=<token>")
  virtualLines: DOMOS_API_KEY ? {
    lines: [
      {
        apiKey: DOMOS_API_KEY,
        count: 4,            // 4 appels simultanes max pour cette cle
        ttlMs: 5 * 60_000,  // duree max d'un appel: 5 min
        waitingTtlMs: 2 * 60_000, // temps max en file d'attente: 2 min
      },
    ],
  } : undefined,
});

httpServer.on('request', (req, res) => {
  void handleLiveKitTokenRequest(req, res);
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

// API key + system prompt specifique pour le demo admin (Vue)
if (DOMOS_ADMIN_API_KEY) {
  server.addApiKey(DOMOS_ADMIN_API_KEY);
  server.setPromptOverride(DOMOS_ADMIN_API_KEY, `Tu es l'assistant admin de la boutique DomOS, un outil de gestion du catalogue produits.

Tu aides l'administrateur a :
- Consulter la liste des produits (get_catalog)
- Ajouter de nouveaux produits (add_product)
- Modifier des produits existants (edit_product)
- Supprimer des produits (delete_product)

Utilise SYSTEMATIQUEMENT les outils ci-dessus quand l'administrateur te le demande.
Sois concis, precis et professionnel. Reponds en francais.
Confirme chaque action realisee.`);
  log.info(`API key admin enregistree avec prompt dedie: ${DOMOS_ADMIN_API_KEY.slice(0, 12)}...`);
}

// API key + system prompt specifique pour le demo Smart Home (Svelte)
if (DOMOS_HOME_API_KEY) {
  server.addApiKey(DOMOS_HOME_API_KEY);
  server.setPromptOverride(DOMOS_HOME_API_KEY, `Tu es l'assistant domotique de la maison DomOS, un assistant de controle de maison connectee.

Tu controles les appareils de la maison via ces outils :
- get_home_status  : etat complet de la maison
- set_light        : allumer/eteindre/dimmer les lumieres d'une piece (salon, chambre, cuisine, entree, sdb)
- set_temperature  : regler la temperature d'une piece
- lock_door        : verrouiller/deverrouiller la porte d'entree
- set_scene        : activer une scene (reveil, film, diner, nuit, absent)

Utilise SYSTEMATIQUEMENT ces outils quand l'utilisateur te le demande.
Exemples :
- "Allume le salon a 50%" → set_light({ roomId: "salon", on: true, brightness: 50 })
- "Mode soiree film"      → set_scene({ scene: "film" })
- "Verrouille la porte"   → lock_door({ lock: true })
- "Quelle temperature dans la chambre ?" → get_home_status()

Sois tres concis, naturel et immediat. Reponds en francais.
Confirme chaque action en une phrase courte.`);
  log.info(`API key Smart Home enregistree avec prompt dedie: ${DOMOS_HOME_API_KEY.slice(0, 12)}...`);
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
// Plugin: @domos-plugins/demo-promotions
//
// Server-side promo codes and flash sales for the shopping demo.
// The LLM can call these tools during the checkout flow:
//   get_current_promotions  — list active codes + flash sale
//   apply_promo_code        — validate a code and compute discount
//   get_flash_sale          — check if a flash sale is running
//
// Installed with mode: 'trusted' (feature_09 demo).
// ============================================================
// server.installPlugin(PromotionsPlugin, {}, { mode: 'trusted' });
// log.info('Plugin @domos-plugins/demo-promotions installed (trusted mode)');

// ============================================================
// Demarrage
// ============================================================

server.listen(() => {
  httpServer.listen(PORT, () => {
    log.info(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║       DomOS Demo Server                           ║
  ║                                                   ║
  ║   WebSocket:  ws://localhost:${PORT}/domos        ║
  ║   Admin API:  http://localhost:${PORT}/admin      ║
  ║   Dashboard:  http://localhost:${PORT}/domos-ui   ║
  ║   LiveKit:    http://localhost:${PORT}${LIVEKIT_TOKEN_PATH} ║
  ║                                                   ║
  ║   Audio:  Live (Gemini)  +  Hybride (Google       ║
  ║           STT Neural2 / TTS Neural2-A)            ║
  ║                                                   ║
  ║   Tools serveur: get_server_time,                 ║
  ║                  get_store_info                   ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
  });
});

// Graceful shutdown
let shutdownStarted = false;

async function shutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;

  log.info('Arret en cours...');
  await server.shutdown();
  await closeHttpServer();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});

process.on('SIGTERM', () => {
  void shutdown();
});

async function handleLiveKitTokenRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (url.pathname !== LIVEKIT_TOKEN_PATH) {
    return false;
  }

  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST, OPTIONS' });
    return true;
  }

  if (!isLiveKitServerEnvConfigured(process.env)) {
    writeJson(res, 503, { error: 'livekit_not_configured', enabled: false });
    return true;
  }

  const clientApiKey = readClientApiKey(req);
  if (!isClientApiKeyAllowed(clientApiKey)) {
    writeJson(res, 401, { error: 'invalid_api_key' });
    return true;
  }

  try {
    const body = await readJsonBody(req);
    const sessionId = readBodyString(body, 'sessionId');
    if (!sessionId) {
      writeJson(res, 400, { error: 'session_id_required' });
      return true;
    }

    const sessionSnapshot = await server.getAgentBridgeSessionSnapshot(sessionId);
    if (!sessionSnapshot) {
      writeJson(res, 404, { error: 'domos_session_not_found' });
      return true;
    }

    const livekitConfig = resolveLiveKitRuntimeConfig({}, process.env);
    const token = await createLiveKitRoomToken(
      {
        sessionId: sessionSnapshot.sessionId,
        roomName: readBodyString(body, 'roomName'),
        participantIdentity: readBodyString(body, 'participantIdentity'),
        participantName: readBodyString(body, 'participantName'),
        ttlSeconds: readBodyNumber(body, 'ttlSeconds'),
        metadata: { source: 'domos-demo-server' },
        attributes: { 'domos.demo': 'true' },
      },
      { config: livekitConfig }
    );

    writeJson(res, 200, token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === 'request_body_too_large' ? 413 : 400;
    writeJson(res, status, { error: status === 413 ? 'request_body_too_large' : 'invalid_request' });
  }

  return true;
}

function readClientApiKey(req: IncomingMessage): string | undefined {
  const authorization = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]) {
    return bearerMatch[1].trim();
  }

  const headerKey = req.headers['x-domos-api-key'];
  return Array.isArray(headerKey) ? headerKey[0] : headerKey;
}

function isClientApiKeyAllowed(apiKey: string | undefined): boolean {
  if (!REQUIRE_API_KEY) {
    return true;
  }

  const allowedKeys = [DOMOS_API_KEY, DOMOS_ADMIN_API_KEY, DOMOS_HOME_API_KEY].filter(Boolean);
  return Boolean(apiKey && allowedKeys.includes(apiKey));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > 8_192) {
      throw new Error('request_body_too_large');
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return {};
  }

  const parsed = JSON.parse(rawBody);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
}

function readBodyString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readBodyNumber(body: Record<string, unknown>, key: string): number | undefined {
  const value = body[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse): void {
  const origin = Array.isArray(req.headers.origin) ? req.headers.origin[0] : req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type, x-domos-api-key');
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {}
): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

async function closeHttpServer(): Promise<void> {
  if (!httpServer.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
