import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { DomOSConfigSchema } from './schema.js';
import type { DomOSConfig } from './types.js';

export function loadConfig(configPath?: string): DomOSConfig {
  const filePath = configPath ?? process.env.DOMOS_CONFIG ?? 'domos.config.yml';

  let fileConfig: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf-8');
    fileConfig = parseYaml(raw) ?? {};
  }

  // Env vars surchargent le YAML — jamais d'API key dans le fichier
  const merged = deepMerge(fileConfig, {
    mode: process.env.DOMOS_MODE,
    port: process.env.PORT,
    admin: {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    },
    cloud: {
      jwtSecret: process.env.JWT_SECRET,
      refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
      redisUrl: process.env.REDIS_URL,
      databaseUrl: process.env.DATABASE_URL,
      encryptionKey: process.env.ENCRYPTION_KEY,
    },
  });

  const result = DomOSConfigSchema.safeParse(merged);
  if (!result.success) {
    console.error('[DomOS] ❌ Configuration invalide :');
    for (const issue of result.error.issues) {
      console.error(`  → ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data as DomOSConfig;
}

/** Deep merge non-null values (env surcharge YAML) */
function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === '') continue;
    if (
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
