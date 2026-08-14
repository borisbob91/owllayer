// ============================================================
// @owllayer/core/media/audio — Audio encoding/decoding utilities
// ============================================================

// PCM encoder/decoder (CRITICAL: DO NOT MODIFY - copied from production)
export { base64EncodeAudio, decodeAudio, decodeAudioToFloat32 } from './encoders/pcm.js';

// Decoders
export { decodeWAVFromBase64, decodeWAVFromBuffer, getWAVMetadata } from './decoders/wav.js';
export type { AudioData } from './decoders/wav.js';

export {
  decodeOpusFromBase64,
  decodeOpusPackets,
  getOpusPacketDuration,
} from './decoders/opus.js';
export type { OpusDecodeOptions } from './decoders/opus.js';

// Format detection
export {
  detectFormatFromBase64,
  detectFormatFromBuffer,
  getMimeType,
  getFormatFromMimeType,
} from './formats/detector.js';
export type { AudioFormat } from './formats/detector.js';
