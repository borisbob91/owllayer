import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { configDotenv } from 'dotenv';
import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { OwlLayerServer } from '@owllayer/server';
import { GoogleAdapter } from '@owllayer/adapter-google';
import {
  // Le "cerveau vocal" LiveKit : implemente la meme interface LiveAdapter
  // que GoogleLiveAdapter, donc il se branche exactement au meme endroit.
  GeminiLiveAdapter,
  // Token de room : le navigateur en a besoin pour rejoindre la room WebRTC.
  createLiveKitRoomToken,
  resolveLiveKitRuntimeConfig,
  parseLiveKitTokenAllowedOrigins,
  resolveLiveKitTokenCorsOrigin,
} from '@owllayer/adapter-livekit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger le .env de manière absolue et robuste
configDotenv({ path: join(__dirname, '../.env') });
configDotenv({ path: join(__dirname, '../../demo-server/.env') });
configDotenv({ path: join(process.cwd(), 'apps/demo-server-livekit/.env') });
configDotenv();

// ============================================================
// OwlLayer + LiveKit — serveur d'exemple minimal
//
// Ce fichier montre les DEUX branchements que LiveKit demande :
//
//   (A) le cerveau vocal   -> GeminiLiveAdapter dans l'option `live`
//   (B) le transport room   -> un endpoint HTTP qui signe des tokens
//
// (A) est identique aux autres adapters live. (B) est le seul "extra"
// propre a LiveKit, parce que le media passe par une room WebRTC.
// ============================================================

const PORT = parseInt(process.env.PORT || '3002', 10);
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OWLLAYER_API_KEY = process.env.OWLLAYER_API_KEY || 'pk_livekit_demo';
const LIVEKIT_TOKEN_PATH = '/owllayer/livekit/token';
const ALLOWED_ORIGINS = parseLiveKitTokenAllowedOrigins(
  process.env.OWLLAYER_LIVEKIT_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:4100,http://localhost:4200,http://localhost:4300,http://localhost:4400'
);

if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_gemini_api_key_here') {
  console.warn('[OwlLayer:LiveKitServer] Warning: Missing GOOGLE_API_KEY in apps/demo-server-livekit/.env');
}

// On fournit notre propre serveur HTTP pour pouvoir ajouter l'endpoint token.
const httpServer = createServer();

// ============================================================
// (A) LE BRANCHEMENT LIVEKIT — c'est tout, une seule option.
//
// `live` accepte n'importe quel LiveAdapter :
//   - GoogleLiveAdapter  (audio Gemini natif, sans LiveKit)
//   - GeminiLiveAdapter  (audio Gemini via LiveKit)  <-- ICI
// Le serveur ne voit qu'un LiveAdapter, il ne sait pas que c'est LiveKit.
// ============================================================

const DEFAULT_LANG = (process.env.OWLLAYER_LANG === 'en' ? 'en' : 'fr') as 'en' | 'fr';

const SYSTEM_PROMPTS = {
  fr: {
    text: "Tu es l'assistant IA OwlLayer. Tu aides l'utilisateur à interagir efficacement avec l'interface et à exécuter les actions requises.",
    voice: "Tu es l'assistant vocal OwlLayer. Réponds de façon concise, naturelle et fluide en français ou en anglais selon la langue de l'utilisateur.",
  },
  en: {
    text: "You are the OwlLayer AI Assistant. You assist users with interface actions and real-time tool execution.",
    voice: "You are the OwlLayer voice assistant. Keep answers concise, helpful and natural in English or French depending on the user's language.",
  },
};

const server = new OwlLayerServer({
  // Cerveau texte (obligatoire)
  llm: new GoogleAdapter({
    apiKey: GOOGLE_API_KEY || 'dummy_key_to_prevent_crash',
    model: GEMINI_MODEL,
    systemPrompt: SYSTEM_PROMPTS[DEFAULT_LANG].text,
  }),

  // Cerveau vocal via LiveKit (optionnel). <-- LE point que tout le monde cherche.
  live: GOOGLE_API_KEY
    ? new GeminiLiveAdapter({
        apiKey: GOOGLE_API_KEY,
        voice: 'Puck',
        systemPrompt: SYSTEM_PROMPTS[DEFAULT_LANG].voice,
      })
    : undefined,

  port: PORT,
  server: httpServer,
  path: '/owllayer',
  client: { requireApiKey: true },
});

server.addApiKey(OWLLAYER_API_KEY);

// ============================================================
// (B) LE TRANSPORT ROOM — endpoint token.
//
// Le navigateur appelle POST /owllayer/livekit/token avec un sessionId +
// sa cle API. On verifie que la session lui appartient, puis on signe un
// token de room a duree limitee. Le LIVEKIT_API_SECRET ne quitte jamais
// le serveur.
// ============================================================

const liveKitConfig = resolveLiveKitRuntimeConfig({}, process.env);

httpServer.on('request', async (req: IncomingMessage, res: ServerResponse) => {
  if (!req.url || !req.url.startsWith(LIVEKIT_TOKEN_PATH)) return;

  const origin = req.headers.origin;
  const corsOrigin = resolveLiveKitTokenCorsOrigin(origin, ALLOWED_ORIGINS);
  if (corsOrigin) res.setHeader('Access-Control-Allow-Origin', corsOrigin);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.writeHead(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  // Corps attendu: { sessionId, apiKey }
  const body = await readJson(req);
  const sessionId = body?.sessionId as string | undefined;
  const apiKey = body?.apiKey as string | undefined;

  // Verifications de securite : la session doit exister ET appartenir a la cle.
  const snapshot = sessionId
    ? await server.getAgentBridgeSessionSnapshot(sessionId)
    : undefined;
  const owned =
    sessionId && apiKey
      ? await server.isAgentBridgeSessionOwnedByApiKey(sessionId, apiKey)
      : false;

  if (!snapshot || !owned) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'owllayer_session_not_found' }));
    return;
  }

  // Signature du token (court, 5 min).
  const token = await createLiveKitRoomToken(
    {
      sessionId: snapshot.sessionId,
      roomName: `owllayer-${snapshot.sessionId}`,
      ttlSeconds: 300,
    },
    { config: liveKitConfig }
  );

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(token));
});

// ============================================================
// Demarrage
// ============================================================

server.listen(() => {
  httpServer.listen(PORT, () => {
    console.log(`OwlLayer + LiveKit sur ws://localhost:${PORT}/owllayer`);
    console.log(`Endpoint token: http://localhost:${PORT}${LIVEKIT_TOKEN_PATH}`);
  });
});

function readJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}
