import { useState, useRef, useCallback, useEffect } from 'react';
import { useAgent } from '../hooks/useAgent.js';
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
 * ```tsx
 * function VoiceButton() {
 *   const { isRecording, startRecording, stopRecording } = useVoiceMode({ live: true });
 *
 *   return (
 *     <button onClick={isRecording ? stopRecording : startRecording}>
 *       {isRecording ? 'Arreter' : 'Parler'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useVoiceMode(options?: {
  sampleRate?: number;
  live?: boolean;
  onTranscript?: (text: string) => void;
  onInputLevel?: (level: number) => void;
}) {
  const { sendAudio, sendAudioStream, sendAudioEnd, sendInterrupt, onAudioOutput, isSpeaking } = useAgent();
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const voiceMachineRef = useRef(new VoiceStateMachine({
    onStateChange: (_from, to) => setVoiceState(to),
  }));
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const captureKeepAliveGainRef = useRef<GainNode | null>(null);

  // Audio playback context pour le mode live
  const playbackContextRef = useRef<AudioContext | null>(null);
  // Horloge de séquençage — chaque chunk démarre exactement après le précédent
  const nextStartTimeRef = useRef<number>(0);

  const sampleRate = options?.sampleRate || 16000;
  const live = options?.live || false;
  const onInputLevel = options?.onInputLevel;

  const playAudioChunk = useCallback((audioBase64: string, mimeType: string) => {
    try {
      if (!audioBase64) return;

      // Transition vers 'playing' au premier chunk audio recu
      voiceMachineRef.current.dispatch('MODEL_SPEAKING');

      console.log(`[useVoiceMode] Reception chunk audio: ${audioBase64.length} chars, mimeType: ${mimeType}`);
      // Extraire le sample rate du mimeType (ex: audio/pcm;rate=24000)
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const outputRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      // Creer le contexte de playback si necessaire
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new AudioContext({ sampleRate: outputRate });
        nextStartTimeRef.current = 0;
      }

      const ctx = playbackContextRef.current;

      // Les navigateurs suspendent l'AudioContext après inactivité — le réveiller
      if (ctx.state === 'suspended') {
        void ctx.resume().catch((err) => {
          console.error('Impossible de reprendre le contexte audio de sortie:', err);
        });
      }

      // Decoder base64 → Int16 PCM → Float32
      const binary = atob(audioBase64);
      const validLength = binary.length - (binary.length % 2); // S'assurer que c'est pair
      const bytes = new Uint8Array(validLength);
      for (let i = 0; i < validLength; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      // Creer un AudioBuffer
      const buffer = ctx.createBuffer(1, float32.length, outputRate);
      buffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // Séquencer les chunks : chaque chunk démarre exactement à la fin du précédent
      // (pattern nextStartTimeRef de LiveDemoModal — évite superpositions et silences)
      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;
    } catch (err) {
      console.error('Erreur lecture audio:', err);
    }
  }, []);

  // Brancher le callback de lecture audio (pour mode live et hybride)
  useEffect(() => {
    if (!onAudioOutput) return;

    const unsubscribe = onAudioOutput((audioBase64: string, mimeType: string) => {
      playAudioChunk(audioBase64, mimeType);
    });

    return () => {
      unsubscribe?.();
    };
  }, [onAudioOutput, playAudioChunk]);

  const startRecording = useCallback(async () => {
    try {
      if (isRecording) return;

      // Barge-in : si l'agent parle, interrompre la lecture et signaler
      if (live && isSpeaking) {
        voiceMachineRef.current.dispatch('BARGE_IN');
        sendInterrupt();
        if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
          playbackContextRef.current.close().catch(() => {});
        }
        playbackContextRef.current = null;
        nextStartTimeRef.current = 0;
      }

      // Pré-initialiser le contexte de lecture pendant l'interaction utilisateur
      // pour éviter les blocages liés aux politiques d'autoplay des navigateurs
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        // Le taux par défaut est 24000 (standard Gemini/OpenAI)
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      nextStartTimeRef.current = 0;
      if (playbackContextRef.current.state === 'suspended') {
        await playbackContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate });
      contextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      const keepAliveGain = audioContext.createGain();
      keepAliveGain.gain.value = 0;
      captureKeepAliveGainRef.current = keepAliveGain;

      processor.onaudioprocess = (event) => {
        const pcmData = event.inputBuffer.getChannelData(0);
        if (onInputLevel) {
          let sumSquares = 0;
          for (let i = 0; i < pcmData.length; i++) {
            const sample = pcmData[i];
            sumSquares += sample * sample;
          }
          const rms = Math.sqrt(sumSquares / pcmData.length);
          // Normalize RMS into a practical 0..1 range for UI metering.
          const normalized = Math.min(1, rms * 8);
          onInputLevel(normalized);
        }

        // Convertir Float32 en Int16 PCM
        const int16 = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
          const s = Math.max(-1, Math.min(1, pcmData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Encoder en base64
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
      processor.connect(keepAliveGain);
      keepAliveGain.connect(audioContext.destination);

      voiceMachineRef.current.dispatch('START_CAPTURE');
      setIsRecording(true);
    } catch (err) {
      voiceMachineRef.current.dispatch('ERROR');
      console.error('Erreur micro:', err);
    }
  }, [sendAudio, sendAudioStream, sendInterrupt, sampleRate, live, isRecording, isSpeaking, onInputLevel]);

  const stopRecording = useCallback(() => {
    voiceMachineRef.current.dispatch('STOP_CAPTURE');

    // Signaler la fin du flux audio au serveur AVANT de couper le micro
    if (live) {
      sendAudioEnd('user_stop');
    }

    processorRef.current?.disconnect();
    captureKeepAliveGainRef.current?.disconnect();
    if (contextRef.current) {
      void contextRef.current.close().catch(() => {});
    }
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());

    processorRef.current = null;
    captureKeepAliveGainRef.current = null;
    contextRef.current = null;
    mediaStreamRef.current = null;

    nextStartTimeRef.current = 0;

    setIsRecording(false);
    setIsMuted(false);
  }, [live, sendAudioEnd]);

  /**
   * Coupe le micro localement sans notifier le serveur.
   * La session WebSocket reste ouverte. Appeler startRecording() pour reprendre.
   */
  const muteMic = useCallback(() => {
    if (!isRecording || isMuted) return;
    mediaStreamRef.current?.getTracks().forEach((t) => { t.enabled = false; });
    setIsMuted(true);
  }, [isRecording, isMuted]);

  const unmuteMic = useCallback(() => {
    if (!isMuted) return;
    mediaStreamRef.current?.getTracks().forEach((t) => { t.enabled = true; });
    setIsMuted(false);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      stopRecording();
      const ctx = playbackContextRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
      playbackContextRef.current = null;
    };
  }, [stopRecording]);

  return { isRecording, isMuted, voiceState, startRecording, stopRecording, muteMic, unmuteMic };
}
