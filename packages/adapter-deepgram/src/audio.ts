// ============================================================
// Utilitaires audio Deepgram
// Conversion MIME <-> encodage Deepgram, et alignement 2 octets des
// chunks binaires avant base64 (regle R3 de docs/AUDIO_PIPELINE_RULES.md :
// un `Int16Array` construit sur un buffer de taille impaire corrompt ou
// fait planter le decodage PCM 16 bits).
// ============================================================

/** Resultat de la conversion d'un type MIME vers l'encodage et le taux Deepgram. */
export interface DeepgramAudioEncoding {
  encoding: string;
  sampleRate: number;
}

/**
 * Convertit un type MIME audio OwlLayer (ex: `audio/pcm;rate=16000`) vers
 * l'encodage et le taux d'echantillonnage attendus par Deepgram
 * (`linear16`). Retourne `undefined` si le type MIME n'est pas du PCM brut
 * reconnu.
 */
export function mimeTypeToDeepgramEncoding(mimeType: string): DeepgramAudioEncoding | undefined {
  if (!mimeType.startsWith('audio/pcm')) {
    return undefined;
  }
  const match = mimeType.match(/rate=(\d+)/);
  const sampleRate = match ? parseInt(match[1], 10) : 16000;
  return { encoding: 'linear16', sampleRate };
}

/**
 * Construit un alignateur d'octets pairs pour un flux de chunks binaires
 * PCM 16 bits. Chaque appel realigne le chunk courant en reportant
 * l'eventuel octet impair final sur le chunk suivant, pour ne jamais casser
 * un sample au milieu (regle R3).
 */
export function createEvenByteAligner(): (chunk: Buffer) => Buffer {
  let carry: Buffer | undefined;

  return (chunk: Buffer): Buffer => {
    const combined = carry ? Buffer.concat([carry, chunk]) : chunk;
    const validLength = combined.length - (combined.length % 2);

    if (validLength === combined.length) {
      carry = undefined;
      return combined;
    }

    carry = combined.subarray(validLength);
    return combined.subarray(0, validLength);
  };
}
