import type { IncomingMessage } from 'http';

/** Taille maximale par defaut d'un corps de requete HTTP (JSON d'administration, signalisation). */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

/**
 * Erreur levee quand le corps depasse la limite : l'appelant repond 413.
 */
export class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`Request body exceeds ${limit} bytes`);
  }
}

/**
 * Lire le corps d'une requete en refusant tout ce qui depasse `maxBytes`.
 * Sans limite, un seul client non authentifie peut saturer la memoire du serveur.
 */
export function readBody(req: IncomingMessage, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<string> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      req.resume();
      reject(new BodyTooLargeError(maxBytes));
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let exceeded = false;

    req.on('data', (chunk: Buffer | string) => {
      if (exceeded) return;
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      size += buf.length;
      if (size > maxBytes) {
        exceeded = true;
        chunks.length = 0;
        reject(new BodyTooLargeError(maxBytes));
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      if (!exceeded) resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    req.on('error', reject);
  });
}
