import { writable } from 'svelte/store';
import { sendAudio, sendAudioStream, sendAudioEnd, sendInterrupt, onAudioOutput, agentState } from '../stores/domos.store.js';
import { VoiceStateMachine, type VoiceState } from '@domos/core';

/**
 * createVoiceMode - Activer le micro et streamer l'audio vers l'agent.
 *
 * Supporte deux modes :
 * - `live: false` (defaut) : envoie USER_INPUT audio (STT cote serveur puis LLM texte)
 * - `live: true` : envoie AUDIO_STREAM (mode Gemini Live, audio natif bidirectionnel)
 *
 * En mode live, l'audio recu de l'agent est automatiquement joue
 * via le Web Audio API.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createVoiceMode } from '@domos/svelte';
 *   const { isRecording, startRecording, stopRecording } = createVoiceMode({ live: true });
 * </script>
 *
 * <button on:click={() => $isRecording ? stopRecording() : startRecording()}>
 *   {$isRecording ? 'Arreter' : 'Parler'}
 * </button>
 * ```
 */
export function createVoiceMode(options?: {
  sampleRate?: number;
  live?: boolean;
  onTranscript?: (text: string) => void;
}) {
  const isRecording = writable(false);
  const isMuted = writable(false);
  const voiceState = writable<VoiceState>('idle');
  const voiceMachine = new VoiceStateMachine({
    onStateChange: (_from, to) => { voiceState.set(to); },
  });

  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let captureKeepAliveGain: GainNode | null = null;
  let playbackContext: AudioContext | null = null;
  let nextStartTime = 0;
  let unsubscribeAudioOutput: (() => void) | null = null;

  const sampleRate = options?.sampleRate || 16000;
  const live = options?.live || false;

  // En mode live, brancher le callback de lecture audio
  if (live) {
    unsubscribeAudioOutput = onAudioOutput((audioBase64: string, mimeType: string) => {
      playAudioChunk(audioBase64, mimeType);
    });
  }

  /**
   * Jouer un chunk audio PCM base64 recu du serveur.
   */
  function playAudioChunk(audioBase64: string, mimeType: string) {
    try {
      if (!audioBase64) return;

      // Transition vers 'playing' au premier chunk audio recu
      voiceMachine.dispatch('MODEL_SPEAKING');

      // Extraire le sample rate du mimeType (ex: audio/pcm;rate=24000)
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      // Creer le contexte de playback si necessaire
      if (!playbackContext || playbackContext.state === 'closed') {
        playbackContext = new AudioContext({ sampleRate: outputRate });
        nextStartTime = 0;
      }

      const ctx = playbackContext;

      if (ctx.state === 'suspended') {
        void ctx.resume().catch((err) => {
          console.error('Impossible de reprendre le contexte audio de sortie:', err);
        });
      }

      // Decoder base64 â†’ Int16 PCM â†’ Float32
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

      // Creer un AudioBuffer et le jouer
      const buffer = ctx.createBuffer(1, float32.length, outputRate);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime, nextStartTime);
      source.start(startTime);
      nextStartTime = startTime + buffer.duration;
    } catch (err) {
      console.error('Erreur lecture audio:', err);
    }
  }

  async function startRecording() {
    if (getRecordingState()) return;

    try {
      // Barge-in : si l'agent parle, interrompre la lecture et signaler
    if (live) {
      let currentState: string = 'disconnected';
      const unsub = agentState.subscribe((s) => { currentState = s; });
      unsub();
      if (currentState === 'speaking') {
        voiceMachine.dispatch('BARGE_IN');
        sendInterrupt();
        if (playbackContext && playbackContext.state !== 'closed') {
          playbackContext.close().catch(() => {});
        }
        playbackContext = null;
        nextStartTime = 0;
      }
    }

    if (!playbackContext || playbackContext.state === 'closed') {
      playbackContext = new AudioContext({ sampleRate: 24000 });
    }
    nextStartTime = 0;
    if (playbackContext.state === 'suspended') {
      await playbackContext.resume();
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate, channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    mediaStream = stream;
    audioContext = new AudioContext({ sampleRate });
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    const source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    captureKeepAliveGain = audioContext.createGain();
    captureKeepAliveGain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      const pcm = event.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) {
        const s = Math.max(-1, Math.min(1, pcm[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

      // Envoyer au serveur â€” mode Live ou mode texte
      const mime = `audio/pcm;rate=${sampleRate}`;
      if (live) {
        sendAudioStream(btoa(binary), mime);
      } else {
        sendAudio(btoa(binary), mime);
      }
    };

    source.connect(processor);
    processor.connect(captureKeepAliveGain);
    captureKeepAliveGain.connect(audioContext.destination);

    voiceMachine.dispatch('START_CAPTURE');
    isRecording.set(true);
    } catch (err) {
      voiceMachine.dispatch('ERROR');
      console.error('Erreur micro:', err);
    }
  }

  function stopRecording() {
    voiceMachine.dispatch('STOP_CAPTURE');

    // Signaler la fin du flux audio au serveur AVANT de couper le micro
    if (live) {
      sendAudioEnd('user_stop');
    }

    processor?.disconnect();
    captureKeepAliveGain?.disconnect();
    if (audioContext) {
      void audioContext.close().catch(() => {});
    }
    mediaStream?.getTracks().forEach((t) => t.stop());
    processor = null;
    captureKeepAliveGain = null;
    audioContext = null;
    mediaStream = null;
    isRecording.set(false);
    isMuted.set(false);

    // Fermer le contexte de playback pour rÃ©initialiser nextStartTime Ã  la session suivante
    nextStartTime = 0;
  }

  /**
   * Coupe le micro localement sans notifier le serveur.
   * La session WebSocket reste ouverte. Appeler startRecording() pour reprendre.
   */
  function muteMic() {
    if (!getRecordingState() || getMutedState()) return;
    mediaStream?.getTracks().forEach((t) => { t.enabled = false; });
    isMuted.set(true);
  }

  function unmuteMic() {
    if (!getMutedState()) return;
    mediaStream?.getTracks().forEach((t) => { t.enabled = true; });
    isMuted.set(false);
  }

  function getRecordingState(): boolean {
    let current = false;
    const unsubscribe = isRecording.subscribe((value) => {
      current = value;
    });
    unsubscribe();
    return current;
  }

  function getMutedState(): boolean {
    let current = false;
    const unsubscribe = isMuted.subscribe((value) => {
      current = value;
    });
    unsubscribe();
    return current;
  }

  function destroy() {
    unsubscribeAudioOutput?.();
    unsubscribeAudioOutput = null;
    stopRecording();
    if (playbackContext && playbackContext.state !== 'closed') {
      void playbackContext.close().catch(() => {});
    }
    playbackContext = null;
  }

  return { isRecording, isMuted, voiceState, startRecording, stopRecording, muteMic, unmuteMic, playAudioChunk, destroy };
}

