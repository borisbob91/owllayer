// ============================================================
// Opus Decoder — Decode Opus packets to PCM
// Uses opusscript (pure JS implementation, no native deps)
// ============================================================

import OpusScript from 'opusscript';

export interface OpusDecodeOptions {
  /** Sample rate (8000, 12000, 16000, 24000, 48000) */
  sampleRate?: number;
  /** Number of channels (1 = mono, 2 = stereo) */
  channels?: number;
  /** Frame size in samples (default: auto-detect) */
  frameSize?: number;
}

/**
 * Valid Opus sample rates (matches OpusScript VALID_SAMPLING_RATES)
 */
type OpusSampleRate = 8000 | 12000 | 16000 | 24000 | 48000;

/**
 * Decode Opus packet(s) from base64 to Float32Array PCM.
 * 
 * Opus codec specifications:
 * - Sample rates: 8kHz, 12kHz, 16kHz, 24kHz, 48kHz (most common: 16kHz for voice, 48kHz for music)
 * - Channels: 1 (mono) or 2 (stereo)
 * - Packet size: 2.5ms to 120ms (typically 20ms for real-time voice)
 * - Bitrate: 6 kb/s to 510 kb/s (voice: 16-32 kb/s, music: 96-128 kb/s)
 * 
 * @param base64 - Base64 encoded Opus packet(s)
 * @param options - Decode options (sample rate, channels)
 * @returns Float32Array with PCM samples
 * @throws Error if Opus data is invalid
 */
export function decodeOpusFromBase64(
  base64: string,
  options: OpusDecodeOptions = {}
): Float32Array {
  const {
    sampleRate = 16000, // Default to 16kHz (voice-optimized)
    channels = 1, // Default to mono
  } = options;

  // Validate sample rate (Opus only supports specific rates)
  const validSampleRates = [8000, 12000, 16000, 24000, 48000];
  if (!validSampleRates.includes(sampleRate)) {
    throw new Error(
      `Invalid Opus sample rate: ${sampleRate}. Must be one of: ${validSampleRates.join(', ')}`
    );
  }

  try {
    const buffer = Buffer.from(base64, 'base64');

    // Create Opus decoder instance
    const decoder = new OpusScript(sampleRate as OpusSampleRate, channels);

    // Decode Opus packet to PCM Int16
    const pcmInt16 = decoder.decode(buffer);

    // Convert Int16 → Float32 (same as PCM decoder for consistency)
    const float32 = new Float32Array(pcmInt16.length);
    for (let i = 0; i < pcmInt16.length; i++) {
      float32[i] = pcmInt16[i] / 32768.0;
    }

    return float32;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to decode Opus: ${message}`);
  }
}

/**
 * Decode multiple Opus packets (streaming scenario).
 * 
 * @param packets - Array of base64 encoded Opus packets
 * @param options - Decode options
 * @returns Concatenated Float32Array with all decoded PCM samples
 */
export function decodeOpusPackets(
  packets: string[],
  options: OpusDecodeOptions = {}
): Float32Array {
  const decodedPackets = packets.map((packet) =>
    decodeOpusFromBase64(packet, options)
  );

  // Calculate total length
  const totalLength = decodedPackets.reduce((sum, arr) => sum + arr.length, 0);

  // Concatenate all packets
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const packet of decodedPackets) {
    result.set(packet, offset);
    offset += packet.length;
  }

  return result;
}

/**
 * Detect Opus packet duration (useful for streaming).
 * 
 * Opus packet header encoding (first byte):
 * - Bits 0-1: Frame duration (2.5ms, 5ms, 10ms, 20ms, 40ms, 60ms, 80ms, 100ms, 120ms)
 * - Bits 2-4: Frame count
 * 
 * @param base64 - Base64 encoded Opus packet
 * @returns Duration in milliseconds
 */
export function getOpusPacketDuration(base64: string): number {
  try {
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      throw new Error('Empty Opus packet');
    }

    // Read TOC byte (Table Of Contents)
    const toc = buffer[0];

    // Extract frame duration code (bits 3-7)
    const config = (toc >> 3) & 0x1f;

    // Opus frame durations mapping
    const durations = [10, 20, 40, 60]; // ms
    const durationIndex = config % 4;

    return durations[durationIndex];
  } catch (error) {
    // Fallback to 20ms (most common)
    return 20;
  }
}
