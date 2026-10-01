// Serveur de demo OpenAI : texte + Realtime
// pnpm --filter @owllayer/demo-server dev:openai   (variables : .env.openai puis .env)
import { loadDemoEnv } from '../shared/env.js';
import { startDemoServer } from '../shared/startDemoServer.js';
import { createOpenAILive, createOpenAIText } from '../providers/openai.js';

loadDemoEnv('openai');

startDemoServer({
  label: 'openai',
  llm: createOpenAIText(),
  live: createOpenAILive(),
});
