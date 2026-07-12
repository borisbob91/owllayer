export const DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
] as const;

export function parseLiveKitTokenAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveLiveKitTokenCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[] = DEFAULT_LIVEKIT_TOKEN_ALLOWED_ORIGINS
): string | undefined {
  if (!origin) {
    return undefined;
  }

  if (allowedOrigins.includes('*')) {
    return '*';
  }

  return allowedOrigins.includes(origin) ? origin : undefined;
}
