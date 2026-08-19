// ============================================================
// OpenAI Whisper STT Provider
// Speech-to-Text using OpenAI Whisper API
// ============================================================

import OpenAI from 'openai';
import { BaseSTTService, SpeechServiceError } from '@owllayer/core';
import type {
  STTAudioConfig,
  STTResult,
  SpeechServiceOptions,
} from '@owllayer/core';

export interface WhisperSTTOptions extends SpeechServiceOptions {
  apiKey: string;
  model?: 'whisper-1';
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export class WhisperSTT extends BaseSTTService {
  readonly name = 'openai-whisper';

  private client: OpenAI;
  private model: string;
  private language?: string;
  private prompt?: string;
  private temperature: number;
  private responseFormat: string;

  constructor(options: WhisperSTTOptions) {
    super(options);

    if (!options.apiKey) {
      throw new SpeechServiceError(
        'OpenAI API key is required',
        this.name,
        'MISSING_API_KEY'
      );
    }

    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: this.timeout,
    });

    this.model = options.model || 'whisper-1';
    this.language = options.language;
    this.prompt = options.prompt;
    this.temperature = options.temperature ?? 0;
    this.responseFormat = options.responseFormat || 'verbose_json';

    this.log('Whisper STT initialized', { model: this.model });
  }

  async transcribe(config: STTAudioConfig): Promise<STTResult> {
    this.validateConfig(config);

    const startTime = Date.now();

    try {
      const audioBuffer = this.base64ToBuffer(config.audioBase64);
      const audioFile = await this.createAudioFile(audioBuffer, config.mimeType);

      this.log('Transcribing audio', {
        size: audioBuffer.length,
        mimeType: config.mimeType,
        language: config.languageCode || this.language || 'auto',
      });

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: this.model,
        language: config.languageCode || this.language,
        prompt: this.prompt,
        temperature: this.temperature,
        response_format: this.responseFormat as never,
      });

      const duration = Date.now() - startTime;
      const result = this.parseTranscription(transcription, duration);

      this.log('Transcription complete', {
        text: result.text.substring(0, 100) + '...',
        duration: `${duration}ms`,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      this.handleError(error, 'transcribe');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.retrieve('whisper-1');
      return true;
    } catch (error) {
      this.log('Service unavailable', error);
      return false;
    }
  }

  private async createAudioFile(buffer: Buffer, mimeType: string): Promise<File> {
    const format = this.getAudioFormat(mimeType);
    const extension = this.getExtension(format);
    const filename = `audio.${extension}`;

    let finalBuffer = buffer;
    let finalMimeType = mimeType;

    if (format === 'pcm') {
      const sampleRate = this.extractSampleRate(mimeType);
      finalBuffer = this.convertPCMtoWAV(buffer, sampleRate);
      finalMimeType = 'audio/wav';
    }

    return new File([finalBuffer], filename, { type: finalMimeType });
  }

  private convertPCMtoWAV(pcmBuffer: Buffer, sampleRate: number): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;

    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  private parseTranscription(transcription: any, duration: number): STTResult {
    if (this.responseFormat === 'verbose_json') {
      return {
        text: transcription.text || '',
        confidence: this.calculateConfidence(transcription),
        detectedLanguage: transcription.language,
        audioDuration: transcription.duration ? Math.round(transcription.duration * 1000) : undefined,
        metadata: {
          processingTime: duration,
          segments: transcription.segments,
          words: transcription.words,
        },
      };
    }

    return {
      text: typeof transcription === 'string' ? transcription : transcription.text,
      metadata: {
        processingTime: duration,
      },
    };
  }

  private calculateConfidence(transcription: any): number | undefined {
    if (!transcription.segments || transcription.segments.length === 0) {
      return undefined;
    }

    const avgConfidence = transcription.segments.reduce(
      (sum: number, segment: any) => sum + (segment.no_speech_prob ? 1 - segment.no_speech_prob : 0.9),
      0
    ) / transcription.segments.length;

    return Math.round(avgConfidence * 100) / 100;
  }

  private getExtension(format: string): string {
    const extensions: Record<string, string> = {
      pcm: 'wav',
      wav: 'wav',
      mp3: 'mp3',
      opus: 'ogg',
      webm: 'webm',
      flac: 'flac',
      m4a: 'm4a',
    };
    return extensions[format] || 'wav';
  }
}