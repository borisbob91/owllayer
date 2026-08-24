# Audio Centralization — Architecture & Roadmap

> **Problème** : La gestion audio est dupliquée dans 5+ endroits avec support PCM uniquement.  
> **Objectif** : Centraliser dans @owllayer/core avec support multi-formats (WAV, MP3, Opus, FLAC, WebM).  
> **Question clé** : Rust+NAPI pour les codecs ou rester en Node.js pur ?

---

## 1. État actuel — Diagnostic brutal

### 1.1 Duplication massive du code audio

**Encodeur Float32→Int16→base64 copié 5× :**

| Fichier | Lignes | Usage |
|---------|--------|-------|
| `utils/audioHelpers.ts` | 15 lignes | React app (root) |
| `packages/browser/src/runtime/VoiceManager.ts` | Méthode statique | @owllayer/browser |
| `packages/svelte/src/composables/createVoiceMode.ts` | Inline dans hook | Svelte SDK |
| `packages/vue/src/composables/useVoiceMode.ts` | Inline dans hook | Vue SDK |
| `packages/woocommerce/plugin/assets/owllayer-woocommerce.min.js` | Minifié | Plugin WooCommerce |

**Même code partout :**
```ts
const int16Array = new Int16Array(float32Array.length);
for (let i = 0; i < float32Array.length; i++) {
  let s = Math.max(-1, Math.min(1, float32Array[i]));
  int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
}
let binary = '';
const bytes = new Uint8Array(int16Array.buffer);
for (let i = 0; i < bytes.byteLength; i++) {
  binary += String.fromCharCode(bytes[i]);
}
return btoa(binary);
```

### 1.2 Formats audio supportés : ZÉRO

**Détecté dans STTService.getAudioFormat() :**
```ts
if (mimeType.includes('pcm')) return 'pcm';  // ✅ Implémenté
if (mimeType.includes('wav')) return 'wav';  // ❌ Parser manquant
if (mimeType.includes('mp3')) return 'mp3';  // ❌ Decoder manquant
if (mimeType.includes('opus')) return 'opus'; // ❌ Decoder manquant
if (mimeType.includes('webm')) return 'webm'; // ❌ Decoder manquant
if (mimeType.includes('flac')) return 'flac'; // ❌ Decoder manquant
return 'unknown';
```

**Conséquences :**
- Les providers STT (Google, OpenAI, ElevenLabs) déclarent supporter WAV/MP3/Opus
- Mais si un client envoie du Opus → `STTService` crash (Buffer non parsé)
- Besoin urgent de parsers + transcodeurs

### 1.3 Contextes audio non réutilisables

Chaque SDK crée son propre `AudioContext` + `ScriptProcessorNode` :
- `packages/browser` : VoiceManager classe complète
- `packages/svelte` : createVoiceMode hook avec AudioContext local
- `packages/vue` : useVoiceMode hook avec AudioContext local

**Problème** : Si un dev utilise React + Svelte dans la même page → **2 AudioContext** pour rien.

---

## 2. Architecture cible — Centralisation

### 2.1 Nouveau package : `@owllayer/audio`

**Responsabilités :**
1. **Encodage capture micro** : Float32→Int16→base64 (PCM)
2. **Décodage playback** : base64→Int16→Float32→AudioBuffer
3. **Parsing formats** : WAV header, MP3 frames, Opus packets, FLAC blocks, WebM container
4. **Transcoding** : Opus→PCM, MP3→PCM, FLAC→PCM (pour STT providers qui veulent du PCM)
5. **Validation** : Vérifier sample rate, channels, bit depth avant envoi serveur

**Structure du package :**
```
packages/audio/
├── src/
│   ├── index.ts                 # Exports publics
│   ├── encoders/
│   │   ├── pcm.ts               # Float32→Int16→base64
│   │   ├── wav.ts               # PCM + WAV header
│   │   └── opus.ts              # Opus encoder (via @discordjs/opus ou wasm)
│   ├── decoders/
│   │   ├── pcm.ts               # base64→Int16→Float32
│   │   ├── wav.ts               # Parse WAV header + extract PCM
│   │   ├── mp3.ts               # MP3 frame decoder (via mpg123-wasm ou minimp3)
│   │   ├── opus.ts              # Opus decoder (via opusscript ou wasm)
│   │   └── flac.ts              # FLAC decoder (via flac.wasm ou flac.js)
│   ├── formats/
│   │   └── detector.ts          # Auto-detect format from Buffer/base64
│   └── transcoder.ts            # Convert any format → PCM 16kHz mono
├── package.json
└── tsconfig.json
```

