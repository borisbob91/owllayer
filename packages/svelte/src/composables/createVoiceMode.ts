import { writable } from 'svelte/store';
import { sendAudio, sendAudioStream, onAudioOutput } from '../stores/domos.store.js';

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
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let captureKeepAliveGain: GainNode | null = null;
  let playbackContext: AudioContext | null = null;
  let nextStartTime = 0;

  const sampleRate = options?.sampleRate || 16000;
  const live = options?.live || false;

  // En mode live, brancher le callback de lecture audio
  if (live) {
    onAudioOutput((audioBase64: string, mimeType: string) => {
      playAudioChunk(audioBase64, mimeType);
    });
  }

  /**
   * Jouer un chunk audio PCM base64 recu du serveur.
   */
  function playAudioChunk(audioBase64: string, mimeType: string) {
    try {
      if (!audioBase64) return;

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

      // Decoder base64 → Int16 PCM → Float32
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

    if (!playbackContext || playbackContext.state === 'closed') {
      playbackContext = new AudioContext({ sampleRate: 24000 });
      nextStartTime = 0;
    }
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

      // Envoyer au serveur — mode Live ou mode texte
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
    isRecording.set(true);
  }

  function stopRecording() {
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
  }

  function getRecordingState(): boolean {
    let current = false;
    const unsubscribe = isRecording.subscribe((value) => {
      current = value;
    });
    unsubscribe();
    return current;
  }

  function destroy() {
    stopRecording();
    playbackContext?.close();
    playbackContext = null;
  }

  return { isRecording, startRecording, stopRecording, playAudioChunk, destroy };
}
