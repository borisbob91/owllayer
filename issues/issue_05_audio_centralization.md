# Issue #05 : Audio Centralization & Multi-Format Support

**Statut** : 🟡 Planifié (Sprint 6)  
**Priorité** : 🟠 Moyenne-Haute (tech debt bloquant + extensibilité)  
**Complexité** : Moyenne  
**Composants affectés** : `@domos/audio` (nouveau), `@domos/core`, `@domos/browser`, `@domos/server`, `@domos/react`, `@domos/vue`, `@domos/svelte`, `packages/woocommerce`

---

## 📋 Description du problème

### Contexte

Le code d'encodage/décodage audio est **dupliqué dans 5+ endroits** du codebase :
- `utils/audioHelpers.ts` (React app root)
- `packages/browser/src/runtime/VoiceManager.ts`
- `packages/svelte/src/composables/createVoiceMode.ts`
- `packages/vue/src/composables/useVoiceMode.ts`
- `packages/woocommerce/plugin/assets/domos-woocommerce.min.js`

Le même code de conversion **Float32→Int16→base64** est copié-collé partout (~15 lignes identiques).

De plus, `STTService.getAudioFormat()` déclare supporter **WAV, MP3, Opus, FLAC, WebM** mais **aucun parser/decoder n'existe**. Seul PCM brut fonctionne.

### Symptômes observés

1. **Duplication massive** : Le même bug doit être fixé dans 5 fichiers
2. **Formats non supportés** : Si un client envoie du WAV/MP3/Opus → crash ou silent failure
3. **Maintenance impossible** : Ajouter un format (ex: Opus) = modifier 5+ endroits
4. **Tests fragmentés** : Aucun test centralisé, chaque SDK teste (ou non) sa version locale
5. **Bundle size** : Chaque SDK embarque son propre code audio (~500 bytes × 5 = 2.5KB dupliqué)

### Impact

1. **Tech debt critique** : Impossible d'évoluer proprement (nouveau format = réécrire partout)
2. **Bugs silencieux** : Les providers STT/TTS annoncent WAV/MP3 support mais ça ne marche pas
3. **Expérience développeur dégradée** : Copier-coller du code audio = risque d'erreur
4. **Bloque adoption** : Certains clients veulent envoyer du Opus (codec moderne, 10× plus léger que PCM)

---

## 🔍 Analyse technique

### Code dupliqué actuel

**Exemple de duplication (×5 dans le codebase) :**

```ts
// Même code dans 5 fichiers différents
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

**Fichiers concernés :**
- `utils/audioHelpers.ts` : fonction `base64EncodeAudio()`
- `packages/browser/src/runtime/VoiceManager.ts` : méthode statique `encodeFloat32ToPcmBase64()`
- `packages/svelte/src/composables/createVoiceMode.ts` : inline dans `processor.onaudioprocess`
- `packages/vue/src/composables/useVoiceMode.ts` : inline dans `processor.onaudioprocess`
- `packages/woocommerce/plugin/assets/domos-woocommerce.min.js` : version minifiée

### Formats audio annoncés mais non implémentés

**Dans `packages/server/src/speech/STTService.ts` :**

```ts
protected getAudioFormat(mimeType: string): string {
  if (mimeType.includes('pcm')) return 'pcm';   // ✅ Fonctionne
  if (mimeType.includes('wav')) return 'wav';   // ❌ Parser manquant
  if (mimeType.includes('mp3')) return 'mp3';   // ❌ Decoder manquant
  if (mimeType.includes('opus')) return 'opus'; // ❌ Decoder manquant
  if (mimeType.includes('webm')) return 'webm'; // ❌ Decoder manquant
  if (mimeType.includes('flac')) return 'flac'; // ❌ Decoder manquant
  return 'unknown';
}
```

**Conséquence :** Si un client envoie `audio/wav` → STTService reçoit le Buffer brut mais ne peut pas l'interpréter → crash ou transcription vide.

### Providers déclarant des formats non gérés

**`packages/server/src/speech/providers/OpenAITTS.ts` :**
```ts
format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
```

**`packages/server/src/speech/providers/ElevenLabsTTS.ts` :**
```ts
outputFormat?: 'mp3_44100_128' | 'pcm_16000' | 'pcm_22050' | ...
```

**Mais** : Aucun transcoding PCM↔MP3, PCM↔Opus n'existe. Si ElevenLabs retourne du MP3, le client browser ne peut pas le lire (AudioContext attend du PCM).

---

## 🎯 Solution proposée

### Architecture cible : Package `@domos/audio`

Créer un nouveau package centralisé gérant **tous les formats audio** :

```
packages/audio/
├── src/
│   ├── index.ts                  # Exports publics
│   ├── encoders/
│   │   ├── pcm.ts                # Float32→Int16→base64 (actuel)
│   │   ├── wav.ts                # PCM + WAV header
│   │   └── opus.ts               # Opus encoder (opusscript)
│   ├── decoders/
│   │   ├── pcm.ts                # base64→Int16→Float32
│   │   ├── wav.ts                # Parse WAV header + extract PCM
│   │   ├── mp3.ts                # MP3 decoder (mpg123.js WASM)
│   │   ├── opus.ts               # Opus decoder (opusscript)
│   │   └── flac.ts               # FLAC decoder (flac.js WASM)
│   ├── formats/
│   │   └── detector.ts           # Auto-detect format from magic bytes
│   └── transcoder.ts             # Convert any format → PCM 16kHz mono
├── package.json
└── tsconfig.json
```

### API publique

```ts
// Encodage (capture micro → serveur)
import { AudioEncoder } from '@domos/audio';

