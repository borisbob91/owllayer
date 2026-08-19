import {
  OwlLayerClient,
  VoiceStateMachine,
  type VoiceState,
} from '@owllayer/core';

// ============================================================
// VoiceManager — Interne @owllayer/browser
// Non exporté depuis index.ts / owllayer.core.ts
//
// Suit exactement le même pattern que useVoiceMode (React/Vue/Svelte) :
//   - Capture : getUserMedia → ScriptProcessor 4096 → Float32→Int16→base64
//   - Playback : base64→Int16→Float32 → AudioBuffer schedulé via nextStartTime
//   - VoiceStateMachine de @owllayer/core (pas de re-implémentation)
//   - Barge-in : sendInterrupt() + fermeture du contexte de lecture
//
// L'implémentation audio est isolée ici pour permettre un remplacement futur
// (ex: WebRTC/LiveKit, AudioWorklet, Opus) sans toucher BrowserOwlLayer.
// ============================================================

export interface VoiceManagerOptions {
  /** Taux d'échantillonnage de la capture micro. Défaut: 16000 (PCM 16kHz) */
  sampleRate?: number;
  /** Mode live (AUDIO_STREAM bidirectionnel). Défaut: true */
  live?: boolean;
  /** Si micro refusé (NotAllowedError), ne pas lever d'erreur. Défaut: true */
  fallbackToText?: boolean;
  /** Callback sur chaque changement d'état de la machine vocale */
  onStateChange?: (state: VoiceState) => void;
  /** Callback si l'accès micro est refusé */
  onMicDenied?: () => void;
  /** Callback quand le playback audio est reellement termine. */
  onPlaybackComplete?: () => void;
  /** Activer les logs de debug */
  debug?: boolean;
}

/**
 * VoiceManager — gestion du cycle vocal complet (capture + playback + barge-in).
 *
 * Classe interne à @owllayer/browser. Utilisée exclusivement par BrowserOwlLayer.
 * Concevoir pour être remplacée sans API publique changeante :
 * BrowserOwlLayer n'appelle que : start(), stop(), playChunk(), interrupt(), destroy().
 */
export class VoiceManager {
  private readonly client: OwlLayerClient;
  private readonly opts: {
    sampleRate: number;
    live: boolean;
    fallbackToText: boolean;
    debug: boolean;
    onStateChange?: (state: VoiceState) => void;
    onMicDenied?: () => void;
    onPlaybackComplete?: () => void;
  };

  private readonly machine: VoiceStateMachine;

  // --- Capture ---
  private mediaStream: MediaStream | null = null;
  private captureContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private keepAliveGain: GainNode | null = null;

  // --- Playback ---
  private playbackContext: AudioContext | null = null;
  private nextStartTime = 0;
  private lastSource: AudioBufferSourceNode | null = null;

  constructor(client: OwlLayerClient, options: VoiceManagerOptions = {}) {
    this.client = client;
    this.opts = {
      sampleRate: options.sampleRate ?? 16000,
      live: options.live ?? true,
      fallbackToText: options.fallbackToText ?? true,
      debug: options.debug ?? false,
      onStateChange: options.onStateChange,
      onMicDenied: options.onMicDenied,
      onPlaybackComplete: options.onPlaybackComplete,
    };

    this.machine = new VoiceStateMachine({
      onStateChange: (_from, to) => {
        this.opts.onStateChange?.(to);
      },
    });
  }

  // --- API publique minimale (seule surface utilisée par BrowserOwlLayer) ---

  async start(): Promise<void> {
    if (this.isActive()) return;

    // Barge-in : agent en train de parler → interrompre avant de recapturer
    if (this.machine.state === 'playing') {
      this.machine.dispatch('BARGE_IN');
      this.client.sendInterrupt();
      this.closePlayback();
    }

    // Réinitialiser l'horloge de séquençage pour ce nouveau tour vocal
    this.nextStartTime = 0;
    // Pré-init le contexte de lecture pendant le geste utilisateur
    // (contourne la politique autoplay des navigateurs)
    const pbCtx = this.ensurePlaybackContext();
    if (pbCtx.state === 'suspended') {
      await pbCtx.resume().catch(() => {});
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.opts.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      const isDenied = err instanceof Error && err.name === 'NotAllowedError';
      if (isDenied) {
        this.opts.onMicDenied?.();
        if (this.opts.fallbackToText) return;
      }
      this.machine.dispatch('ERROR');
      throw err;
    }

    this.mediaStream = stream;

    const captureCtx = new AudioContext({ sampleRate: this.opts.sampleRate });
    this.captureContext = captureCtx;

    if (captureCtx.state === 'suspended') {
      await captureCtx.resume();
    }

    const source = captureCtx.createMediaStreamSource(stream);
    // ScriptProcessor 4096 — même taille que les hooks React/Vue/Svelte
    const processor = captureCtx.createScriptProcessor(4096, 1, 1);
    this.processor = processor;

    // GainNode silencieux branché à destination pour maintenir le graph actif
    const keepAlive = captureCtx.createGain();
    keepAlive.gain.value = 0;
    this.keepAliveGain = keepAlive;

    const { live, sampleRate } = this.opts;

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const pcm = event.inputBuffer.getChannelData(0);
      const base64 = VoiceManager.encodeFloat32ToPcmBase64(pcm);
      const mime = `audio/pcm;rate=${sampleRate}`;

      if (live) {
        this.client.sendAudioStream(base64, mime);
      } else {
        this.client.sendAudio(base64, mime);
      }
    };

