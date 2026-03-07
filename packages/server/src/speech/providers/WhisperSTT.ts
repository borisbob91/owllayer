// ============================================================
// OpenAI Whisper STT Provider
// Speech-to-Text using OpenAI Whisper API
// ============================================================

import OpenAI from 'openai';
import { BaseSTTService } from '../STTService.js';
import {
  STTAudioConfig,
  STTResult,
  SpeechServiceError,
  SpeechServiceOptions,
} from '../types.js';

/**
 * Options pour WhisperSTT.
 */
export interface WhisperSTTOptions extends SpeechServiceOptions {
  /** Clé API OpenAI */
  apiKey: string;
  /** Modèle Whisper (défaut: 'whisper-1') */
  model?: 'whisper-1';
  /** Langue source (optionnel, auto-détection par défaut) */
  language?: string;
  /** Prompt pour guider le modèle */
  prompt?: string;
  /** Température (0-1, créativité) */
  temperature?: number;
  /** Format de réponse */
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

/**
 * Provider STT utilisant OpenAI Whisper.
 * 
 * Features :
 * - Support 99 langues avec détection automatique
 * - Gère PCM, WAV, MP3, M4A, FLAC, OGG, WebM
 * - Ultra-précis même avec bruit de fond
 * - Prix : $0.006 / minute
 * 
 * @example
 * ```ts
 * const whisper = new WhisperSTT({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   language: 'fr', // optionnel
 * });
 * 
 * const result = await whisper.transcribe({
 *   audioBase64: base64Audio,
 *   mimeType: 'audio/pcm;rate=16000',
 * });
 * console.log(result.text);
 * ```
 */
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

  /**
   * Transcrire de l'audio en texte via Whisper.
   */
  async transcribe(config: STTAudioConfig): Promise<STTResult> {
    this.validateConfig(config);

    const startTime = Date.now();

    try {
      // Convertir base64 → Buffer
      const audioBuffer = this.base64ToBuffer(config.audioBase64);

      // Créer un File object pour l'API OpenAI
      const audioFile = await this.createAudioFile(audioBuffer, config.mimeType);

      this.log('Transcribing audio', {
        size: audioBuffer.length,
        mimeType: config.mimeType,
        language: config.languageCode || this.language || 'auto',
      });

      // Appeler l'API Whisper
      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: this.model,
        language: config.languageCode || this.language,
        prompt: this.prompt,
        temperature: this.temperature,
        response_format: this.responseFormat as any,
      });

      const duration = Date.now() - startTime;

      // Parser la réponse selon le format
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

  /**
   * Vérifier la disponibilité du service.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test avec un fichier audio minimal
      await this.client.models.retrieve('whisper-1');
      return true;
    } catch (error) {
      this.log('Service unavailable', error);
      return false;
    }
  }

  /**
   * Créer un File object à partir du buffer audio.
   */
  private async createAudioFile(buffer: Buffer, mimeType: string): Promise<File> {
    const format = this.getAudioFormat(mimeType);
    const extension = this.getExtension(format);
    const filename = `audio.${extension}`;

    // OpenAI accepte : flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
    // Si PCM, on doit convertir en WAV (ajouter header WAV)
    let finalBuffer = buffer;
    let finalMimeType = mimeType;

    if (format === 'pcm') {
      const sampleRate = this.extractSampleRate(mimeType);
      finalBuffer = this.convertPCMtoWAV(buffer, sampleRate);
      finalMimeType = 'audio/wav';
    }

    return new File([finalBuffer], filename, { type: finalMimeType });
  }

  /**
   * Convertir PCM brut en fichier WAV (ajouter header).
   */
  private convertPCMtoWAV(pcmBuffer: Buffer, sampleRate: number): Buffer {
    const numChannels = 1; // Mono
    const bitsPerSample = 16; // 16-bit PCM
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmBuffer.length;

    // Header WAV (44 bytes)
    const header = Buffer.alloc(44);
    
    // "RIFF" chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4); // ChunkSize
    header.write('WAVE', 8);

    // "fmt " sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);

    // "data" sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmBuffer]);
  }

  /**
   * Parser la réponse de Whisper.
   */
  private parseTranscription(transcription: any, duration: number): STTResult {
    // Verbose JSON contient plus d'infos
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

    // Format text simple
    return {
      text: typeof transcription === 'string' ? transcription : transcription.text,
      metadata: {
        processingTime: duration,
      },
    };
  }

  /**
   * Calculer un score de confiance à partir des segments.
   */
  private calculateConfidence(transcription: any): number | undefined {
    if (!transcription.segments || transcription.segments.length === 0) {
      return undefined;
    }

    // Moyenne de la confiance de tous les segments
    const avgConfidence = transcription.segments.reduce(
      (sum: number, seg: any) => sum + (seg.no_speech_prob ? 1 - seg.no_speech_prob : 0.9),
      0
    ) / transcription.segments.length;

    return Math.round(avgConfidence * 100) / 100;
  }

  /**
   * Obtenir l'extension de fichier pour un format.
   */
  private getExtension(format: string): string {
    const extensions: Record<string, string> = {
      pcm: 'wav', // PCM sera converti en WAV
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
