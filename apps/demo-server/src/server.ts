// Point d'entree historique (pnpm dev, image Docker) : demarre le serveur du fournisseur choisi.
// DEMO_PROVIDER = google | openai | deepseek | deepgram, lu dans .env (google par defaut).
// Chaque fournisseur a aussi sa commande : pnpm --filter @owllayer/demo-server dev:<fournisseur>
import { DEMO_PROVIDERS, readSharedEnv, type DemoProvider } from './shared/env.js';

const shared = readSharedEnv();
const read = (name: string) => process.env[name] ?? shared[name];
// Anciennes variables (LLM_PROVIDER, VOICE_PROVIDER) acceptees tant que DEMO_PROVIDER est absent
const legacy = read('VOICE_PROVIDER')?.toLowerCase() === 'deepgram' ? 'deepgram' : read('LLM_PROVIDER');
const provider = (read('DEMO_PROVIDER') || legacy || 'google').toLowerCase() as DemoProvider;

if (!DEMO_PROVIDERS.includes(provider)) {
  console.error(`Unknown DEMO_PROVIDER "${provider}". Expected one of: ${DEMO_PROVIDERS.join(', ')}.`);
  process.exit(1);
}

await import(`./servers/${provider}.js`);