    source.connect(processor);
    processor.connect(keepAlive);
    keepAlive.connect(captureCtx.destination);

    this.machine.dispatch('START_CAPTURE');

    if (this.opts.debug) {
      console.debug('[OwlLayer/browser/voice] Capture démarrée');
    }
  }

  stop(): void {
    if (this.machine.state === 'idle') return;

    this.machine.dispatch('STOP_CAPTURE');

    // Signaler la fin du flux audio au serveur AVANT de couper le micro
    if (this.opts.live) {
      this.client.sendAudioEnd('user_stop');
    }

    this.closeCapture();

    if (this.opts.debug) {
      console.debug('[OwlLayer/browser/voice] Capture arrêtée');
    }
  }

  /**
   * Coupe le micro côté client uniquement — sans notifier le serveur.
   * La connexion WebSocket reste ouverte, le serveur continue d'attendre.
   * Utile pour un bouton mute : l'utilisateur peut reprendre avec start().
   * Contrairement à stop(), aucun VOICE_INPUT_END n'est envoyé.
   */
  muteMic(): void {
    if (this.machine.state !== 'capturing') return;

    // Fermer uniquement la capture — pas de signal serveur
    this.closeCapture();
    // Revenir à idle sans passer par STOP_CAPTURE (qui déclencherait awaiting_model)
    this.machine.reset();

    if (this.opts.debug) {
      console.debug('[OwlLayer/browser/voice] Micro coupé (mute local, serveur non notifié)');
    }
  }

  isActive(): boolean {
    return this.machine.state === 'capturing';
  }

  get state(): VoiceState {
    return this.machine.state;
  }

  /**
   * Jouer un chunk audio reçu du serveur.
   * Appelé par BrowserOwlLayer depuis le handler onAudioOutput.
   * Pattern identique à useVoiceMode (React) — scheduling via nextStartTime.
   */
  playChunk(audioBase64: string, mimeType: string): void {
    try {
      if (!audioBase64) return;

      // Transition vers 'playing' au premier chunk reçu
      this.machine.dispatch('MODEL_SPEAKING');

      // Extraire le sample rate depuis le mimeType (ex: audio/pcm;rate=24000)
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      const ctx = this.ensurePlaybackContext(outputRate);

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Décoder base64 → Int16 PCM → Float32
      const binary = atob(audioBase64);
      const validLength = binary.length - (binary.length % 2);
      const bytes = new Uint8Array(validLength);
      for (let i = 0; i < validLength; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const buffer = ctx.createBuffer(1, float32.length, outputRate);
      buffer.getChannelData(0).set(float32);

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(ctx.destination);

      // Quand ce chunk se termine, signaler TURN_COMPLETE si c'est le dernier
      sourceNode.onended = () => {
        if (sourceNode === this.lastSource) {
          this.machine.dispatch('TURN_COMPLETE');
          this.opts.onPlaybackComplete?.();
        }
      };

      // Séquencer les chunks sans superposition ni silence
      const startTime = Math.max(ctx.currentTime, this.nextStartTime);
      sourceNode.start(startTime);
      this.nextStartTime = startTime + buffer.duration;
      this.lastSource = sourceNode;

    } catch (err) {
      if (this.opts.debug) {
        console.error('[OwlLayer/browser/voice] Erreur playback:', err);
      }
    }
  }

  /**
   * Barge-in : interrompre l'agent en train de parler.
   * Coupe le playback immédiatement + notifie le serveur.
   */
  interrupt(): void {
    this.machine.dispatch('BARGE_IN');
    this.client.sendInterrupt();
    this.closePlayback();
  }

  destroy(): void {
    this.closeCapture();
    this.closePlayback();
    this.machine.reset();
  }

  // --- Helpers privés ---

  private ensurePlaybackContext(sampleRate = 24000): AudioContext {
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new AudioContext({ sampleRate });
      this.nextStartTime = 0;
    }
    return this.playbackContext;
  }

  private closeCapture(): void {
    this.processor?.disconnect();
    this.keepAliveGain?.disconnect();
    // R7: ne pas appeler close() — couper uniquement les nœuds et les pistes.
    // AudioContext.close() bloque ~256ms (flush du ScriptProcessor en cours)
    // ce qui gèle l'UI pendant la transition vers l'état "thinking".
    this.mediaStream?.getTracks().forEach(t => t.stop());

    this.processor = null;
    this.keepAliveGain = null;
    this.captureContext = null;
    this.mediaStream = null;
  }

  private closePlayback(): void {
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close().catch(() => {});
    }
    this.playbackContext = null;
    this.nextStartTime = 0;
    this.lastSource = null;
  }

  /**
   * Encoder Float32 PCM → Int16 → base64
   * Identique à utils/audioHelpers.ts mais sans dépendance externe.
   */
  private static encodeFloat32ToPcmBase64(pcm: Float32Array): string {
    const int16 = new Int16Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