### 2.2 Intégration dans @owllayer/core

**Avant (duplication) :**
```ts
// Dans chaque SDK
const int16 = new Int16Array(pcm.length);
for (let i = 0; i < pcm.length; i++) {
  int16[i] = pcm[i] < 0 ? pcm[i] * 0x8000 : pcm[i] * 0x7FFF;
}
const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
```

**Après (centralisé) :**
```ts
import { AudioEncoder } from '@owllayer/audio';

const base64 = AudioEncoder.encodePCM(float32Array, { sampleRate: 16000 });
client.sendAudio(base64, 'audio/pcm;rate=16000');
```

**Avantages :**
- ✅ 1 seule implémentation testée
- ✅ Support multi-formats via plugins
- ✅ Facile à étendre (Opus, WebM, etc.)
- ✅ Réutilisable côté serveur (STTService transcoding)

### 2.3 API publique proposée

```ts
// packages/audio/src/index.ts

export class AudioEncoder {
  /** Encode Float32Array → PCM Int16 base64 */
  static encodePCM(samples: Float32Array, opts: { sampleRate: number }): string;
  
  /** Encode Float32Array → WAV file base64 (avec header) */
  static encodeWAV(samples: Float32Array, opts: { sampleRate: number, channels?: number }): string;
  
  /** Encode Float32Array → Opus packets base64 */
  static encodeOpus(samples: Float32Array, opts: { sampleRate: number }): Promise<string>;
}

export class AudioDecoder {
  /** Decode PCM base64 → Float32Array */
  static decodePCM(base64: string, sampleRate: number): Float32Array;
  
  /** Decode WAV base64 → Float32Array (auto-parse header) */
  static decodeWAV(base64: string): { samples: Float32Array, sampleRate: number, channels: number };
  
  /** Decode MP3 base64 → Float32Array */
  static decodeMP3(base64: string): Promise<{ samples: Float32Array, sampleRate: number }>;
  
  /** Decode Opus base64 → Float32Array */
  static decodeOpus(base64: string): Promise<Float32Array>;
  
  /** Decode FLAC base64 → Float32Array */
  static decodeFLAC(base64: string): Promise<Float32Array>;
}

export class AudioTranscoder {
  /** Convert any format → PCM 16kHz mono (pour STT) */
  static transcode(
    base64: string,
    fromFormat: 'pcm'|'wav'|'mp3'|'opus'|'flac'|'webm',
    targetSampleRate?: number
  ): Promise<{ pcm: string, sampleRate: number }>;
}

export class AudioFormatDetector {
  /** Auto-detect format from Buffer or base64 */
  static detect(data: Buffer | string): 'pcm'|'wav'|'mp3'|'opus'|'flac'|'webm'|'unknown';
  
  /** Extract metadata (sample rate, channels, duration) */
  static analyze(data: Buffer | string): AudioMetadata;
}
```

---

## 3. Rust + NAPI vs Node.js pur — Tradeoffs

### 3.1 Option A : Rust + NAPI-RS

**Stack technique :**
- `napi-rs` pour bindings Node.js
- `symphonia` (decoder universel : MP3, FLAC, WAV, Opus)
- `opus-rs` pour encodage Opus
- `minimp3` pour MP3
- `rubato` pour resampling audio

**Avantages :**
- ✅ **Performances** : 5-10× plus rapide que JS pur (surtout transcoding)
- ✅ **Mémoire** : Allocation native, pas de GC JavaScript
- ✅ **Codecs pros** : Accès à FFmpeg, libopus, libflac natives
- ✅ **Streaming** : Pas de buffer complet en RAM (chunk processing)

**Inconvénients :**
- ❌ **Complexité** : Compiler Rust pour Windows/macOS/Linux (cross-compile hell)
- ❌ **Binary size** : ~5-10MB par platform (vs <100KB JS)
- ❌ **Maintenance** : Besoin compétence Rust dans l'équipe
- ❌ **CI/CD** : Compiler natives dans GitHub Actions (Windows ARM64 = 🔥)
- ❌ **npmjs distribution** : Publier 6+ packages (`@owllayer/audio-win32-x64`, `@owllayer/audio-darwin-arm64`, etc.)

**Réalité brutale :**
- Si OwlLayer atteint 50k+ sessions audio/jour → Rust justifié
- Aujourd'hui (Sprint 5 Cloud Pro) → **overkill total**

### 3.2 Option B : Node.js pur (libs JS/WASM)

**Stack technique :**
- `wav-decoder` (WAV parsing pure JS)
- `mpg123.js` (MP3 decoder WASM — port de mpg123 C)
- `opusscript` (Opus decoder JS pur) ou `@discordjs/opus` (binding natif optionnel)
- `flac.js` (FLAC decoder WASM)

