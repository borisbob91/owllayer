// ============================================================
// Audio Format Detector — Auto-detect audio format from data
// Uses magic bytes (file signatures) for identification
// ============================================================

/**
 * Supported audio formats
 */
export type AudioFormat = 'pcm' | 'wav' | 'mp3' | 'opus' | 'flac' | 'webm' | 'ogg' | 'unknown';

/**
 * Magic bytes (file signatures) for audio formats
 * See: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
const MAGIC_BYTES: Record<string, { signature: number[]; offset: number; format: AudioFormat }> = {
  // WAV: "RIFF....WAVE"
  wav: {
    signature: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    format: 'wav',
  },
  wavCheck: {
    signature: [0x57, 0x41, 0x56, 0x45],
    offset: 8,
    format: 'wav',
  },
  // MP3: ID3v2 tag or MPEG frame sync
  mp3_id3v2: {
    signature: [0x49, 0x44, 0x33],
    offset: 0,
    format: 'mp3',
  },
  mp3_mpeg: {
    signature: [0xff, 0xfb],
    offset: 0,
    format: 'mp3',
  },
  mp3_mpeg2: {
    signature: [0xff, 0xf3],
    offset: 0,
    format: 'mp3',
  },
  mp3_mpeg25: {
    signature: [0xff, 0xf2],
    offset: 0,
    format: 'mp3',
  },
  // Ogg container (Opus/Vorbis)
  ogg: {
    signature: [0x4f, 0x67, 0x67, 0x53],
    offset: 0,
    format: 'ogg',
  },
  // Opus in Ogg: "OpusHead"
  opus: {
    signature: [0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64],
    offset: 28,
    format: 'opus',
  },
  // FLAC: "fLaC"
  flac: {
    signature: [0x66, 0x4c, 0x61, 0x43],
    offset: 0,
    format: 'flac',
  },
  // WebM: EBML header + DocType=webm
  webm: {
    signature: [0x1a, 0x45, 0xdf, 0xa3],
    offset: 0,
    format: 'webm',
  },
};

const DATA_URL_PREFIX = /^data:[^,]*;base64,/i;

/**
 * Detect audio format from base64 encoded data.
 * 
 * @param base64 - Base64 encoded audio data
 * @returns Detected format or 'unknown'
 */
export function detectFormatFromBase64(base64: string): AudioFormat {
  const normalizedBase64 = normalizeBase64(base64);

  if (!isValidBase64(normalizedBase64)) {
    return 'unknown';
  }

  const buffer = Buffer.from(normalizedBase64, 'base64');
  return detectFormatFromBuffer(buffer);
}

/**
 * Detect audio format from Buffer.
 * 
 * @param buffer - Audio data as Buffer
 * @returns Detected format or 'unknown'
 */
export function detectFormatFromBuffer(buffer: Buffer): AudioFormat {
  if (buffer.length === 0) {
    return 'unknown';
  }

  // Check Opus first (specific check in Ogg container)
  if (matchSignature(buffer, MAGIC_BYTES.ogg.signature, MAGIC_BYTES.ogg.offset)) {
    if (findSignature(buffer, MAGIC_BYTES.opus.signature, MAGIC_BYTES.ogg.signature.length) !== -1) {
      return 'opus';
    }
  }

  // Check all other formats
  for (const [key, { signature, offset, format }] of Object.entries(MAGIC_BYTES)) {
    if (key === 'opus' || key === 'wavCheck') continue; // Already checked or metadata

    if (buffer.length >= offset + signature.length) {
      if (matchSignature(buffer, signature, offset)) {
        // Special case: WAV requires both RIFF and WAVE check
        if (format === 'wav') {
          const waveCheck = MAGIC_BYTES.wavCheck;
          if (buffer.length >= waveCheck.offset + waveCheck.signature.length) {
            if (matchSignature(buffer, waveCheck.signature, waveCheck.offset)) {
              return 'wav';
            }
          }
          // Has RIFF but not WAVE
          continue;
        }
        
        return format;
      }
    }
  }

  // PCM in this package is Int16 PCM, so invalid or truncated payloads must not fallback to PCM.
  if (buffer.length < 4 || buffer.length % 2 !== 0) {
    return 'unknown';
  }

  // No magic bytes found → assume raw PCM
  return 'pcm';
}

function normalizeBase64(base64: string): string {
  return base64.trim().replace(DATA_URL_PREFIX, '').replace(/\s+/g, '');
}

function isValidBase64(base64: string): boolean {
  if (base64.length === 0 || base64.length % 4 === 1) {
    return false;
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return false;
  }

  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const buffer = Buffer.from(paddedBase64, 'base64');

  if (buffer.length === 0) {
    return false;
  }

  return buffer.toString('base64') === paddedBase64;
}

/**
 * Match signature (magic bytes) at specific offset.
 */
function matchSignature(buffer: Buffer, signature: number[], offset: number): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) {
      return false;
    }
  }
  return true;
}

function findSignature(buffer: Buffer, signature: number[], startOffset: number): number {
  const maxOffset = buffer.length - signature.length;

  for (let offset = startOffset; offset <= maxOffset; offset++) {
    if (matchSignature(buffer, signature, offset)) {
      return offset;
    }
  }

  return -1;
}

/**
 * Get MIME type from audio format.
 */
export function getMimeType(format: AudioFormat, sampleRate?: number): string {
  switch (format) {
    case 'pcm':
      return sampleRate ? `audio/pcm;rate=${sampleRate}` : 'audio/pcm';
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'opus':
      return 'audio/opus';
    case 'ogg':
      return 'audio/ogg';
    case 'flac':
      return 'audio/flac';
    case 'webm':
      return 'audio/webm';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get audio format from MIME type string.
 */
export function getFormatFromMimeType(mimeType: string): AudioFormat {
  const lower = mimeType.toLowerCase();

  if (lower.includes('pcm')) return 'pcm';
  if (lower.includes('wav')) return 'wav';
  if (lower.includes('mp3') || lower.includes('mpeg')) return 'mp3';
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('ogg')) return 'ogg';
  if (lower.includes('flac')) return 'flac';
  if (lower.includes('webm')) return 'webm';

  return 'unknown';
}
