import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS,
  parseLiveKitTokenAllowedOrigins,
  resolveLiveKitTokenCorsOrigin,
} from '../src/index.js';

describe('LiveKit token endpoint CORS helpers', () => {
  it('parses comma-separated server allowlists', () => {
    expect(parseLiveKitTokenAllowedOrigins(' https://app.example.com, http://localhost:5173 ,,')).toEqual([
      'https://app.example.com',
      'http://localhost:5173',
    ]);
    expect(parseLiveKitTokenAllowedOrigins(undefined)).toEqual([]);
  });

  it('allows only configured origins by default', () => {
    expect(
      resolveLiveKitTokenCorsOrigin('http://localhost:5173', DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS)
    ).toBe('http://localhost:5173');
    expect(
      resolveLiveKitTokenCorsOrigin('https://evil.example.com', DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS)
    ).toBeUndefined();
  });

  it('supports an explicit wildcard only when configured server-side', () => {
    expect(resolveLiveKitTokenCorsOrigin('https://app.example.com', ['*'])).toBe('*');
    expect(resolveLiveKitTokenCorsOrigin(undefined, ['*'])).toBeUndefined();
  });
});
