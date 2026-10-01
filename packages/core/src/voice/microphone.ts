// Capture micro partagee par les SDK (navigateur uniquement, appele a l'execution)

/** Why the microphone could not start. */
export type MicrophoneErrorKind = 'permission' | 'no-device' | 'unavailable';

/** Microphone source connected to an AudioContext; `ratio` > 1 means the PCM must be downsampled. */
export interface MicrophoneSource {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  /** context.sampleRate / wanted sample rate */
  ratio: number;
}

/**
 * Connects a microphone stream to an AudioContext at the wanted sample rate.
 * Some browsers (Firefox, older Safari) refuse a context at another rate than the device:
 * the native rate is then used, and `ratio` tells how much to downsample with `downsamplePcm`.
 */
export function createMicrophoneSource(stream: MediaStream, sampleRate: number): MicrophoneSource {
  let context: AudioContext | null = null;
  try {
    context = new AudioContext({ sampleRate });
    return { context, source: context.createMediaStreamSource(stream), ratio: 1 };
  } catch {
    // Echec de connexion a cette frequence : contexte a la frequence native du micro
    void context?.close().catch(() => {});
    const native = new AudioContext();
    return { context: native, source: native.createMediaStreamSource(stream), ratio: native.sampleRate / sampleRate };
  }
}

/** Downsamples PCM by averaging each window of `ratio` samples (a light low-pass for speech). */
export function downsamplePcm(input: Float32Array, ratio: number): Float32Array {
  if (ratio <= 1) return input;
  const length = Math.floor(input.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    output[i] = sum / Math.max(1, end - start);
  }
  return output;
}

/** Classifies a getUserMedia / AudioContext error. */
export function getMicrophoneErrorKind(err: unknown): MicrophoneErrorKind {
  const name = (err as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-device';
  return 'unavailable';
}
