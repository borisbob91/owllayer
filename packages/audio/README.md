# @domos/audio

Audio encoding/decoding utilities for DomOS framework. Centralized audio handling with support for multiple formats: PCM, WAV, MP3, Opus, FLAC.

## Features

- ✅ **PCM encoding/decoding** (Float32 ↔ Int16 ↔ base64)
- ✅ **WAV decoder** (parse WAV files, extract PCM)
- ✅ **Opus decoder** (Opus packets to PCM)
- ✅ **Format detection** (auto-detect from magic bytes)
- ✅ **Zero native dependencies** (pure JS + WASM)
- ✅ **Production-tested** (PCM code copied from production utils)

## Installation

```bash
pnpm add @domos/audio
```

## Usage

### PCM Encoding (Capture Audio)

```ts
import { base64EncodeAudio } from '@domos/audio';

// From getUserMedia / AudioContext
const float32Samples = new Float32Array(4096); // From ScriptProcessor

// Encode to base64 Int16 PCM
const base64 = base64EncodeAudio(float32Samples);

// Send to server
client.sendAudio(base64, 'audio/pcm;rate=16000');
```

### PCM Decoding (Playback Audio)

```ts
import { decodeAudioToFloat32 } from '@domos/audio';

// From server (base64 Int16 PCM)
const base64PCM = '...';

// Decode to Float32Array
const samples = decodeAudioToFloat32(base64PCM);

// Play with AudioContext
const audioContext = new AudioContext({ sampleRate: 24000 });
const buffer = audioContext.createBuffer(1, samples.length, 24000);
buffer.getChannelData(0).set(samples);

const source = audioContext.createBufferSource();
source.buffer = buffer;
source.connect(audioContext.destination);
source.start();
```

### WAV Decoding

```ts
import { decodeWAVFromBase64 } from '@domos/audio';

const wavBase64 = '...'; // Base64 encoded WAV file

const audioData = await decodeWAVFromBase64(wavBase64);
console.log(audioData.samples); // Float32Array
console.log(audioData.sampleRate); // 16000
console.log(audioData.channels); // 1 (mono)
console.log(audioData.duration); // 2.5 seconds
```

### Opus Decoding

```ts
import { decodeOpusFromBase64 } from '@domos/audio';

const opusPacket = '...'; // Base64 encoded Opus packet

const samples = decodeOpusFromBase64(opusPacket, {
  sampleRate: 16000,
  channels: 1,
});

console.log(samples); // Float32Array PCM data
```

### Format Detection

```ts
import { detectFormatFromBase64, getMimeType } from '@domos/audio';

const audioBase64 = '...';

// Auto-detect format
const format = detectFormatFromBase64(audioBase64); // 'wav' | 'mp3' | 'opus' | 'pcm' | ...

// Get MIME type
const mimeType = getMimeType(format, 16000); // 'audio/wav', 'audio/pcm;rate=16000', etc.
```

## API Reference

### PCM Encoder/Decoder

#### `base64EncodeAudio(samples: Float32Array): string`

Encode Float32 PCM samples to base64 Int16 string.

**CRITICAL**: This is the **exact** implementation from production `utils/audioHelpers.ts`. **DO NOT MODIFY**.

**Parameters:**
- `samples` - PCM samples in Float32 format (-1.0 to 1.0)

**Returns:** Base64 encoded Int16 PCM data

---

#### `decodeAudio(base64: string): Uint8Array`

Decode base64 Int16 PCM to raw bytes.

**Parameters:**
- `base64` - Base64 encoded Int16 PCM data

**Returns:** Raw bytes (Uint8Array)

---

#### `decodeAudioToFloat32(base64: string): Float32Array`

Decode base64 Int16 PCM to Float32Array for playback.

**Parameters:**
- `base64` - Base64 encoded Int16 PCM data

**Returns:** Float32Array PCM samples for AudioContext

---

### WAV Decoder

#### `decodeWAVFromBase64(base64: string): Promise<AudioData>`

Decode WAV file from base64.

**Supports:**
- PCM 8/16/24/32 bit
- Sample rates: 8000, 16000, 22050, 24000, 44100, 48000 Hz
- Mono and stereo (returns channel 0 if stereo)

**Parameters:**
- `base64` - Base64 encoded WAV file

**Returns:** `AudioData` object:
```ts
{
  samples: Float32Array;    // PCM samples
  sampleRate: number;       // Hz
  channels: number;         // 1=mono, 2=stereo
  duration: number;         // seconds
}
```

---

### Opus Decoder

#### `decodeOpusFromBase64(base64: string, options?: OpusDecodeOptions): Float32Array`

Decode Opus packet(s) to PCM.

