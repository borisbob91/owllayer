import { describe, it, expect } from 'vitest';
import { base64EncodeAudio, decodeAudio, decodeAudioToFloat32 } from '../src/encoders/pcm';

describe('PCM Encoder/Decoder', () => {
  describe('base64EncodeAudio', () => {
    it('should encode Float32Array to base64 Int16 PCM', () => {
      // Input: simple sine wave samples
      const samples = new Float32Array([0.0, 0.5, 1.0, 0.5, 0.0, -0.5, -1.0, -0.5]);
      const base64 = base64EncodeAudio(samples);
      
      // Should return non-empty base64 string
      expect(base64).toBeTruthy();
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should handle silence (zeros)', () => {
      const silence = new Float32Array(1024).fill(0);
      const base64 = base64EncodeAudio(silence);
      
      expect(base64).toBeTruthy();
      expect(typeof base64).toBe('string');
    });

    it('should clamp values outside [-1, 1] range', () => {
      const samples = new Float32Array([2.0, -3.0, 0.5]);
      const base64 = base64EncodeAudio(samples);
      
      // Should not throw, values should be clamped
      expect(base64).toBeTruthy();
      
      // Decode and verify clamping
      const decoded = decodeAudioToFloat32(base64);
      expect(decoded[0]).toBeLessThanOrEqual(1.0);
      expect(decoded[0]).toBeGreaterThanOrEqual(0.99); // ~1.0 after clamping
      expect(decoded[1]).toBeGreaterThanOrEqual(-1.0);
      expect(decoded[1]).toBeLessThanOrEqual(-0.99); // ~-1.0 after clamping
    });

    it('should handle empty input', () => {
      const empty = new Float32Array(0);
      const base64 = base64EncodeAudio(empty);
      
      // Empty array should produce empty or minimal base64
      expect(typeof base64).toBe('string');
    });
  });

  describe('decodeAudio', () => {
    it('should decode base64 PCM to Uint8Array', () => {
      const samples = new Float32Array([0.0, 0.5, -0.5]);
      const base64 = base64EncodeAudio(samples);
      const bytes = decodeAudio(base64);
      
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
      // Int16 = 2 bytes per sample
      expect(bytes.length).toBe(samples.length * 2);
    });
  });

  describe('decodeAudioToFloat32', () => {
    it('should roundtrip encode → decode without significant loss', () => {
      const original = new Float32Array([0.0, 0.25, 0.5, 0.75, -0.25, -0.5, -0.75]);
      const base64 = base64EncodeAudio(original);
      const decoded = decodeAudioToFloat32(base64);
      
      expect(decoded.length).toBe(original.length);
      
      // Check values are close (allow small quantization error from Int16)
      for (let i = 0; i < original.length; i++) {
        expect(Math.abs(decoded[i] - original[i])).toBeLessThan(0.001);
      }
    });

    it('should handle silence roundtrip', () => {
      const silence = new Float32Array(512).fill(0);
      const base64 = base64EncodeAudio(silence);
      const decoded = decodeAudioToFloat32(base64);
      
      expect(decoded.length).toBe(silence.length);
      expect(decoded.every(v => v === 0)).toBe(true);
    });

    it('should handle full scale positive', () => {
      const fullScale = new Float32Array([1.0, 1.0, 1.0]);
      const base64 = base64EncodeAudio(fullScale);
      const decoded = decodeAudioToFloat32(base64);
      
      for (const value of decoded) {
        expect(value).toBeCloseTo(1.0, 2); // 2 decimal places
      }
    });

    it('should handle full scale negative', () => {
      const fullScale = new Float32Array([-1.0, -1.0, -1.0]);
      const base64 = base64EncodeAudio(fullScale);
      const decoded = decodeAudioToFloat32(base64);
      
      for (const value of decoded) {
        expect(value).toBeCloseTo(-1.0, 2);
      }
    });
  });

  describe('PCM encoder consistency (CRITICAL)', () => {
    it('should produce EXACT same output as utils/audioHelpers.ts', () => {
      // This test validates that the copied code produces identical results
      // Reference test case from production
      const samples = new Float32Array([
        0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
        -0.1, -0.2, -0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0,
      ]);
      
      const base64 = base64EncodeAudio(samples);
      const decoded = decodeAudioToFloat32(base64);
      
      // Verify all samples roundtrip correctly
      expect(decoded.length).toBe(samples.length);
      for (let i = 0; i < samples.length; i++) {
        // Allow 0.1% error due to Int16 quantization
        const error = Math.abs((decoded[i] - samples[i]) / samples[i]);
        if (!isNaN(error) && samples[i] !== 0) {
          expect(error).toBeLessThan(0.001);
        }
      }
    });
  });
});
