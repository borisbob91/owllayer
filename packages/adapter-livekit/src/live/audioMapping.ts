import { decodeAudio, getFormatFromMimeType, getMimeType } from '@owllayer/core/media/audio';
import { LiveKitAdapterError } from '../errors.js';
import type { LiveKitAudioFrame, LiveKitRuntimeHelpers } from './types.js';

export interface ParsedPCMMimeType {
  mimeType: string;
  sampleRate: number;
  channels: number;
}

const DEFAULT_INPUT_SAMPLE_RATE = 16000;
const DEFAULT_OUTPUT_SAMPLE_RATE = 24000;
const DEFAULT_CHANNELS = 1;

export function parsePCMMimeType(mimeType = 'audio/pcm;rate=16000'): ParsedPCMMimeType {
  const normalized = mimeType.toLowerCase();

  if (!normalized.startsWith('audio/pcm') || getFormatFromMimeType(normalized) !== 'pcm') {
    throw new LiveKitAdapterError(
      `LiveKit realtime only accepts PCM input audio, received '${mimeType}'.`
    );
  }

  return {
    mimeType: 'audio/pcm',
    sampleRate: readNumberParameter(normalized, 'rate') ?? DEFAULT_INPUT_SAMPLE_RATE,
    channels: readNumberParameter(normalized, 'channels') ?? DEFAULT_CHANNELS,
  };
}

export function decodePCMBase64ToInt16(audioBase64: string): Int16Array {
  const bytes = decodeAudio(audioBase64);

  if (bytes.byteLength === 0) {
    throw new LiveKitAdapterError('Cannot send an empty audio frame to LiveKit realtime.');
  }

  if (bytes.byteLength % Int16Array.BYTES_PER_ELEMENT !== 0) {
    throw new LiveKitAdapterError(
      'PCM audio payload must contain 16-bit signed samples.'
    );
  }

  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
}

export function createLiveKitAudioFrame(
  helpers: LiveKitRuntimeHelpers,
  audioBase64: string,
  mimeType?: string
): unknown {
  const audio = decodePCMBase64ToInt16(audioBase64);
  const parsed = parsePCMMimeType(mimeType);
  const samplesPerChannel = Math.floor(audio.length / parsed.channels);

  return helpers.createAudioFrame(
    audio,
    parsed.sampleRate,
    parsed.channels,
    samplesPerChannel
  );
}

export function liveKitAudioFrameToOwlLayerAudio(frame: LiveKitAudioFrame): {
  audioBase64: string;
  mimeType: string;
} {
  const bytes = new Uint8Array(
    frame.data.buffer,
    frame.data.byteOffset,
    frame.data.byteLength
  );
  const sampleRate = frame.sampleRate || DEFAULT_OUTPUT_SAMPLE_RATE;

  return {
    audioBase64: Buffer.from(bytes).toString('base64'),
    mimeType: getMimeType('pcm', sampleRate),
  };
}

function readNumberParameter(mimeType: string, name: string): number | undefined {
  const match = new RegExp(`${name}=([0-9]+)`).exec(mimeType);
  if (!match?.[1]) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
