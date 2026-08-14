// ============================================================
// AudioEncoder — PCM encoding (Float32 → Int16 → base64)
// IMPORTANT: Code copied EXACTLY from utils/audioHelpers.ts
// DO NOT MODIFY - Critical for compatibility with existing chats
// ============================================================

/**
 * Encode Float32Array PCM samples to Int16 base64 string.
 * 
 * **CRITICAL**: This is the EXACT implementation from utils/audioHelpers.ts.
 * DO NOT optimize or modify - it's used in production chats.
 * 
 * @param float32Array - PCM samples in Float32 format (-1.0 to 1.0)
 * @returns Base64 encoded Int16 PCM data
 */
export function base64EncodeAudio(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  let binary = '';
  const bytes = new Uint8Array(int16Array.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Environment detection: browser (btoa) vs Node.js (Buffer)
  const globalScope = globalThis as typeof globalThis & {
    btoa?: (data: string) => string;
  };
  if (typeof globalScope.btoa === 'function') {
    return globalScope.btoa(binary);
  } else {
    // Node.js fallback
    return Buffer.from(binary, 'binary').toString('base64');
  }
}

/**
 * Decode base64 Int16 PCM to Uint8Array.
 * 
 * **CRITICAL**: This is the EXACT implementation from utils/audioHelpers.ts.
 * DO NOT optimize or modify.
 * 
 * @param base64String - Base64 encoded Int16 PCM data
 * @returns Raw bytes (Uint8Array)
 */
export function decodeAudio(base64String: string): Uint8Array {
  // Environment detection: browser (atob) vs Node.js (Buffer)
  let binaryString: string;
  const globalScope = globalThis as typeof globalThis & {
    atob?: (data: string) => string;
  };
  if (typeof globalScope.atob === 'function') {
    binaryString = globalScope.atob(base64String);
  } else {
    // Node.js fallback
    binaryString = Buffer.from(base64String, 'base64').toString('binary');
  }
  
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decode base64 Int16 PCM to Float32Array for playback.
 * 
 * **CRITICAL**: This is the EXACT implementation from utils/audioHelpers.ts.
 * DO NOT optimize or modify.
 * 
 * @param base64String - Base64 encoded Int16 PCM data
 * @returns Float32Array PCM samples for AudioContext
 */
export function decodeAudioToFloat32(base64String: string): Float32Array {
  const audioBytes = decodeAudio(base64String);
  
  // Convert Raw Int16 PCM to Float32
  const int16 = new Int16Array(audioBytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  
  return float32;
}
