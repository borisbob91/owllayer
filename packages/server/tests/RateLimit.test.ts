import { describe, it, expect, afterEach } from 'vitest';
import { RateLimitMiddleware } from '../src/middleware/rateLimit.js';

describe('RateLimitMiddleware', () => {
  let limiter: RateLimitMiddleware;

  afterEach(() => {
    limiter?.stop();
  });

  it('autorise sous la limite', () => {
    limiter = new RateLimitMiddleware({ maxRequests: 5, windowMs: 60_000 });

    expect(limiter.check('key_1')).toBe(true);
    expect(limiter.check('key_1')).toBe(true);
    expect(limiter.check('key_1')).toBe(true);
  });

  it('bloque au-dela de la limite', () => {
    limiter = new RateLimitMiddleware({ maxRequests: 3, windowMs: 60_000 });

    limiter.check('key_1'); // 1
    limiter.check('key_1'); // 2
    limiter.check('key_1'); // 3

    expect(limiter.check('key_1')).toBe(false); // 4 = bloque
  });

  it('isole les API keys', () => {
    limiter = new RateLimitMiddleware({ maxRequests: 2, windowMs: 60_000 });

    limiter.check('key_1');
    limiter.check('key_1');
    expect(limiter.check('key_1')).toBe(false);

    // key_2 n'est pas affecte
    expect(limiter.check('key_2')).toBe(true);
  });

  it('retourne le remaining correct', () => {
    limiter = new RateLimitMiddleware({ maxRequests: 5, windowMs: 60_000 });

    limiter.check('key_1');
    limiter.check('key_1');

    const info = limiter.getRemaining('key_1');
    expect(info.remaining).toBe(3);
  });
});
