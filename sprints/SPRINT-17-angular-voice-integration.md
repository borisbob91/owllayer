---
mode: agent
description: >
  Sprint 17 - Intégration Voice complète dans le SDK Angular.
  DomOSVoiceService abstrait tout le cycle audio (capture micro PCM16, playback streaming, barge-in).
  Parité totale avec React "Real-time Voice". Réutilisable au-delà du widget.
tools:
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
---

# Sprint 17 — Intégration Voice Complète (Audio Avancé)

**Base :** Sprint 15 livré (widget UI complète, mode audio simulé)  
**Périmètre :** `domos/packages/angular/src/lib/` — Créer DomOSVoiceService, intégrer dans WidgetInner  
**Référence :** React widget voice + plan détaillé utilisateur (barge-in, AudioWorklet, @domos/audio utilities)

---

## 🎯 Objectifs Techniques (Révisés)

1. **Abstraction Totale** : Créer un `DomOSVoiceService` qui gère le cycle de vie de l'audio sans polluer les composants UI
2. **Streaming Temps Réel** : Capture micro en chunks PCM16 16-bit et lecture fluide (Audio Scheduling)
3. **Barge-in (Interruption)** : Détection de la voix utilisateur pendant que l'agent parle → arrêt instantané playback
4. **Réactivité native** : Exposer états via Signals Angular (isRecording, isMuted, isSpeaking)
5. **SDK réutilisable** : N'importe quel dev Angular peut injecter DomOSVoiceService pour sa propre UI voice

---

## 🛠️ Technologies & Dépendances

- **Web Audio API** : AudioContext, ScriptProcessorNode (compat) ou AudioWorklet (moderne)
- **MediaDevices API** : getUserMedia pour accès micro sécurisé
- **@domos/audio** : `base64EncodeAudio()`, `decodeAudioToFloat32()` — garantit bon format PCM 16kHz/24kHz
- **VoiceStateMachine** (@domos/core) : Transitions états (idle → capturing → thinking → speaking → interrupting)
- **Angular Signals** : State reactivity pour l'UI (orb pulse, status labels)

---

## 📋 Plan d'Exécution — 5 Étapes

### Étape 1️⃣ : Créer `DomOSVoiceService` — Service Principal

**Localisation** : `packages/angular/src/lib/services/voice/DomOSVoiceService.ts`

**Responsabilités** :
- Singleton AudioContext (lazy init)
- Gestion du cycle complet : startCapture(), stopCapture(), mute(), unmute()
- Gestion file d'attente playback (buffer queue)
- Barge-in detection (RMS analysis du micro)
- Intégration VoiceStateMachine
- Signals publiques : isRecording, isMuted, isSpeaking, isPlaybackActive

```typescript
@Injectable({ providedIn: 'root' })
export class DomOSVoiceService {
  // Capture state
  isRecording = signal(false);
  isMuted = signal(false);
  
  // Playback state
  isPlaybackActive = signal(false);
  isSpeaking = signal(false);
  
  // Voice state machine
  voiceState = signal<VoiceState>('idle');
  
  // Public API
  async startCapture(): Promise<void> { ... }
  stopCapture(reason: 'user_stop' | 'vad' | 'timeout'): void { ... }
  mute(): void { ... }
  unmute(): void { ... }
  interruptPlayback(): void { ... } // For barge-in
  
  // For consumers to hook into events
  onCaptureChunk = new Subject<{ audio: string; mimeType: string }>();
  onPlaybackComplete = new Subject<void>();
  
  private voiceMachine = new VoiceStateMachine({ ... });
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Barge-in detection
  private analyser: AnalyserNode | null = null;
  private bargeinThreshold = 0.03; // RMS volume threshold
  
  // Playback queue
  private playbackQueue: AudioBuffer[] = [];
  private nextStartTime = 0;
  private playbackSources: AudioBufferSource[] = [];
}
```

**Gates** :
- ✅ Service compilable et injectable
- ✅ AudioContext created on first startCapture()
- ✅ Signals emit changes reactively
- ✅ VoiceStateMachine initialized with callbacks

---

### Étape 2️⃣ : Implémentation de la Capture (Micro)

**Dans DomOSVoiceService** :

