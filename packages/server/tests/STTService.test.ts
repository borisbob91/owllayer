// ============================================================
// Tests pour BaseSTTService
// Tests des helpers et validations sans appels API
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseSTTService } from '../src/speech/STTService.js';
import type { STTAudioConfig, STTResult } from '../src/types.js';

// Classe de test qui implémente BaseSTTService
class TestSTTService extends BaseSTTService {
  readonly name = 'test-stt';

  async transcribe(config: STTAudioConfig): Promise<STTResult> {
    this.validateConfig(config);
    return {
      text: 'Test transcription',
      confidence: 0.95,
    };
  }
}

describe('BaseSTTService', () => {
  let service: TestSTTService;

  beforeEach(() => {
    service = new TestSTTService({ debug: false });
  });

  describe('validateConfig', () => {
    it('should accept valid config', async () => {
      const config: STTAudioConfig = {
        audioBase64: 'SGVsbG8gV29ybGQ=',
        mimeType: 'audio/pcm;rate=16000',
      };

      const result = await service.transcribe(config);
      expect(result.text).toBe('Test transcription');
    });

    it('should throw error if audioBase64 is missing', async () => {
      const config: any = {
        mimeType: 'audio/pcm;rate=16000',
      };

      await expect(service.transcribe(config)).rejects.toThrow('audioBase64 is required');
    });

    it('should throw error if mimeType is missing', async () => {
      const config: any = {
        audioBase64: 'SGVsbG8gV29ybGQ=',
      };

      await expect(service.transcribe(config)).rejects.toThrow('mimeType is required');
    });
  });

  describe('extractSampleRate', () => {
    it('should extract sample rate from mimeType', () => {
      const rate = (service as any).extractSampleRate('audio/pcm;rate=16000');
      expect(rate).toBe(16000);
    });

    it('should extract sample rate with spaces', () => {
      const rate = (service as any).extractSampleRate('audio/pcm; rate=48000');
      expect(rate).toBe(48000);
    });

    it('should return default 16000 if no rate specified', () => {
      const rate = (service as any).extractSampleRate('audio/wav');
      expect(rate).toBe(16000);
    });
  });

  describe('getAudioFormat', () => {
    it('should detect PCM format', () => {
      const format = (service as any).getAudioFormat('audio/pcm;rate=16000');
      expect(format).toBe('pcm');
    });

    it('should detect WAV format', () => {
      const format = (service as any).getAudioFormat('audio/wav');
      expect(format).toBe('wav');
    });

    it('should detect MP3 format', () => {
      const format = (service as any).getAudioFormat('audio/mp3');
      expect(format).toBe('mp3');
    });

    it('should detect MPEG format', () => {
      const format = (service as any).getAudioFormat('audio/mpeg');
      expect(format).toBe('mp3');
    });

    it('should detect Opus format', () => {
      const format = (service as any).getAudioFormat('audio/opus');
      expect(format).toBe('opus');
    });

    it('should return unknown for unsupported format', () => {
      const format = (service as any).getAudioFormat('audio/xyz');
      expect(format).toBe('unknown');
    });
  });

  describe('base64ToBuffer', () => {
    it('should convert base64 to Buffer', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const buffer = (service as any).base64ToBuffer(base64);
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.toString()).toBe('Hello World');
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
      const debugService = new TestSTTService({ debug: true });
      const consoleSpy = vi.spyOn(console, 'log');
      
      (debugService as any).log('Test message', { data: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[test-stt]',
        'Test message',
        { data: 'test' }
      );
    });
  });

  describe('measureTime', () => {
    it('should measure execution time', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const { result, duration } = await (service as any).measureTime(fn, 'test');
      
      expect(result).toBe('result');
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(200);
    });
  });
});