**Opus specifications:**
- Sample rates: 8kHz, 12kHz, 16kHz, 24kHz, 48kHz
- Channels: 1 (mono) or 2 (stereo)
- Packet size: 2.5ms to 120ms (typically 20ms for voice)
- Bitrate: 6-510 kb/s (voice: 16-32 kb/s)

**Parameters:**
- `base64` - Base64 encoded Opus packet
- `options` - Decode options:
  ```ts
  {
    sampleRate?: number;  // Default: 16000
    channels?: number;    // Default: 1
  }
  ```

**Returns:** Float32Array PCM samples

---

### Format Detection

#### `detectFormatFromBase64(base64: string): AudioFormat`

Auto-detect audio format from magic bytes.

**Supported formats:**
- `'pcm'` - Raw PCM data
- `'wav'` - WAV (RIFF container)
- `'mp3'` - MP3 (MPEG-1/2 Layer 3)
- `'opus'` - Opus (in Ogg container)
- `'ogg'` - Ogg Vorbis
- `'flac'` - FLAC
- `'webm'` - WebM (audio track)
- `'unknown'` - Unrecognized format

**Parameters:**
- `base64` - Base64 encoded audio data

**Returns:** Detected format

---

#### `getMimeType(format: AudioFormat, sampleRate?: number): string`

Get MIME type string from audio format.

**Examples:**
```ts
getMimeType('pcm', 16000)  // 'audio/pcm;rate=16000'
getMimeType('wav')          // 'audio/wav'
getMimeType('opus')         // 'audio/opus'
```

---

#### `getFormatFromMimeType(mimeType: string): AudioFormat`

Extract audio format from MIME type string.

**Examples:**
```ts
getFormatFromMimeType('audio/wav')           // 'wav'
getFormatFromMimeType('audio/pcm;rate=16000') // 'pcm'
getFormatFromMimeType('audio/mpeg')          // 'mp3'
```

---

## Technical Details

### Why WASM and not Rust?

This package uses **WebAssembly (WASM)** via JavaScript libraries instead of native Rust bindings because:

- ✅ **Zero config**: `npm install` works everywhere (no compilation)
- ✅ **Cross-platform**: Same binary for Windows/macOS/Linux
- ✅ **Small bundle**: 200-500KB WASM vs 8-10MB Rust binaries
- ✅ **Fast enough**: WASM audio decoding is 2-3× slower than native, but sufficiently fast for real-time (Discord uses WASM Opus in production)
- ✅ **Maintenance**: Pure TypeScript, no Rust expertise required
- ✅ **CI/CD**: No cross-compilation matrix needed

**When to use Rust:** If DomOS reaches >50k audio sessions/day and latency becomes a bottleneck (>100ms), consider native bindings.

### Dependencies

- `wav-decoder` (^1.3.0) - Pure JS WAV parser
- `opusscript` (^0.1.1) - Pure JS Opus decoder

**No native dependencies** - works on all platforms without compilation.

### Bundle Size

- PCM encoder/decoder: ~1KB
- WAV decoder: ~15KB (with wav-decoder)
- Opus decoder: ~150KB (with opusscript)
- Format detector: ~2KB

**Total**: ~170KB (minified + gzipped)

---

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Build
pnpm build
```

### Test Coverage

- ✅ PCM encoding/decoding (100% coverage)
- ✅ WAV format detection
- ✅ Opus format detection
- ✅ Format auto-detection (magic bytes)
- ✅ MIME type conversion
- ✅ Roundtrip tests (encode → decode)

---

## Production Usage

### PCM Code Integrity

⚠️ **CRITICAL**: The PCM encoder (`base64EncodeAudio`) is **copied exactly** from production `utils/audioHelpers.ts`.

**DO NOT OPTIMIZE OR MODIFY** this code. It's used in production chats and must remain byte-for-byte identical for compatibility.

Any changes to PCM encoding will break existing audio sessions.

### Migration from utils/audioHelpers.ts

Before (duplicated):
```ts
// In 5+ different files
const int16 = new Int16Array(pcm.length);
for (let i = 0; i < pcm.length; i++) {
  int16[i] = pcm[i] < 0 ? pcm[i] * 0x8000 : pcm[i] * 0x7FFF;
}
const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
```

After (centralized):
```ts
import { base64EncodeAudio } from '@domos/audio';

const base64 = base64EncodeAudio(pcm);
```

**Benefits:**
- ✅ Single source of truth
- ✅ Centralized testing
- ✅ Easy to add new formats
- ✅ -100 lines of duplicated code

---

## License

MIT

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

**Important**: Do not modify PCM encoder logic without explicit approval.
