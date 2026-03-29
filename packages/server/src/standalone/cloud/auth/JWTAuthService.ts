import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';
import type { CloudConfig } from '../../config/types.js';

export interface JWTPayload {
  sub: string;
  email: string;
  orgId: string;
  role: string;
  projectId?: string;
}

export class JWTAuthService {
  private publicKey: string;
  private privateKey: string;
  private issuer: string;
  private audience: string;
  private expiresIn: string;

  constructor(config: CloudConfig['jwt']) {
    this.publicKey = readFileSync(config.publicKeyPath, 'utf-8');
    this.privateKey = readFileSync(config.privateKeyPath, 'utf-8');
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.expiresIn = config.expiresIn;
  }

  sign(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      issuer: this.issuer,
      audience: this.audience,
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): JWTPayload {
    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
      audience: this.audience,
    }) as JWTPayload;
  }

  decode(token: string): JWTPayload | null {
    const decoded = jwt.decode(token);
    return decoded as JWTPayload | null;
  }
}