```typescript
async startCapture(): Promise<void> {
  if (this.isRecording()) return;
  
  try {
    // 1. Request permissions & get mediaStream
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false // We control levels
      } 
    });
    
    // 2. Ensure audioContext exists
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // 3. Create capture chain
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(this.analyser);
    source.connect(processor);
    processor.connect(this.audioContext.destination);
    
    // 4. Setup chunk emission
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const float32 = e.inputBuffer.getChannelData(0);
      
      // Check for barge-in
      this.detectBargein(float32);
      
      // Encode to PCM16 base64
      const int16 = this.float32ToInt16(float32);
      const audioBase64 = base64EncodeAudio(int16, 'audio/wav');
      
      this.onCaptureChunk.next({ audio: audioBase64, mimeType: 'audio/wav' });
    };
    
    this.isRecording.set(true);
    this.voiceMachine.dispatch('START_CAPTURING');
  } catch (err) {
    console.error('Capture error:', err);
    throw err;
  }
}

stopCapture(reason: 'user_stop' | 'vad' | 'timeout' = 'user_stop'): void {
  if (!this.isRecording()) return;
  
  // Clean up mediaStream
  this.mediaStream?.getTracks().forEach(track => track.stop());
  this.mediaStream = null;
  
  // Clean up processor nodes
  // (ScriptProcessor disconnect/stop not directly exposed, but GC handles it)
  
  this.isRecording.set(false);
  this.voiceMachine.dispatch('STOP_CAPTURING');
}

private float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    int16[i] = Math.max(-1, Math.min(1, float32[i])) < 0 
      ? float32[i] * 0x8000 
      : float32[i] * 0x7FFF;
  }
  return int16;
}

private detectBargein(float32: Float32Array): void {
  if (!this.isSpeaking()) return; // Only during playback
  
  // Calculate RMS (volume)
  let sum = 0;
  for (let i = 0; i < float32.length; i++) {
    sum += float32[i] * float32[i];
  }
  const rms = Math.sqrt(sum / float32.length);
  
  if (rms > this.bargeinThreshold) {
    // User started speaking → interrupt agent
    this.interruptPlayback();
  }
}
```

**Gates** :
- ✅ Permission granted on getUserMedia
- ✅ Chunks emitted every ~100ms
- ✅ Float32 → Int16 conversion correct
- ✅ Base64 encoding via `@domos/audio`
- ✅ Barge-in RMS detection works
- ✅ stopCapture() cleans up all nodes

---

### Étape 3️⃣ : Implémentation du Playback (Haut-parleur)

**Dans DomOSVoiceService** :

```typescript
async playChunk(audioBase64: string, mimeType: string): Promise<void> {
  if (!this.audioContext) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  try {
    // 1. Decode base64 → ArrayBuffer
    const binaryString = atob(audioBase64.split(',')[1] || audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 2. Decode WAV using @domos/audio utilities
    const float32 = decodeAudioToFloat32(bytes, 'audio/wav');
    
    // 3. Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      float32.length,
      this.audioContext.sampleRate
    );
    audioBuffer.getChannelData(0).set(float32);
    
    // 4. Queue and schedule
    this.playbackQueue.push(audioBuffer);
    
    if (!this.isSpeaking()) {
      this.playNextInQueue();
    }
  } catch (err) {
    console.error('Playback error:', err);
  }
}

private playNextInQueue(): void {
  if (this.playbackQueue.length === 0) {
    this.isSpeaking.set(false);
    return;
  }
  
  const buffer = this.playbackQueue.shift()!;
  
  const source = this.audioContext!.createBufferSource();
  source.buffer = buffer;
  source.connect(this.audioContext!.destination);
  
  // Schedule with precise timing
  source.start(this.nextStartTime);
  this.nextStartTime += buffer.duration;
  
  this.isSpeaking.set(true);
  
  // Play next chunk when this one ends
  source.onended = () => {
    this.playNextInQueue();
  };
  
  this.playbackSources.push(source);
}

interruptPlayback(): void {
  // Stop all current sources
  this.playbackSources.forEach(source => {
    try { source.stop(); } catch (e) { /* already stopped */ }
  });
  this.playbackSources = [];
  
  // Clear queue
  this.playbackQueue = [];
  this.nextStartTime = this.audioContext!.currentTime;
  
  this.isSpeaking.set(false);
  this.voiceMachine.dispatch('BARGE_IN');
}
```

**Gates** :
- ✅ Base64 decode works correctly
- ✅ @domos/audio decode handles WAV
- ✅ Sequential playback with accurate timing
- ✅ No gaps or stuttering between chunks
- ✅ interruptPlayback() stops immediately
- ✅ Playback completion fires onPlaybackComplete

---

### Étape 4️⃣ : Refactorisation de WidgetInner.component.ts

**Suppressions** :
- Enlever tout code WebAudio brut (audioContext, processor, etc.)
- Enlever les stubs `startRecordingInternal()`, `playAudioChunk()`, etc.

**Modifications** :
```typescript
export class WidgetInnerComponent implements OnInit, OnDestroy {
  private domos = inject(DomOSAngularService);
  private voice = inject(DomOSVoiceService); // ← NEW
  
  // Simply bind to voice service signals
  isRecording = this.voice.isRecording;
  isSpeaking = this.voice.isSpeaking;
  isPlaybackActive = this.voice.isPlaybackActive;
  
  ngOnInit() {
    // Wire voice chunks to domos
    this.voice.onCaptureChunk.subscribe(({ audio, mimeType }) => {
      this.domos.sendAudioStream(audio, mimeType);
    });
    
    // Wire domos audio output to voice service
    this.domos.subscribeEvent('audio.output.chunk', (payload) => {
      this.voice.playChunk(payload.audioBase64, payload.mimeType);
    });
  }
  
  async setMode(mode: 'text' | 'audio') {
    if (mode === 'audio') {
      try {
        await this.voice.startCapture();
      } catch (err) {
        console.error('Capture failed, falling back to text', err);
        this.currentMode.set('text');
      }
    } else {
      this.voice.stopCapture('user_stop');
    }
    this.currentMode.set(mode);
  }
  
  ngOnDestroy() {
    this.voice.stopCapture('timeout');
  }
}
```

