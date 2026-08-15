// ============================================================
// DomOSVoiceService — Service Angular centralisé pour l'audio voice.
//
// Responsabilités :
//   • Capture micro (getUserMedia → ScriptProcessor → PCM16 base64)
//   • Playback streaming (chunks base64 → AudioContext schedulé)
//   • Barge-in (détection RMS pendant le playback → interruption agent)
//   • Mute/Unmute (coupe l'envoi des chunks sans arrêter le micro)
//   • VoiceStateMachine (états : idle → capturing → awaiting_model → playing → interrupted)
//   • onVoiceStateEvent et onAudioOutput du client (turn_complete, interrupted)
//
// Signals publics :
//   isRecording, isMuted, isSpeaking, isPlaybackActive, voiceState
//
// Subjects RxJS publics (pour consommateurs externes) :
//   onCaptureChunk — émis à chaque chunk PCM capturé
//   onPlaybackComplete — émis quand le tour de lecture se termine
//
// Fournir ce service au niveau du composant qui l'utilise :
//   providers: [DomOSVoiceService]
// ============================================================

import { Injectable, OnDestroy, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { VoiceStateMachine, type VoiceState } from '@domos/core';
import { base64EncodeAudio } from '@owllayer/core/media/audio';
import { injectDomOS } from '../../providers/provideDomOS.js';

// Seuil RMS pour la détection de barge-in
const BARGEIN_RMS_THRESHOLD = 0.08;

@Injectable()
export class DomOSVoiceService implements OnDestroy {
  private readonly domos = injectDomOS();

  // --- Signals publics ---
  readonly isRecording = signal(false);
  readonly isMuted = signal(false);
  readonly isPlaybackActive = signal(false);
  readonly isSpeaking = signal(false);
  readonly voiceState = signal<VoiceState>('idle');

  // --- Subjects RxJS pour consommateurs externes ---
  readonly onCaptureChunk = new Subject<{ audio: string; mimeType: string }>();
  readonly onPlaybackComplete = new Subject<void>();

  // --- State machine voix ---
  private readonly voiceMachine = new VoiceStateMachine({
    onStateChange: (_from, to) => {
      this.voiceState.set(to);
      // isSpeaking reflète l'état playing de la machine
      this.isSpeaking.set(to === 'playing');
    },
  });

  // --- État capture ---
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private captureKeepAliveGain: GainNode | null = null;

  // --- État playback ---
  private playbackContext: AudioContext | null = null;
  private playbackNextStartTime = 0;
  private playbackCompletionTimer: ReturnType<typeof setTimeout> | null = null;
  private playbackSources = new Set<AudioBufferSourceNode>();

  // Unsubscribe onAudioOutput du client
  private readonly unsubAudioOutput: VoidFunction;

  constructor() {
    // Abonnement aux chunks audio sortants du modèle
    this.unsubAudioOutput = this.domos.onAudioOutput((audioBase64, mimeType) => {
      this.playChunk(audioBase64, mimeType);
    });

    // Abonnement aux événements d'état vocal du serveur
    this.domos.client.on({
      onVoiceStateEvent: (event) => {
        if (event === 'turn_complete' || event === 'waiting_for_input') {
          this.completePlaybackTurn();
        }
        if (event === 'interrupted') {
          this.stopPlaybackInternal();
          if (this.voiceMachine.state === 'playing') {
            this.voiceMachine.dispatch('BARGE_IN');
          }
        }
      },
    });
  }

  ngOnDestroy(): void {
    this.stopCapture('user_stop', false);
    this.closeCaptureContext();
    this.stopPlaybackInternal();
    this.closePlaybackContext();
    this.unsubAudioOutput();
    this.onCaptureChunk.complete();
    this.onPlaybackComplete.complete();
  }

  // ============================================================
  // API publique — Capture
  // ============================================================

  async startCapture(): Promise<void> {
    if (this.isRecording()) return;

    // Initialiser le contexte de playback en avance (R5 — resume avant scheduling)
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
    }
    this.playbackNextStartTime = 0;
    if (this.playbackContext.state === 'suspended') {
      await this.playbackContext.resume();
    }

    // Interrompre le playback en cours si l'agent parle (barge-in manuel)
    if (this.isPlaybackActive() || this.domos.state() === 'speaking') {
      if (this.voiceMachine.state === 'playing') {
        this.voiceMachine.dispatch('BARGE_IN');
      }
      this.domos.sendInterrupt();
      this.stopPlaybackInternal();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    }).catch(() => {
      throw new Error('Microphone access denied');
    });

    this.mediaStream = stream;

    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.captureKeepAliveGain = this.audioContext.createGain();
    this.captureKeepAliveGain.gain.value = 0;

    this.processor.onaudioprocess = (event) => {
      const pcmData = event.inputBuffer.getChannelData(0);

      // Détection barge-in (active pendant le playback uniquement)
      this.detectBargein(pcmData);

      // Encodage PCM16 base64 via @domos/audio
      const audioBase64 = base64EncodeAudio(pcmData);

      // Notifier les consommateurs externes
      this.onCaptureChunk.next({ audio: audioBase64, mimeType: 'audio/pcm;rate=16000' });

      // Envoi au serveur (bloqué si muté)
      if (!this.isMuted()) {
        this.domos.sendAudioStream(audioBase64, 'audio/pcm;rate=16000');
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.captureKeepAliveGain);
    this.captureKeepAliveGain.connect(this.audioContext.destination);

    if (this.voiceMachine.state === 'error' || this.voiceMachine.state === 'awaiting_model') {
      this.voiceMachine.reset();
    }
    if (this.voiceMachine.state === 'idle' || this.voiceMachine.state === 'interrupted') {
      this.voiceMachine.dispatch('START_CAPTURE');
    }

    this.isRecording.set(true);
  }

  stopCapture(reason: Parameters<typeof this.domos.sendAudioEnd>[0] = 'user_stop', notifyServer = true): void {
    if (notifyServer && this.isRecording()) {
      this.domos.sendAudioEnd(reason);
    }

    if (this.voiceMachine.state === 'capturing') {
      this.voiceMachine.dispatch('STOP_CAPTURE');
    }

    if (this.processor) {
      this.processor.onaudioprocess = null;
    }
    this.processor?.disconnect();
    this.captureKeepAliveGain?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());

    this.processor = null;
    this.captureKeepAliveGain = null;
    this.mediaStream = null;
    this.isRecording.set(false);
  }

  // ============================================================
  // API publique — Mute / Unmute
  // L'entrée micro reste active (barge-in fonctionne toujours),
  // seul l'envoi des chunks au serveur est coupé.
  // ============================================================

  mute(): void {
    this.isMuted.set(true);
  }

  unmute(): void {
    this.isMuted.set(false);
  }

  // ============================================================
  // API publique — Playback
  // ============================================================

  playChunk(audioBase64: string, mimeType: string): void {
    try {
      if (!audioBase64) return;

      // Transitions VoiceStateMachine vers l'état playing
      if (this.voiceMachine.state === 'capturing') {
        this.voiceMachine.dispatch('STOP_CAPTURE');
      } else if (this.voiceMachine.state === 'idle' || this.voiceMachine.state === 'interrupted') {
        this.voiceMachine.reset();
        this.voiceMachine.dispatch('START_CAPTURE');
        this.voiceMachine.dispatch('STOP_CAPTURE');
      }
      if (this.voiceMachine.state === 'awaiting_model') {
        this.voiceMachine.dispatch('MODEL_SPEAKING');
      }

      const rateMatch = mimeType.match(/rate=(\d+)/);
      const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      if (!this.playbackContext || this.playbackContext.state === 'closed') {
        this.playbackContext = new AudioContext({ sampleRate: outputRate });
        this.playbackNextStartTime = 0;
      }

      const ctx = this.playbackContext;
      // R5 — résumer le contexte suspendu avant de planifier
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Décodage PCM16 base64 → Float32
      // R3 — validLength pair pour éviter les chunks impairs corrompus
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

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      this.playbackSources.add(source);
      source.onended = () => {
        this.playbackSources.delete(source);
      };

      // R6 — séquencer via nextStartTime, pas de source.start(0) direct
      const startTime = Math.max(ctx.currentTime, this.playbackNextStartTime);
      source.start(startTime);
      this.playbackNextStartTime = startTime + buffer.duration;

      this.isPlaybackActive.set(true);
      this.schedulePlaybackCompletion(ctx);
    } catch (err) {
      console.error('Erreur lecture audio:', err);
    }
  }

  // ============================================================
  // API publique — Barge-in (interruption manuelle ou automatique)
  // ============================================================

  interruptPlayback(): void {
    if (this.voiceMachine.state === 'playing') {
      this.voiceMachine.dispatch('BARGE_IN');
    }
    this.domos.sendInterrupt();
    this.stopPlaybackInternal();
  }

  // ============================================================
  // Privé — Détection barge-in par RMS
  // ============================================================

  private detectBargein(pcmData: Float32Array): void {
    // Actif uniquement pendant le playback et si non muté
    if (!this.isPlaybackActive() || this.isMuted()) return;

    let sumSquares = 0;
    for (let i = 0; i < pcmData.length; i++) {
      sumSquares += pcmData[i] * pcmData[i];
    }
    const rms = Math.sqrt(sumSquares / pcmData.length);

    if (rms >= BARGEIN_RMS_THRESHOLD) {
      this.interruptPlayback();
    }
  }

  // ============================================================
  // Privé — Gestion fin de tour playback
  // ============================================================

  private schedulePlaybackCompletion(ctx: AudioContext): void {
    if (this.playbackCompletionTimer) {
      clearTimeout(this.playbackCompletionTimer);
    }
    const remainingMs = Math.max(0, (this.playbackNextStartTime - ctx.currentTime) * 1000) + 32;
    this.playbackCompletionTimer = setTimeout(() => {
      this.completePlaybackTurn();
    }, remainingMs);
  }

  private completePlaybackTurn(): void {
    if (this.playbackCompletionTimer) {
      clearTimeout(this.playbackCompletionTimer);
      this.playbackCompletionTimer = null;
    }
    this.isPlaybackActive.set(false);
    this.playbackNextStartTime = 0;

    if (this.voiceMachine.state === 'playing') {
      this.voiceMachine.dispatch('TURN_COMPLETE');
    }
    this.onPlaybackComplete.next();
  }

  private stopPlaybackInternal(): void {
    if (this.playbackCompletionTimer) {
      clearTimeout(this.playbackCompletionTimer);
      this.playbackCompletionTimer = null;
    }
    this.isPlaybackActive.set(false);
    this.isSpeaking.set(false);
    this.playbackNextStartTime = 0;

    // R7 — ne pas appeler AudioContext.close() pour éviter le gel ~256ms
    // Déconnecter les nœuds seulement — le contexte reste ouvert
    if (this.playbackSources.size > 0) {
      for (const source of this.playbackSources) {
        try {
          source.stop();
        } catch {
          // no-op
        }
        try {
          source.disconnect();
        } catch {
          // no-op
        }
      }
      this.playbackSources.clear();
    }
  }

  private closeCaptureContext(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    this.audioContext = null;
  }

  private closePlaybackContext(): void {
    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close().catch(() => {});
    }
    this.playbackContext = null;
  }
}
