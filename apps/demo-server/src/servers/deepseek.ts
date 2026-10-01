// Serveur de demo DeepSeek : texte uniquement (pour la voix, voir dev:deepgram avec DEEPGRAM_TEXT_PROVIDER=deepseek)
// pnpm --filter @owllayer/demo-server dev:deepseek   (variables : .env.deepseek puis .env)
import { loadDemoEnv } from '../shared/env.js';
import { startDemoServer } from '../shared/startDemoServer.js';
import { createDeepSeekText } from '../providers/deepseek.js';

loadDemoEnv('deepseek');

startDemoServer({
  label: 'deepseek',
  llm: createDeepSeekText(),
});