const base64 = AudioEncoder.encodePCM(float32Array, { sampleRate: 16000 });
client.sendAudio(base64, 'audio/pcm;rate=16000');
```

```ts
// Décodage (serveur → playback client)
import { AudioDecoder } from '@domos/audio';

const samples = AudioDecoder.decodePCM(base64, 24000);
const audioBuffer = context.createBuffer(1, samples.length, 24000);
audioBuffer.getChannelData(0).set(samples);
```

```ts
// Parsing formats complexes
import { AudioDecoder, AudioFormatDetector } from '@domos/audio';

const format = AudioFormatDetector.detect(base64); // 'wav' | 'mp3' | 'opus' | ...
const { samples, sampleRate } = await AudioDecoder.decodeWAV(base64);
```

```ts
// Transcoding (pour STT providers qui veulent du PCM)
import { AudioTranscoder } from '@domos/audio';

const { pcm, sampleRate } = await AudioTranscoder.transcode(
  base64,
  'mp3',
  16000 // target sample rate
);
```

### Stack technique : Node.js + WASM (pas Rust)

**Dépendances choisies :**
```json
{
  "dependencies": {
    "wav-decoder": "^1.3.0",      // WAV parsing (JS pur)
    "mpg123.js": "^0.3.0",         // MP3 decoder (WASM port de mpg123 C)
    "opusscript": "^0.1.1",        // Opus decoder (JS pur)
    "flac.js": "^0.1.5"            // FLAC decoder (WASM)
  }
}
```

**Pourquoi WASM et pas Rust + NAPI ?**

| Critère | Rust + NAPI | Node.js + WASM | Décision |
|---------|-------------|----------------|----------|
| Setup | Cross-compile 6 platforms | `npm install` | ✅ WASM |
| Performance | 5-10× plus rapide | 2-3× plus lent que natif | ✅ WASM suffisant |
| Bundle size | 8-10MB binaries | 200-500KB WASM | ✅ WASM |
| Maintenance | Compétence Rust requise | Pure TypeScript | ✅ WASM |
| CI/CD | napi-rs + GitHub Actions matrix | Zero config | ✅ WASM |
| Production-ready | Oui (Discord, Figma) | Oui (WhatsApp Web, Zoom) | ✅ Les deux OK |

**Verdict** : WASM est **largement suffisant** pour DomOS actuel (< 1000 users). Rust sera justifié si on dépasse 50k sessions audio/jour.

---

## 📝 Plan d'implémentation (Sprint 6)

### Phase 1 : Créer `@domos/audio` (3 jours)

**Tâches :**
- [ ] Créer `packages/audio/` avec tsup build config
- [ ] Implémenter `AudioEncoder.encodePCM()` (migrer code existant)
- [ ] Implémenter `AudioDecoder.decodePCM()` (pour playback)
- [ ] Implémenter `AudioFormatDetector.detect()` (magic bytes)
- [ ] Tests unitaires Vitest (100% coverage sur encoders/decoders)
- [ ] Publier `@domos/audio@0.1.0` en local workspace

**Livrable :**
```bash
pnpm --filter @domos/audio test  # ✅ 100% pass
pnpm --filter @domos/audio build # ✅ dist/ généré
```

### Phase 2 : Déduplication SDKs (2 jours)

**Modifier :**
- [ ] `packages/browser/src/runtime/VoiceManager.ts`
- [ ] `packages/svelte/src/composables/createVoiceMode.ts`
- [ ] `packages/vue/src/composables/useVoiceMode.ts`
- [ ] `utils/audioHelpers.ts` (root React app)
- [ ] `packages/woocommerce/plugin/build.ts` (bundle `@domos/audio`)

**Pattern de migration :**
```diff
- const int16 = new Int16Array(pcm.length);
- for (let i = 0; i < pcm.length; i++) {
-   int16[i] = pcm[i] < 0 ? pcm[i] * 0x8000 : pcm[i] * 0x7FFF;
- }
- const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));
+ import { AudioEncoder } from '@domos/audio';
+ const base64 = AudioEncoder.encodePCM(pcm, { sampleRate: 16000 });
```

**Impact :**
- ✅ Supprimer ~100 lignes dupliquées
- ✅ Tests centralisés (plus besoin de tester dans chaque SDK)
- ✅ Un seul endroit à modifier pour ajouter formats

### Phase 3 : WAV decoder (1 jour)

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
      samples: new Float32Array(audioData.channelData[0]),
      sampleRate: audioData.sampleRate,
      channels: audioData.channelData.length,
    };
  }
}
```

