declare module 'wav-decoder' {
  export interface AudioData {
    sampleRate: number;
    channelData: Float32Array[];
  }

  export function decode(buffer: ArrayBuffer | Buffer): Promise<AudioData>;
}
