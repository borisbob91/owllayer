import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAITTS } from '../src/OpenAITTS.js';
import { WhisperSTT } from '../src/WhisperSTT.js';
import { OPENAI_TTS_MODELS } from '../src/models.js';

const mockSpeech = vi.fn();
const mockTranscribe = vi.fn();
const mockRetrieve = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = {
      speech: { create: mockSpeech },
      transcriptions: { create: mockTranscribe },
    };
    models = { retrieve: mockRetrieve };
  },
}));

const audio = { audioBase64: Buffer.from('fake').toString('base64'), mimeType: 'audio/wav' };

describe('Modeles audio OpenAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpeech.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) });
    mockTranscribe.mockResolvedValue({ text: 'bonjour' });
    mockRetrieve.mockResolvedValue({});
  });

  describe('OpenAITTS', () => {
    it('envoie instructions avec gpt-4o-mini-tts', async () => {
      const tts = new OpenAITTS({ apiKey: 'k', model: 'gpt-4o-mini-tts', voice: 'marin', instructions: 'Ton chaleureux' });
      await tts.synthesize({ text: 'Bonjour' });
      expect(mockSpeech.mock.calls[0][0]).toMatchObject({
        model: 'gpt-4o-mini-tts',
        voice: 'marin',
        instructions: 'Ton chaleureux',
      });
    });

    it('ignore instructions avec tts-1', async () => {
      const tts = new OpenAITTS({ apiKey: 'k', model: 'tts-1', instructions: 'Ton chaleureux' });
      await tts.synthesize({ text: 'Bonjour' });
      expect(mockSpeech.mock.calls[0][0]).not.toHaveProperty('instructions');
    });

    it('expose les modeles et voix actuels', () => {
      const capabilities = new OpenAITTS({ apiKey: 'k' }).getCapabilities();
      expect(capabilities.models!.map((m) => m.id)).toEqual([...OPENAI_TTS_MODELS]);
      expect(capabilities.voices!.map((v) => v.id)).toEqual(expect.arrayContaining(['coral', 'marin', 'cedar', 'nova']));
    });
  });

  describe('WhisperSTT', () => {
    it('utilise verbose_json par defaut avec whisper-1', async () => {
      await new WhisperSTT({ apiKey: 'k' }).transcribe(audio);
      expect(mockTranscribe.mock.calls[0][0]).toMatchObject({ model: 'whisper-1', response_format: 'verbose_json' });
    });

    it('utilise json par defaut avec gpt-4o-transcribe', async () => {
      const result = await new WhisperSTT({ apiKey: 'k', model: 'gpt-4o-transcribe' }).transcribe(audio);
      expect(mockTranscribe.mock.calls[0][0]).toMatchObject({ model: 'gpt-4o-transcribe', response_format: 'json' });
      expect(result.text).toBe('bonjour');
    });

    it('verifie la disponibilite du modele configure', async () => {
      await new WhisperSTT({ apiKey: 'k', model: 'gpt-4o-mini-transcribe' }).isAvailable();
      expect(mockRetrieve).toHaveBeenCalledWith('gpt-4o-mini-transcribe');
    });
  });
});
