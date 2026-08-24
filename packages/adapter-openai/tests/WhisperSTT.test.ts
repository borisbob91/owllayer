// ============================================================
// Tests pour WhisperSTT (avec mocks)
// Tests sans vraie API key OpenAI
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { STTAudioConfig } from '@owllayer/core';
import { WhisperSTT } from '../src/WhisperSTT.js';

// Mock du client OpenAI
const mockTranscribe = vi.fn();
const mockRetrieve = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      audio = {
        transcriptions: {
          create: mockTranscribe,
        },
      };
      models = {
        retrieve: mockRetrieve,
      };
    },
  };
});

describe('WhisperSTT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetrieve.mockResolvedValue({ id: 'whisper-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new WhisperSTT({ apiKey: '' })).toThrow('OpenAI API key is required');
    });

    it('should initialize with default options', () => {
      const whisper = new WhisperSTT({ apiKey: 'test-key' });
      expect(whisper.name).toBe('openai-whisper');
    });

    it('should accept custom options', () => {
      const whisper = new WhisperSTT({
        apiKey: 'test-key',
        model: 'whisper-1',
        language: 'fr',
        temperature: 0.5,
      });
      expect(whisper.name).toBe('openai-whisper');
    });
  });

  describe('transcribe', () => {
    it('should transcribe audio successfully (text format)', async () => {
      mockTranscribe.mockResolvedValue({
        text: 'Bonjour, comment ça va ?',
      });

      const whisper = new WhisperSTT({
        apiKey: 'test-key',
        responseFormat: 'text',
      });

      const config: STTAudioConfig = {
        audioBase64: Buffer.from('fake audio data').toString('base64'),
        mimeType: 'audio/wav',
      };

      const result = await whisper.transcribe(config);

      expect(result.text).toBe('Bonjour, comment ça va ?');
      expect(mockTranscribe).toHaveBeenCalledTimes(1);
    });

    it('should transcribe audio with verbose_json format', async () => {
      mockTranscribe.mockResolvedValue({
        text: 'Hello world',
        language: 'en',
        duration: 2.5,
        segments: [
          { text: 'Hello world', no_speech_prob: 0.05 },
        ],
      });

      const whisper = new WhisperSTT({
        apiKey: 'test-key',
        responseFormat: 'verbose_json',
      });

      const config: STTAudioConfig = {
        audioBase64: Buffer.from('fake audio').toString('base64'),
        mimeType: 'audio/mp3',
      };

      const result = await whisper.transcribe(config);

      expect(result.text).toBe('Hello world');
      expect(result.detectedLanguage).toBe('en');
      expect(result.audioDuration).toBe(2500);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should convert PCM to WAV before transcribing', async () => {
      mockTranscribe.mockResolvedValue({
        text: 'Test transcription',
      });

      const whisper = new WhisperSTT({ apiKey: 'test-key' });

      const config: STTAudioConfig = {
        audioBase64: Buffer.from('fake pcm data'.repeat(100)).toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      };

      const result = await whisper.transcribe(config);

      expect(result.text).toBe('Test transcription');

      const callArgs = mockTranscribe.mock.calls[0][0];
      expect(callArgs.file).toBeDefined();
    });

    it('should handle language parameter', async () => {
      mockTranscribe.mockResolvedValue({
        text: 'Bonjour',
      });

      const whisper = new WhisperSTT({
        apiKey: 'test-key',
        language: 'fr',
      });

      const config: STTAudioConfig = {
        audioBase64: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/wav',
      };

      await whisper.transcribe(config);

      const callArgs = mockTranscribe.mock.calls[0][0];
      expect(callArgs.language).toBe('fr');
    });

    it('should override language from config', async () => {
      mockTranscribe.mockResolvedValue({
        text: 'Hello',
      });

      const whisper = new WhisperSTT({
        apiKey: 'test-key',
        language: 'fr',
      });

      const config: STTAudioConfig = {
        audioBase64: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/wav',
        languageCode: 'en',
      };

      await whisper.transcribe(config);

      const callArgs = mockTranscribe.mock.calls[0][0];
      expect(callArgs.language).toBe('en');
    });

    it('should handle API errors gracefully', async () => {
      mockTranscribe.mockRejectedValue(new Error('API rate limit exceeded'));

      const whisper = new WhisperSTT({ apiKey: 'test-key' });

      const config: STTAudioConfig = {
        audioBase64: Buffer.from('audio').toString('base64'),
        mimeType: 'audio/wav',
      };

      await expect(whisper.transcribe(config)).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('isAvailable', () => {
    it('should return true if API is accessible', async () => {
      mockRetrieve.mockResolvedValue({ id: 'whisper-1' });

      const whisper = new WhisperSTT({ apiKey: 'test-key' });
      const available = await whisper.isAvailable();

      expect(available).toBe(true);
      expect(mockRetrieve).toHaveBeenCalledWith('whisper-1');
    });

    it('should return false if API is not accessible', async () => {
      mockRetrieve.mockRejectedValue(new Error('Network error'));

      const whisper = new WhisperSTT({ apiKey: 'test-key' });
      const available = await whisper.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('PCM to WAV conversion', () => {
    it('should create valid WAV header', () => {
      const whisper = new WhisperSTT({ apiKey: 'test-key' });

      const pcmData = Buffer.alloc(1000);
      const wavBuffer = (whisper as any).convertPCMtoWAV(pcmData, 16000);

      expect(wavBuffer.toString('utf8', 0, 4)).toBe('RIFF');
      expect(wavBuffer.toString('utf8', 8, 12)).toBe('WAVE');
      expect(wavBuffer.toString('utf8', 12, 16)).toBe('fmt ');
      expect(wavBuffer.toString('utf8', 36, 40)).toBe('data');
      expect(wavBuffer.length).toBe(44 + 1000);
    });

    it('should set correct sample rate in WAV header', () => {
      const whisper = new WhisperSTT({ apiKey: 'test-key' });

      const pcmData = Buffer.alloc(100);
      const wavBuffer = (whisper as any).convertPCMtoWAV(pcmData, 48000);

      const sampleRate = wavBuffer.readUInt32LE(24);
      expect(sampleRate).toBe(48000);
    });
  });

  describe('confidence calculation', () => {
    it('should calculate average confidence from segments', () => {
      const whisper = new WhisperSTT({ apiKey: 'test-key' });

      const transcription = {
        text: 'Test',
        segments: [
          { no_speech_prob: 0.1 },
          { no_speech_prob: 0.2 },
          { no_speech_prob: 0.1 },
        ],
      };

      const confidence = (whisper as any).calculateConfidence(transcription);

      expect(confidence).toBeCloseTo(0.87, 2);
    });

    it('should return undefined if no segments', () => {
      const whisper = new WhisperSTT({ apiKey: 'test-key' });

      const transcription = {
        text: 'Test',
        segments: [],
      };

      const confidence = (whisper as any).calculateConfidence(transcription);
      expect(confidence).toBeUndefined();
    });
  });
});