**Avantages :**
- ✅ **Zero config** : `npm install` et ça marche (pas de compilation)
- ✅ **Cross-platform** : WASM = même binaire partout
- ✅ **Maintenance simple** : Pure TypeScript + deps npm standard
- ✅ **CI/CD trivial** : Aucune compilation native
- ✅ **Bundle size** : ~200-500KB total (WASM compressé)

**Inconvénients :**
- ⚠️ **Performances** : 2-3× plus lent que Rust natif (mais WASM est rapide)
- ⚠️ **Codecs limités** : Pas accès à FFmpeg/libx264/etc. (seulement audio basique)

**Réalité pragmatique :**
- MP3 decoding via WASM : ~20-30ms pour 1MB (acceptable)
- Opus decoding JS pur : ~5-10ms par packet (OK pour real-time)
- Pour 99% des use cases OwlLayer → **largement suffisant**

### 3.3 Recommandation : Node.js pur en MVP, Rust en optimisation future

**Phase 1 (Sprint 6) — Node.js + WASM :**
```json
{
  "dependencies": {
    "wav-decoder": "^1.3.0",           // WAV parsing
    "mpg123.js": "^0.3.0",             // MP3 decoder WASM
    "opusscript": "^0.1.1",            // Opus JS pur
    "flac.js": "^0.1.5"                // FLAC WASM
  }
}
```

**Phase 2 (si performance critique) — Add optional Rust binding :**
```json
{
  "optionalDependencies": {
    "@owllayer/audio-native": "^1.0.0"    // Rust NAPI (fallback si compile OK)
  }
}
```

**Pattern de fallback :**
```ts
let decoder: AudioDecoder;
try {
  decoder = require('@owllayer/audio-native'); // Rust si dispo
} catch {
  decoder = require('@owllayer/audio-wasm');   // WASM fallback
}
```

---

## 4. Plan d'implémentation — MVP (Sprint 6)

### Sprint 6.1 — `@owllayer/audio` package (3 jours)

**Tâches :**
1. Créer `packages/audio/` avec tsup build
2. Implémenter `AudioEncoder.encodePCM()` (migrer code existant)
3. Implémenter `AudioDecoder.decodePCM()` (pour playback)
4. Implémenter `AudioFormatDetector.detect()` (magic bytes WAV/MP3/Opus)
5. Tests unitaires (Vitest) avec fixtures audio

**Livrable :**
```ts
import { AudioEncoder } from '@owllayer/audio';

const base64 = AudioEncoder.encodePCM(float32Samples, { sampleRate: 16000 });
// ✅ Même résultat que code actuel, mais centralisé
```

### Sprint 6.2 — Déduplication SDKs (2 jours)

**Modifier :**
- `packages/browser/src/runtime/VoiceManager.ts`
- `packages/svelte/src/composables/createVoiceMode.ts`
- `packages/vue/src/composables/useVoiceMode.ts`
- `utils/audioHelpers.ts` (root React app)

**Remplacer :**
```diff
- const int16 = new Int16Array(pcm.length);
- for (let i = 0; i < pcm.length; i++) { ... }
- return btoa(binary);
+ import { AudioEncoder } from '@owllayer/audio';
+ return AudioEncoder.encodePCM(pcm, { sampleRate });
```

**Impact :**
- ✅ Supprimer ~100 lignes dupliquées
- ✅ Tests centralisés dans `@owllayer/audio`
- ✅ Plus facile d'ajouter formats (WAV, Opus)

### Sprint 6.3 — WAV decoder (1 jour)

**Installer :**
```bash
pnpm add wav-decoder
```

**Implémenter :**
```ts
// packages/audio/src/decoders/wav.ts
import { decode } from 'wav-decoder';

export class WAVDecoder {
  static async decode(base64: string): Promise<AudioData> {
    const buffer = Buffer.from(base64, 'base64');
    const audioData = await decode(buffer);
    
    return {
      samples: new Float32Array(audioData.channelData[0]), // Mono channel 0
      sampleRate: audioData.sampleRate,
      channels: audioData.channelData.length,
    };
  }
}
```

**Usage dans STTService :**
```ts
// packages/server/src/speech/STTService.ts
import { AudioDecoder, AudioFormatDetector } from '@owllayer/audio';

protected async parseAudio(base64: string, mimeType: string): Promise<Float32Array> {
  const format = AudioFormatDetector.detect(base64);
  
  if (format === 'wav') {
    const { samples } = await AudioDecoder.decodeWAV(base64);
    return samples;
  }
  
  if (format === 'pcm') {
    return AudioDecoder.decodePCM(base64, this.extractSampleRate(mimeType));
  }
  
  throw new Error(`Unsupported format: ${format}`);
}
```

