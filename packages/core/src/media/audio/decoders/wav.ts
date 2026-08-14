// ============================================================
// WAV Decoder — Parse WAV files and extract PCM data
// Uses wav-decoder library (pure JS, no native deps)
// ============================================================

import { decode as decodeWAV } from 'wav-decoder';

export interface AudioData {
  /** PCM samples in Float32 format */
  samples: Float32Array;
  /** Sample rate (Hz) */
  sampleRate: number;
  /** Number of channels (1 = mono, 2 = stereo) */
  channels: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Decode WAV file from base64 string.
 * 
 * Supports:
 * - PCM 8/16/24/32 bit
 * - Sample rates: 8000, 16000, 22050, 24000, 44100, 48000 Hz
 * - Mono and stereo (returns channel 0 if stereo)
 * 
 * @param base64 - Base64 encoded WAV file
 * @returns Audio data with PCM samples
 * @throws Error if WAV format is invalid or unsupported
 */
export async function decodeWAVFromBase64(base64: string): Promise<AudioData> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const audioData = await decodeWAV(buffer);

    if (!audioData.channelData || audioData.channelData.length === 0) {
      throw new Error('WAV file contains no audio data');
    }

    // Take first channel (mono) or left channel (stereo)
    const samples = new Float32Array(audioData.channelData[0]);
    const sampleRate = audioData.sampleRate;
    const channels = audioData.channelData.length;
    const duration = samples.length / sampleRate;

    return {
      samples,
      sampleRate,
      channels,
      duration,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode WAV: ${message}`);
  }
}

/**
 * Decode WAV file from Buffer.
 * 
 * @param buffer - WAV file as Buffer
 * @returns Audio data with PCM samples
 */
export async function decodeWAVFromBuffer(buffer: Buffer): Promise<AudioData> {
  const base64 = buffer.toString('base64');
  return decodeWAVFromBase64(base64);
}

/**
 * Extract metadata from WAV file without full decoding.
 * Useful for quick format validation.
 * 
 * @param base64 - Base64 encoded WAV file
 * @returns Metadata only (no samples)
 */
export async function getWAVMetadata(base64: string): Promise<Omit<AudioData, 'samples'>> {
  const audioData = await decodeWAVFromBase64(base64);
  return {
    sampleRate: audioData.sampleRate,
    channels: audioData.channels,
    duration: audioData.duration,
  };
}
