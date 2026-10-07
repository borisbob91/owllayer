import type { SpeechCapabilities, SpeechServiceError } from './contracts.js';

/**
 * Contrats de streaming vocal, provider-neutres et additifs.
 *
 * Independants des contrats batch (`STTService`/`TTSService`) : un modele
 * uniquement streaming n'a jamais a implementer un faux `transcribe()` ou
 * `synthesize()` ; un provider qui supporte les deux modes implemente les
 * deux familles d'interfaces separement.
 */

/** Etat commun des flux vocaux. */
export type SpeechStreamState = 'connecting' | 'ready' | 'closing' | 'closed';

/** Evenements provider-neutres d'un flux STT oriente tours de parole. */
export type STTTurnEvent =
  | { type: 'turn.started'; turnIndex: number }
  | { type: 'transcript.partial'; turnIndex: number; text: string }
  | { type: 'turn.tentative_end'; turnIndex: number; text: string; confidence?: number }
  | { type: 'turn.resumed'; turnIndex: number }
  | { type: 'turn.ended'; turnIndex: number; text: string; confidence?: number; languages?: string[] }
  | { type: 'stream.error'; error: SpeechServiceError; fatal: boolean }
  | { type: 'stream.closed'; reason: 'client' | 'remote' | 'error' | 'timeout' };

/**
 * Options d'ouverture d'un flux STT oriente tours de parole.
 */
export interface STTTurnStreamOptions {
  /** Format de l'audio envoye (ex: 'audio/pcm;rate=16000'). */
  mimeType: string;
  languageCode?: string;
  onEvent: (event: STTTurnEvent) => void;
}

/**
 * Flux STT actif, oriente tours de parole (turn-aware).
 */
export interface STTTurnStream {
  readonly state: SpeechStreamState;
  /** Audio base64 ; mis en file (bornee) avant 'ready'. */
  sendAudio(audioBase64: string): void;
  /** Force la fin du tour courant (meme verbe que LiveSession.endAudioTurn). */
  endAudioTurn(): Promise<void>;
  /** Idempotent. */
  close(): Promise<void>;
}

/**
 * Service STT capable d'ouvrir un flux streaming turn-aware.
 */
export interface StreamingSTTService {
  readonly name: string;
  openTurnStream(options: STTTurnStreamOptions): Promise<STTTurnStream>;
  getCapabilities?(): SpeechCapabilities;
}

/**
 * Options d'ouverture d'un flux de synthese vocale (speech).
 */
export interface TTSSpeechStreamOptions {
  voice?: string;
  languageCode?: string;
  onAudio: (audioBase64: string, mimeType: string) => void;
  onError: (error: SpeechServiceError) => void;
}

/**
 * Flux de synthese vocale actif.
 */
export interface TTSSpeechStream {
  readonly state: SpeechStreamState;
  /** Ajoute un segment de texte ; l'ordre est conserve. */
  appendText(text: string): void;
  /** Termine le segment courant ; resolu a la confirmation du provider. */
  flush(): Promise<void>;
  /** Barge-in : vide le texte en attente et ignore l'audio deja en vol. */
  interrupt(): Promise<void>;
  /** Idempotent. */
  close(): Promise<void>;
}

/**
 * Service TTS capable d'ouvrir un flux de synthese vocale streaming.
 */
export interface StreamingTTSService {
  readonly name: string;
  openSpeechStream(options: TTSSpeechStreamOptions): Promise<TTSSpeechStream>;
  getCapabilities?(): SpeechCapabilities;
}

/**
 * Garde de type runtime : `value` implemente-t-il `StreamingSTTService` ?
 * Discrimine sur `openTurnStream`, seule methode propre a ce contrat
 * (absente de `STTService`).
 */
export function isStreamingSTTService(value: unknown): value is StreamingSTTService {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { openTurnStream?: unknown }).openTurnStream === 'function'
  );
}

/**
 * Garde de type runtime : `value` implemente-t-il `StreamingTTSService` ?
 * Discrimine sur `openSpeechStream`, seule methode propre a ce contrat
 * (absente de `TTSService`).
 */
export function isStreamingTTSService(value: unknown): value is StreamingTTSService {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { openSpeechStream?: unknown }).openSpeechStream === 'function'
  );
}
