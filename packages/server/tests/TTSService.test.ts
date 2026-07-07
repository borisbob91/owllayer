// ============================================================
// Tests pour BaseTTSService
// Tests des helpers et validations sans appels API
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseTTSService } from '../src/speech/TTSService.js';
import type { TTSConfig, TTSResult } from '../src/speech/types.js';

// Classe de test qui implémente BaseTTSService
class TestTTSService extends BaseTTSService {
  readonly name = 'test-tts';

  async synthesize(config: TTSConfig): Promise<TTSResult> {
    this.validateConfig(config);
    return {
      audioBase64: 'dGVzdA==',
      mimeType: 'audio/mpeg',
      characterCount: config.text.length,
    };
  }
}

describe('BaseTTSService', () => {
  let service: TestTTSService;

  beforeEach(() => {
    service = new TestTTSService({ debug: false });
  });

  describe('validateConfig', () => {
    it('should accept valid config', async () => {
      const config: TTSConfig = {
        text: 'Hello world',
      };

      const result = await service.synthesize(config);
      expect(result.audioBase64).toBe('dGVzdA==');
    });

    it('should throw error if text is empty', async () => {
      const config: TTSConfig = {
        text: '',
      };

      await expect(service.synthesize(config)).rejects.toThrow('text is required and cannot be empty');
    });

    it('should throw error if text is only whitespace', async () => {
      const config: TTSConfig = {
        text: '   ',
      };

      await expect(service.synthesize(config)).rejects.toThrow('text is required and cannot be empty');
    });

    it('should throw error if text exceeds 5000 characters', async () => {
      const config: TTSConfig = {
        text: 'a'.repeat(5001),
      };

      await expect(service.synthesize(config)).rejects.toThrow('text exceeds maximum length');
    });

    it('should throw error if speed is too low', async () => {
      const config: TTSConfig = {
        text: 'Hello',
        speed: 0.2,
      };

      await expect(service.synthesize(config)).rejects.toThrow('speed must be between 0.25 and 4.0');
    });

    it('should throw error if speed is too high', async () => {
      const config: TTSConfig = {
        text: 'Hello',
        speed: 5.0,
      };

      await expect(service.synthesize(config)).rejects.toThrow('speed must be between 0.25 and 4.0');
    });

    it('should throw error if pitch is too low', async () => {
      const config: TTSConfig = {
        text: 'Hello',
        pitch: -25,
      };

      await expect(service.synthesize(config)).rejects.toThrow('pitch must be between -20 and 20');
    });

    it('should throw error if pitch is too high', async () => {
      const config: TTSConfig = {
        text: 'Hello',
        pitch: 25,
      };

      await expect(service.synthesize(config)).rejects.toThrow('pitch must be between -20 and 20');
    });

    it('should throw error if volume is negative', async () => {
      const config: TTSConfig = {
        text: 'Hello',
        volume: -0.1,
      };

      await expect(service.synthesize(config)).rejects.toThrow('volume must be between 0 and 1');
    });

    it('should throw error if volume is too high', async () => {
      const config: TTSConfig = {
        text: 'Hello',
        volume: 1.5,
      };

      await expect(service.synthesize(config)).rejects.toThrow('volume must be between 0 and 1');
    });
  });

  describe('normalizeText', () => {
    it('should trim whitespace', () => {
      const normalized = (service as any).normalizeText('  Hello world  ');
      expect(normalized).toBe('Hello world');
    });

    it('should reduce multiple spaces to single space', () => {
      const normalized = (service as any).normalizeText('Hello    world');
      expect(normalized).toBe('Hello world');
    });

    it('should limit newlines to max 2 consecutive', () => {
      const normalized = (service as any).normalizeText('Hello\n\n\n\nworld');
      expect(normalized).toBe('Hello\n\nworld');
    });
  });

  describe('countCharacters', () => {
    it('should count characters correctly', () => {
      const count = (service as any).countCharacters('Hello world');
      expect(count).toBe(11);
    });

    it('should count empty string as 0', () => {
      const count = (service as any).countCharacters('');
      expect(count).toBe(0);
    });
  });

  describe('estimateDuration', () => {
    it('should estimate duration for normal text', () => {
      const text = 'Hello world this is a test'; // 6 words
      const duration = (service as any).estimateDuration(text, 1.0);
      
      // 6 words / 150 words/min = 0.04 min = 2.4 seconds = 2400ms
      expect(duration).toBeGreaterThanOrEqual(2400);
      expect(duration).toBeLessThanOrEqual(3000);
    });

    it('should adjust duration for speed', () => {
      const text = 'Hello world this is a test';
      const normalDuration = (service as any).estimateDuration(text, 1.0);
      const fastDuration = (service as any).estimateDuration(text, 2.0);
      
      // Double speed = half duration
      expect(fastDuration).toBeLessThan(normalDuration);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for mp3', () => {
      const mimeType = (service as any).getMimeType('mp3');
      expect(mimeType).toBe('audio/mpeg');
    });

    it('should return correct MIME type for opus', () => {
      const mimeType = (service as any).getMimeType('opus');
      expect(mimeType).toBe('audio/opus');
    });

    it('should return correct MIME type for aac', () => {
      const mimeType = (service as any).getMimeType('aac');
      expect(mimeType).toBe('audio/aac');
    });

    it('should return correct MIME type for flac', () => {
      const mimeType = (service as any).getMimeType('flac');
      expect(mimeType).toBe('audio/flac');
    });

    it('should return correct MIME type for wav', () => {
      const mimeType = (service as any).getMimeType('wav');
      expect(mimeType).toBe('audio/wav');
    });

    it('should return correct MIME type for pcm', () => {
      const mimeType = (service as any).getMimeType('pcm');
      expect(mimeType).toBe('audio/pcm;rate=24000');
    });

    it('should default to mp3 for unknown format', () => {
      const mimeType = (service as any).getMimeType('xyz');
      expect(mimeType).toBe('audio/mpeg');
    });
  });

  describe('bufferToBase64', () => {
    it('should convert Buffer to base64', () => {
      const buffer = Buffer.from('Hello World');
      const base64 = (service as any).bufferToBase64(buffer);
      
      expect(base64).toBe('SGVsbG8gV29ybGQ=');
    });

    it('should convert Uint8Array to base64', () => {
      const uint8 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = (service as any).bufferToBase64(uint8);
      
      expect(base64).toBe('SGVsbG8=');
    });
  });

  describe('isAvailable', () => {
    it('should return true by default', async () => {
      const available = await service.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('logging', () => {
    it('should not log when debug is false', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      (service as any).log('Test message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log when debug is true', () => {
      const debugService = new TestTTSService({ debug: true });
      const consoleSpy = vi.spyOn(console, 'log');
      
      (debugService as any).log('Test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[test-tts]',
        'Test message',
        { data: 'test' }
      );
    });
  });
});
