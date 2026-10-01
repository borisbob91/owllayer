// Serveur de demo Google : Gemini texte + Gemini Live (+ STT/TTS Google en mode hybride)
// pnpm --filter @owllayer/demo-server dev:google   (variables : .env.google puis .env)
import { loadDemoEnv } from '../shared/env.js';
import { startDemoServer } from '../shared/startDemoServer.js';
import { createGoogleLive, createGoogleSpeech, createGoogleText } from '../providers/google.js';

loadDemoEnv('google');

startDemoServer({
  label: 'google',
  llm: createGoogleText(),
  live: createGoogleLive(),
  ...createGoogleSpeech(),
});
