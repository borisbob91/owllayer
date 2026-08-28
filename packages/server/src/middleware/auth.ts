import type { IncomingMessage } from 'http';
import { createLogger } from '@owllayer/core';

const log = createLogger('OwlLayer:Auth');

/**
 * Resultat de l'authentification.
 */
export interface AuthResult {
  authenticated: boolean;
  apiKey?: string;
  error?: string;
}

/**
 * Fonction de validation d'API key custom.
 */
export type ApiKeyValidator = (apiKey: string) => Promise<boolean> | boolean;

/**
 * Middleware d'authentification WebSocket.
 * Extrait et valide l'API key depuis le handshake.
 */
export class AuthMiddleware {
  private validKeys = new Set<string>();
  private customValidator?: ApiKeyValidator;

  /**
   * Ajouter des API keys valides (mode simple).
   */
  addKeys(...keys: string[]): void {
    for (const key of keys) {
      this.validKeys.add(key);
    }
  }

  /**
   * Supprimer une API key.
   */
  removeKey(key: string): boolean {
    return this.validKeys.delete(key);
  }

  /**
   * Lister toutes les API keys enregistrees.
   */
  getKeys(): string[] {
    return Array.from(this.validKeys);
  }

  /**
   * Definir un validateur custom (mode avance).
   */
  setValidator(validator: ApiKeyValidator): void {
    this.customValidator = validator;
  }

  /**
   * Authentifier une connexion entrante.
   * Cherche l'API key dans :
   * 1. Query param `?apiKey=...`
   * 2. Header `Authorization: Bearer ...`
   */
  async authenticate(req: IncomingMessage): Promise<AuthResult> {
    // Extraire l'API key
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    let apiKey = url.searchParams.get('apiKey');

    if (!apiKey) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7);
      }
    }

    if (!apiKey) {
      log.warn('Connection without API key');
      return { authenticated: false, error: 'Missing API key' };
    }

    // Valider
    let isValid = false;

    if (this.customValidator) {
      isValid = await this.customValidator(apiKey);
    } else {
      isValid = this.validKeys.has(apiKey);
    }

    if (!isValid) {
      log.warn(`Invalid API key: ${apiKey.slice(0, 8)}...`);
      return { authenticated: false, error: 'Invalid API key' };
    }

    return { authenticated: true, apiKey };
  }
}