**Usage dans STTService :**
```ts
// packages/server/src/speech/STTService.ts
import { AudioDecoder, AudioFormatDetector } from '@domos/audio';

protected async parseAudio(base64: string, mimeType: string) {
  const format = AudioFormatDetector.detect(base64);
  
  if (format === 'wav') {
    return await AudioDecoder.decodeWAV(base64);
  }
  
  if (format === 'pcm') {
    return AudioDecoder.decodePCM(base64, this.extractSampleRate(mimeType));
  }
  
  throw new SpeechServiceError(`Unsupported format: ${format}`, this.name);
}
```

**Tests :**
- [ ] Fixture `test/fixtures/sample_16khz_mono.wav`
- [ ] Test parsing header (sample rate, channels, bit depth)
- [ ] Test extraction PCM samples
- [ ] Test error sur fichier corrompu

### Phase 4 : MP3 decoder (1 jour)

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

**Tests :**
- [ ] Fixture `test/fixtures/sample_16khz_mono.mp3`
- [ ] Test MP3 frame decoding
- [ ] Test variable bitrate (VBR) support
- [ ] Test error handling sur MP3 invalide

### Phase 5 : Opus decoder (2 jours)

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

**Tests :**
- [ ] Fixture `test/fixtures/sample_16khz_mono.opus`
- [ ] Test Opus packet decoding
- [ ] Test multi-rate support (8kHz, 16kHz, 24kHz, 48kHz)
- [ ] Test packet loss handling

### Phase 6 : FLAC decoder (optionnel, 1 jour)

**Installer :**
```bash
pnpm add flac.js
```

**Implémenter similaire à MP3/Opus**

**Tests similaires**

### Phase 7 : Documentation & publication (1 jour)

- [ ] README.md du package avec exemples
- [ ] API docs (TypeDoc)
- [ ] Guide de migration pour devs externes
- [ ] Changelog
- [ ] Publier `@domos/audio@1.0.0` sur npm (ou registry privé)

---

## ✅ Critères d'acceptation

**Sprint 6 terminé si :**
- [ ] Package `@domos/audio` publié et utilisable
- [ ] `AudioEncoder.encodePCM()` remplace toutes les implémentations dupliquées
- [ ] Code copié-collé supprimé (0 occurrence manuelle de "for (let i = 0; i < int16.length; i++)")
- [ ] VoiceManager, createVoiceMode, useVoiceMode utilisent `@domos/audio`
- [ ] STTService peut parser WAV, MP3, Opus (pas seulement PCM)
- [ ] Tests Vitest : 100% coverage sur encoders + 90%+ sur decoders
- [ ] Documentation README.md complète avec exemples
- [ ] CI passe sur toutes les platforms (Linux, macOS, Windows)

