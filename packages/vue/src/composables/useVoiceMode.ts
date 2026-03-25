import { ref, onUnmounted, watch } from 'vue';
import { useAgent } from './useAgent.js';
import { VoiceStateMachine, type VoiceState } from '@domos/core';

/**
 * useVoiceMode - Activer le micro et streamer l'audio vers l'agent.
 *
 * Supporte deux modes :
 * - `live: false` (defaut) : envoie USER_INPUT audio (STT cote serveur puis LLM texte)
 * - `live: true` : envoie AUDIO_STREAM (mode Gemini Live, audio natif bidirectionnel)
 *
 * En mode live, l'audio recu de l'agent est automatiquement joue
 * via le Web Audio API.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useVoiceMode } from '@domos/vue';
 *
 * const { isRecording, startRecording, stopRecording } = useVoiceMode({ live: true });
 * </script>
 *
 * <template>
 *   <button @click="isRecording ? stopRecording() : startRecording()">
 *     {{ isRecording ? 'Arreter' : 'Parler' }}
 *   </button>
 * </template>
 * ```
 */
export function useVoiceMode(options?: {
  sampleRate?: number;
  live?: boolean;
  onTranscript?: (text: string) => void;
}) {
  const { sendAudio, sendAudioStream, sendAudioEnd, sendInterrupt, onAudioOutput, state } = useAgent();
  const isRecording = ref(false);
  const isMuted = ref(false);
  const voiceState = ref<VoiceState>('idle');
  const voiceMachine = new VoiceStateMachine({
    onStateChange: (_from, to) => { voiceState.value = to; },
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
  if (live && onAudioOutput) {
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

  const startRecording = async () => {
    try {
      if (isRecording.value) return;

      // Barge-in : si l'agent parle, interrompre la lecture et signaler
      if (live && state.agentState === 'speaking') {
        voiceMachine.dispatch('BARGE_IN');
        sendInterrupt();
        if (playbackContext && playbackContext.state !== 'closed') {
          playbackContext.close().catch(() => {});
        }
        playbackContext = null;
        nextStartTime = 0;
      }

      if (!playbackContext || playbackContext.state === 'closed') {
        playbackContext = new AudioContext({ sampleRate: 24000 });
      }
      nextStartTime = 0;
      if (playbackContext.state === 'suspended') {
        await playbackContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
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

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const pcmData = event.inputBuffer.getChannelData(0);

        // Float32 -> Int16 PCM
        const int16 = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          const s = Math.max(-1, Math.min(1, pcmData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Envoyer au serveur — mode Live ou mode texte
        const mime = `audio/pcm;rate=${sampleRate}`;
        if (live) {
          sendAudioStream(base64, mime);
        } else {
          sendAudio(base64, mime);
        }
      };

      source.connect(processor);
      processor.connect(captureKeepAliveGain);
      captureKeepAliveGain.connect(audioContext.destination);

      voiceMachine.dispatch('START_CAPTURE');
      isRecording.value = true;
    } catch (err) {
      voiceMachine.dispatch('ERROR');
      console.error('Erreur micro:', err);
    }
  };

  const stopRecording = () => {
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
    mediaStream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());

    processor = null;
    captureKeepAliveGain = null;
    audioContext = null;
    mediaStream = null;
    isRecording.value = false;
    isMuted.value = false;

    nextStartTime = 0;
  };

  /**
   * Coupe le micro localement sans notifier le serveur.
   * La session WebSocket reste ouverte. Appeler startRecording() pour reprendre.
   */
  const muteMic = () => {
    if (!isRecording.value || isMuted.value) return;
    mediaStream?.getTracks().forEach((t: MediaStreamTrack) => { t.enabled = false; });
    isMuted.value = true;
  };

  const unmuteMic = () => {
    if (!isMuted.value) return;
    mediaStream?.getTracks().forEach((t: MediaStreamTrack) => { t.enabled = true; });
    isMuted.value = false;
  };

  // Cleanup au demontage
  onUnmounted(() => {
    if (isRecording.value) {
      stopRecording();
    }
    if (playbackContext && playbackContext.state !== 'closed') {
      void playbackContext.close().catch(() => {});
      playbackContext = null;
    }
    unsubscribeAudioOutput?.();
    unsubscribeAudioOutput = null;
  });

  return { isRecording, isMuted, voiceState, startRecording, stopRecording, muteMic, unmuteMic, playAudioChunk };
}