**Gates** :
- ✅ WidgetInner now 90% cleaner (no WebAudio code)
- ✅ Injection du service voice simple
- ✅ Text/Audio mode toggle works
- ✅ Chunks flow automatically
- ✅ Cleanup on destroy

---

### Étape 5️⃣ : Logique Barge-in Complète

**Déjà dans Étape 2 détection du micro**. Maintenant synchroniser avec le service :

```typescript
// In DomOSVoiceService
interruptPlayback(): void {
  // Stop current playback
  this.playbackSources.forEach(source => {
    try { source.stop(); } catch (e) { }
  });
  this.playbackSources = [];
  this.playbackQueue = [];
  
  // Signal server
  this.domosService.sendInterrupt();
  
  // Update state
  this.isSpeaking.set(false);
  this.voiceMachine.dispatch('BARGE_IN');
}

private detectBargein(float32: Float32Array): void {
  if (!this.isSpeaking() || this.isMuted()) return;
  
  const rms = calculateRMS(float32);
  if (rms > this.bargeinThreshold) {
    this.interruptPlayback();
  }
}
```

**Gates** :
- ✅ Barge-in detection active only during playback
- ✅ User voice detected → `domos.sendInterrupt()` called
- ✅ Playback queue cleared immediately
- ✅ VoiceStateMachine transitions to correct state

---

## 📦 Fichiers à Créer/Modifier

| Fichier | Nature | Taille (approx) |
|---|---|---|
| `packages/angular/src/lib/services/voice/DomOSVoiceService.ts` | Créer | 400 lignes |
| `packages/angular/src/lib/services/voice/index.ts` | Créer | 5 lignes |
| `packages/angular/src/lib/components/widget/WidgetInner.component.ts` | Modifier | -100 lignes (simplification) |
| `packages/angular/src/lib/components/widget/AudioOrb.component.ts` | Modifier | +30 lignes (4 states) |
| `packages/angular/src/public-api.ts` | Modifier | +1 ligne (export DomOSVoiceService) |

---

## ✅ Gates de Validation — 15 Points

- [ ] `pnpm --filter @domos/angular build` exit 0
- [ ] DomOSVoiceService injectable, AudioContext lazy-inits
- [ ] Micro permission shown, getUserMedia succeeds
- [ ] `onCaptureChunk` emits chunks every ~100ms
- [ ] Float32 → Int16 conversion correct
- [ ] Base64 encoding via @domos/audio works
- [ ] Chunks auto-send to `domos.sendAudioStream()`
- [ ] stopCapture() → `domos.sendAudioEnd(reason)` called
- [ ] `audio.output.chunk` events received from server
- [ ] Base64 decode → WAV playback works
- [ ] Sequential playback: no gaps, no overlaps, accurate timing
- [ ] Barge-in detection: RMS threshold triggers `interruptPlayback()`
- [ ] `interruptPlayback()` → `domos.sendInterrupt()` sent
- [ ] AudioOrb shows 4 states (idle/listening/thinking/speaking) with animations
- [ ] WidgetInner simplified (0 WebAudio code), only injection + wiring

---

## 🚀 Timing & Risk

- **Estimate** : 12–16 hours (3–4 dev days)
- **Complexity** : HIGH (WebAudio API, precise timing, cross-browser)
- **Risk** :
  - Safari AudioContext quirks (autoplay policy, offline context)
  - Mobile browser permissions (iOS blocks getUserMedia in some cases)
  - Timing precision (drift in next start time calculations)
- **Mitigation** :
  - Test on Chrome, Firefox, Safari (desktop + iOS)
  - Fallback to text mode if capture fails
  - RMS threshold tunable (not hardcoded)

---

## 🎯 Why This Plan is Better

1. **SDK Reusability** : Other components can `inject(DomOSVoiceService)` for custom voice UI
2. **Clean Separation** : WebAudio logic isolated from UI components
3. **Barge-in** : Key feature that makes voice feel responsive
4. **Monorepo Consistency** : Uses @domos/audio utilities
5. **Production-Ready** : State machine, error handling, cleanup

---

## 📌 Next Sprints (after 17)

- **Sprint 18** — Unit tests (VoiceCaptureService, playback timing, barge-in detection)
- **Sprint 19** — Voice optimizations (VAD auto-stop, better RMS, echo cancellation)
- **Sprint 20** — Accessibility (ARIA labels, keyboard shortcuts, screen reader support)
