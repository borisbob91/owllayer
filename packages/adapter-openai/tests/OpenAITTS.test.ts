// ============================================================
// Tests pour OpenAITTS (avec mocks)
// Tests sans vraie API key OpenAI
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TTSConfig } from '@domos/core';
import { OpenAITTS } from '../src/OpenAITTS.js';

// Mock du client OpenAI
const mockCreate = vi.fn();
const mockRetrieve = vi.fn();

const toArrayBuffer = (buffer: Buffer): ArrayBuffer =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      audio = {
        speech: {
          create: mockCreate,
        },
      };
      models = {
        retrieve: mockRetrieve,
      };
    },
  };
});

describe('OpenAITTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetrieve.mockResolvedValue({ id: 'tts-1' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => new OpenAITTS({ apiKey: '' })).toThrow('OpenAI API key is required');
    });

    it('should initialize with default options', () => {
      const tts = new OpenAITTS({ apiKey: 'test-key' });
      expect(tts.name).toBe('openai-tts');
    });

    it('should accept custom options', () => {
      const tts = new OpenAITTS({
        apiKey: 'test-key',
        model: 'tts-1-hd',
        voice: 'onyx',
        format: 'opus',
      });
      expect(tts.name).toBe('openai-tts');
    });
  });

  describe('synthesize', () => {
    it('should synthesize text successfully', async () => {
      const fakeAudioBuffer = Buffer.from('fake mp3 audio data');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });

      const config: TTSConfig = {
        text: 'Bonjour, comment ça va ?',
      };

      const result = await tts.synthesize(config);

      expect(result.audioBase64).toBe(fakeAudioBuffer.toString('base64'));
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.characterCount).toBe(24);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should use default voice if not specified', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({
        apiKey: 'test-key',
        voice: 'nova',
      });

      await tts.synthesize({ text: 'Hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.voice).toBe('nova');
    });

    it('should override voice from config', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({
        apiKey: 'test-key',
        voice: 'nova',
      });

      await tts.synthesize({
        text: 'Hello',
        voice: 'onyx',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.voice).toBe('onyx');
    });

    it('should use specified model', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({
        apiKey: 'test-key',
        model: 'tts-1-hd',
      });

      await tts.synthesize({ text: 'Hello' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('tts-1-hd');
    });

    it('should respect speed parameter', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });

      await tts.synthesize({
        text: 'Hello',
        speed: 1.5,
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.speed).toBe(1.5);
    });

    it('should use specified output format', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });

      const result = await tts.synthesize({
        text: 'Hello',
        outputFormat: 'opus',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format).toBe('opus');
      expect(result.mimeType).toBe('audio/opus');
    });

    it('should normalize text before synthesis', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });

      await tts.synthesize({
        text: '  Hello    world  \n\n\n\n  test  ',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.input).toBe('Hello world\n\ntest');
    });

    it('should estimate audio duration', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });

      const text = 'This is a test with several words to synthesize';
      const result = await tts.synthesize({ text });

      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValue(new Error('API quota exceeded'));

      const tts = new OpenAITTS({ apiKey: 'test-key' });

      await expect(tts.synthesize({ text: 'Hello' })).rejects.toThrow('API quota exceeded');
    });

    it('should validate text length', async () => {
      const tts = new OpenAITTS({ apiKey: 'test-key' });

      const longText = 'a'.repeat(5001);

      await expect(tts.synthesize({ text: longText })).rejects.toThrow(
        'text exceeds maximum length'
      );
    });
  });

  describe('listVoices', () => {
    it('should list all voices without language filter', async () => {
      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const voices = await tts.listVoices();

      expect(voices).toHaveLength(6);
      expect(voices.map((v) => v.id)).toContain('alloy');
      expect(voices.map((v) => v.id)).toContain('echo');
      expect(voices.map((v) => v.id)).toContain('fable');
      expect(voices.map((v) => v.id)).toContain('onyx');
      expect(voices.map((v) => v.id)).toContain('nova');
      expect(voices.map((v) => v.id)).toContain('shimmer');
    });

    it('should filter voices by language', async () => {
      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const voices = await tts.listVoices('fr-FR');

      expect(voices).toHaveLength(6);
      voices.forEach((voice) => {
        expect(voice.languages).toContain('fr-FR');
      });
    });

    it('should return voice metadata', async () => {
      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const voices = await tts.listVoices();

      const nova = voices.find((v) => v.id === 'nova');
      expect(nova).toBeDefined();
      expect(nova?.name).toBe('Nova');
      expect(nova?.gender).toBe('female');
      expect(nova?.description).toContain('moderne');
      expect(nova?.style).toBe('modern');
    });
  });

  describe('isAvailable', () => {
    it('should return true if API is accessible', async () => {
      mockRetrieve.mockResolvedValue({ id: 'tts-1' });

      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const available = await tts.isAvailable();

      expect(available).toBe(true);
      expect(mockRetrieve).toHaveBeenCalledWith('tts-1');
    });

    it('should return false if API is not accessible', async () => {
      mockRetrieve.mockRejectedValue(new Error('Network error'));

      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const available = await tts.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('audio formats', () => {
    it('should support mp3 format', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const result = await tts.synthesize({
        text: 'Hello',
        outputFormat: 'mp3',
      });

      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('should support opus format', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const result = await tts.synthesize({
        text: 'Hello',
        outputFormat: 'opus',
      });

      expect(result.mimeType).toBe('audio/opus');
    });

    it('should support pcm format', async () => {
      const fakeAudioBuffer = Buffer.from('audio');
      mockCreate.mockResolvedValue({
        arrayBuffer: async () => toArrayBuffer(fakeAudioBuffer),
      });

      const tts = new OpenAITTS({ apiKey: 'test-key' });
      const result = await tts.synthesize({
        text: 'Hello',
        outputFormat: 'pcm',
      });

      expect(result.mimeType).toBe('audio/pcm;rate=24000');
    });
  });
});