### Sprint 6.4 — MP3 decoder (1 jour)

**Installer :**
```bash
pnpm add mpg123.js
```

**Implémenter :**
```ts
// packages/audio/src/decoders/mp3.ts
import { MP3Decoder as WasmDecoder } from 'mpg123.js';

export class MP3Decoder {
  static async decode(base64: string): Promise<AudioData> {
    const buffer = Buffer.from(base64, 'base64');
    const decoder = new WasmDecoder();
    const { channelData, sampleRate } = await decoder.decode(buffer);
    
    return {
      samples: channelData[0], // Mono
      sampleRate,
    };
  }
}
```

### Sprint 6.5 — Opus decoder (2 jours)

**Installer :**
```bash
pnpm add opusscript
```

**Implémenter :**
```ts
// packages/audio/src/decoders/opus.ts
import OpusScript from 'opusscript';

export class OpusDecoder {
  static decode(base64: string, sampleRate = 16000): Float32Array {
    const buffer = Buffer.from(base64, 'base64');
    const decoder = new OpusScript(sampleRate, 1); // Mono
    
    const pcm = decoder.decode(buffer);
    const float32 = new Float32Array(pcm.length);
    
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 32768.0; // Int16 → Float32
    }
    
    return float32;
  }
}
```

---

## 5. Décision finale — Pragmatique

### ✅ GO pour Node.js + WASM (Sprint 6)

**Justifications :**
1. **OwlLayer Cloud Pro (Sprint 5) = priorité** → Pas de temps pour Rust
2. **Userbase actuel < 1000 utilisateurs** → Performances WASM suffisantes
3. **Maintenance simple** → Toute l'équipe connaît TypeScript
4. **CI/CD immédiat** → Zero compilation native
5. **Bundle size acceptable** → 200-500KB WASM vs 5-10MB Rust binaries

### 🔮 Rust + NAPI : Réserve pour futur (2027+)

**Conditions de déclenchement :**
- OwlLayer atteint 50k+ sessions audio/jour
- Latence transcoding devient un bottleneck (>100ms/fichier)
- Besoin encodeurs avancés (H.264, AAC, WebM muxing)

**Plan B déjà prêt** :
- Créer `packages/audio-native/` avec `napi-rs`
- Fallback pattern déjà documenté (voir section 3.3)
- Migration transparente (API reste identique)

---

## 6. Checklist — Acceptation MVP

**Sprint 6 terminé si :**
- [ ] Package `@owllayer/audio` publié sur npm
- [ ] `AudioEncoder.encodePCM()` testé (Vitest 100% couverture)
- [ ] `AudioDecoder.decodePCM()` testé
- [ ] VoiceManager, createVoiceMode, useVoiceMode utilisent `@owllayer/audio`
- [ ] Code dupliqué supprimé (0 occurrence de "for (let i = 0; i < int16.length; i++)")
- [ ] WAV decoder implémenté + testé
- [ ] MP3 decoder implémenté + testé
- [ ] Opus decoder implémenté + testé
- [ ] STTService peut parser WAV/MP3/Opus (pas seulement PCM)
- [ ] Documentation API dans README.md du package

**Bonus (si temps) :**
- [ ] FLAC decoder (via flac.js)
- [ ] WebM container parsing (via webm-parser)
- [ ] AudioTranscoder.transcode() pour resampling 24kHz→16kHz

---

## 7. Conclusion — Avis critique

**Le bon choix = Node.js + WASM** parce que :
- ✅ Sprint 5 Cloud Pro launch dans 2 semaines → Pas de temps pour Rust
- ✅ WASM est **déjà assez rapide** pour audio (Discord l'utilise en prod)
- ✅ Maintenance simplifiée (moins de dépendance compétence Rust)

**Rust serait prématuré** parce que :
- ❌ Complexité build (Windows ARM64, macOS universal, Linux musl)
- ❌ Taille binaires (~8MB vs 300KB WASM)
- ❌ Besoin équipe Rust (formation = 2-3 semaines)
- ❌ Pas de bottleneck performance **prouvé** aujourd'hui

**Le vrai problème à régler = duplication code** (pas les perfs). On peut centraliser en TypeScript en 3 jours, Rust prendrait 2 semaines + debugging CI/CD.

**Recommandation finale** : Lance Sprint 6 avec Node.js + WASM. Si dans 6 mois on voit des plaintes latence audio → on revisite Rust.
