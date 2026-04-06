import type { IncomingMessage, ServerResponse } from 'http';
import type { PrismaClient } from '@prisma/client';
import type { JWTAuthService } from '../auth/JWTAuthService.js';

/** Read full request body as Buffer */
export async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Parse JSON body */
export async function parseBody<T = unknown>(req: IncomingMessage): Promise<T> {
  const buf = await readBody(req);
  try {
    return JSON.parse(buf.toString()) as T;
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
}

/** Send JSON response */
export function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Extract Bearer token from Authorization header */
export function extractBearer(req: IncomingMessage): string | null {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/** Authenticate request — throws 401 if invalid */
export function authenticate(req: IncomingMessage, jwt: JWTAuthService) {
  const token = extractBearer(req);
  if (!token) throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  try {
    return jwt.verify(token);
  } catch {
    throw Object.assign(new Error('Invalid or expired token'), { statusCode: 401 });
  }
}

/** Get path segments after /api */
export function getSegments(url: string): string[] {
  const path = url.split('?')[0];
  return path.split('/').filter(Boolean);
}

/** Match route pattern: returns params or null */
export function matchRoute(
  segments: string[],
  pattern: string[],
): Record<string, string> | null {
  if (segments.length !== pattern.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i].startsWith(':')) {
      params[pattern[i].slice(1)] = segments[i];
    } else if (pattern[i] !== segments[i]) {
      return null;
    }
  }
  return params;
}

export type CloudDeps = {
  prisma: PrismaClient;
  jwt: JWTAuthService;
};
