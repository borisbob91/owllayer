import type { DomOSConfig } from '../config/types.js';
import type { LLMAdapter, LiveAdapter, STTService, TTSService } from '@domos/core';

export interface BuiltAdapters {
  llm: LLMAdapter;
  live?: LiveAdapter;
  stt?: STTService;
  tts?: TTSService;
}

export async function buildAdapters(config: DomOSConfig): Promise<BuiltAdapters> {
  const llm = await buildLLMAdapter(config);
  const live = config.live?.enabled ? await buildLiveAdapter(config) : undefined;
  const stt = config.stt ? await buildSTT(config) : undefined;
  const tts = config.tts ? await buildTTS(config) : undefined;

  return { llm, live, stt, tts };
}

// ── LLM Text Adapter ────────────────────────────────────

async function buildLLMAdapter(config: DomOSConfig): Promise<LLMAdapter> {
  const provider = config.llm.provider;
  const model = config.llm.model;

  switch (provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleAdapter } = await import('@domos/adapter-google');
      return new GoogleAdapter({ apiKey, model: model ?? 'gemini-2.5-flash' });
    }
    case 'openai': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      const { OpenAIAdapter } = await import('@domos/adapter-openai');
      return new OpenAIAdapter({ apiKey, model: model ?? 'gpt-4o' });
    }
    case 'anthropic': {
      const apiKey = requireEnv('ANTHROPIC_API_KEY');
      const { AnthropicAdapter } = await import('@domos/adapter-anthropic');
      return new AnthropicAdapter({ apiKey, model: model ?? 'claude-sonnet-4-20250514' });
    }
    default:
      throw new Error(`[DomOS] Provider LLM inconnu : ${provider}`);
  }
}

// ── Live Audio Adapter ──────────────────────────────────

async function buildLiveAdapter(config: DomOSConfig): Promise<LiveAdapter | undefined> {
  const provider = config.llm.provider;

  switch (provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleLiveAdapter } = await import('@domos/adapter-google');
      return new GoogleLiveAdapter({
        apiKey,
        model: config.live?.model ?? 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: config.live?.voice ?? 'Fenrir',
      });
    }
    case 'openai': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      try {
        const { OpenAILiveAdapter } = await import('@domos/adapter-openai');
        return new OpenAILiveAdapter({ apiKey, voice: config.live?.voice ?? 'alloy' });
      } catch {
        console.warn('[DomOS] OpenAI Live adapter non disponible — mode texte uniquement.');
        return undefined;
      }
    }
    default:
      return undefined;
  }
}

// ── STT ─────────────────────────────────────────────────

async function buildSTT(config: DomOSConfig): Promise<STTService | undefined> {
  if (!config.stt) return undefined;

  switch (config.stt.provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleSTT } = await import('@domos/adapter-google');
      return new GoogleSTT({
        apiKey,
        defaultLanguage: config.stt.language ?? 'fr-FR',
        model: config.stt.model ?? 'latest_long',
      });
    }
    case 'whisper': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      const { WhisperSTT } = await import('@domos/adapter-openai');
      return new WhisperSTT({ apiKey });
    }
    default:
      return undefined;
  }
}

// ── TTS ─────────────────────────────────────────────────

async function buildTTS(config: DomOSConfig): Promise<TTSService | undefined> {
  if (!config.tts) return undefined;

  switch (config.tts.provider) {
    case 'google': {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      const { GoogleTTS } = await import('@domos/adapter-google');
      return new GoogleTTS({
        apiKey,
        voice: config.tts.voice ?? 'fr-FR-Neural2-A',
        defaultLanguage: config.tts.language ?? 'fr-FR',
        voiceType: config.tts.voiceType ?? 'Neural2',
      });
    }
    case 'openai': {
      const apiKey = requireEnv('OPENAI_API_KEY');
      const { OpenAITTS } = await import('@domos/adapter-openai');
      return new OpenAITTS({ apiKey, voice: config.tts.voice ?? 'nova' });
    }
    case 'elevenlabs': {
      const apiKey = requireEnv('ELEVENLABS_API_KEY');
      const { ElevenLabsTTS } = await import('../../speech/providers/ElevenLabsTTS.js');
      return new ElevenLabsTTS({ apiKey, voice: config.tts.voice });
    }
    default:
      return undefined;
  }
}

// ── Utilitaire ──────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[DomOS] ❌ Variable d'environnement requise manquante : ${name}`);
    process.exit(1);
  }
  return value;
}