**Bonus (si temps) :**
- [ ] FLAC decoder implémenté
- [ ] WebM container parsing
- [ ] AudioTranscoder.transcode() pour resampling
- [ ] Benchmark performance (JS vs WASM vs natif)

---

## 🚫 Scope exclu (hors Sprint 6)

**Pas dans cette issue :**
- ❌ Rust + NAPI bindings (trop complexe, non justifié actuellement)
- ❌ Encodeurs avancés (H.264, AAC, WebM muxing) → Sprint futur si besoin
- ❌ Streaming chunked (traiter audio par packets) → optimisation future
- ❌ Support WebCodecs API (browser-only, pas Node.js) → Sprint 7
- ❌ Migration AudioWorklet (remplacer ScriptProcessor) → Issue séparée existante

---

## 🔗 Issues liées

- `migrate-script-processor-to-audio-worklet.md` : Migration vers AudioWorklet (dépendra de `@domos/audio`)
- `issue_04_gemini_live_voice_architecture.md` : Architecture vocale (bénéficiera des nouveaux formats)

---

## 🎯 Impact attendu

### Après Sprint 6

**Code quality :**
- ✅ -100 lignes dupliquées supprimées
- ✅ Tests centralisés (1× au lieu de 5×)
- ✅ Maintenabilité ++

**Fonctionnalités :**
- ✅ Support WAV, MP3, Opus, FLAC côté serveur (STTService)
- ✅ Clients peuvent envoyer Opus (codec moderne, 10× plus léger que PCM)
- ✅ Providers TTS peuvent retourner MP3 (ElevenLabs, OpenAI)

**Performance :**
- ⚠️ Légèrement plus lent que natif (~5-10ms overhead WASM)
- ✅ Mais bundle size réduit (pas de Rust binaries 8MB)
- ✅ Zero config (npm install sans compilation native)

**Developer experience :**
- ✅ API claire et documentée
- ✅ Facile d'ajouter un nouveau format (1 fichier dans `decoders/`)
- ✅ Tests reproductibles (fixtures audio versionnées)

---

## 📊 Métriques de succès

**Avant Sprint 6 :**
- Formats audio supportés : 1 (PCM uniquement)
- Lignes de code dupliquées : ~100 lignes
- Tests audio : Fragmentés dans 5 packages
- Temps pour ajouter un format : ~2 jours (modifier 5+ endroits)

**Après Sprint 6 :**
- Formats audio supportés : 4-5 (PCM, WAV, MP3, Opus, optionnel FLAC)
- Lignes de code dupliquées : 0
- Tests audio : Centralisés dans `@domos/audio`
- Temps pour ajouter un format : ~2 heures (1 fichier dans `decoders/`)

---

## 💡 Notes additionnelles

### Pourquoi pas Rust maintenant ?

**Conditions pour justifier Rust + NAPI :**
1. DomOS atteint >50k sessions audio/jour
2. Latence transcoding devient un bottleneck (>100ms mesurés)
3. Besoin codecs lourds (H.264, AAC, WebM muxing)

**Aujourd'hui (Mars 2026) :**
- Userbase < 1000 utilisateurs
- Aucune métrique prouvant que WASM est trop lent
- Sprint 5 Cloud Pro launch prioritaire (pas de temps pour Rust)

**Plan B déjà prévu** :
- Si un jour performance critique → créer `@domos/audio-native` (Rust)
- Fallback pattern transparent (essayer natif, sinon WASM)
- API reste identique (migration invisible pour devs)

### Références techniques

**Libs WASM utilisées :**
- `mpg123.js` : Port WASM de mpg123 (decoder MP3 C mature)
- `flac.js` : Port WASM de libflac
- `opusscript` : Implémentation JS pure Opus (pas de binding)

**Benchmarks disponibles :**
- MP3 decoding WASM : ~20-30ms pour 1MB audio
- Opus decoding JS : ~5-10ms par packet (acceptable real-time)
- PCM encoding JS : ~1-2ms pour 4096 samples (négligeable)

**Discord utilise WASM audio** en production (Opus decoder) → preuve de maturité.

---

**Créé le** : 31 mars 2026  
**Assigné à** : À déterminer (Sprint 6 planning)  
**Epic** : Sprint 6 - Audio + LLM Adapters  
**Estimation** : 10 jours dev + 2 jours QA
