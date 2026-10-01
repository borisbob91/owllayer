import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config, parse } from 'dotenv';
import { setLogLevel, LogLevel } from '@owllayer/core';
import { getServerI18n, type ServerI18n } from '../i18n/messages.js';

/** Dossier apps/demo-server (depuis src/shared ou dist/shared). */
export const DEMO_DIR = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Demo servers, one per provider: `pnpm --filter @owllayer/demo-server dev:<provider>`. */
export const DEMO_PROVIDERS = ['google', 'openai', 'deepseek', 'deepgram'] as const;
export type DemoProvider = typeof DEMO_PROVIDERS[number];

/**
 * Loads the environment of a demo server: `.env.<provider>` first, then the optional
 * secondary file (e.g. the text LLM of the Deepgram server), then the shared `.env`.
 * The first value found wins, so a provider file overrides the shared settings.
 */
export function loadDemoEnv(provider: DemoProvider, secondary?: () => string | undefined): void {
  config({ path: join(DEMO_DIR, `.env.${provider}`) });
  const extra = secondary?.();
  if (extra && extra !== provider) config({ path: join(DEMO_DIR, `.env.${extra}`) });
  config({ path: join(DEMO_DIR, '.env') });
  applyLogLevel(process.env.LOG_LEVEL);
}

/** Reads one variable of the shared `.env` without loading it (used by the `pnpm dev` dispatcher). */
export function readSharedEnv(): Record<string, string> {
  const path = join(DEMO_DIR, '.env');
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

/** A key left empty or still holding the example value. */
export const isMissing = (key: string | undefined): boolean => !key || key.startsWith('your_');

/** Language and server messages of the demo (DEFAULT_LANGUAGE). */
export function demoLanguage(): { language: 'en' | 'fr'; i18n: ServerI18n } {
  const language = (process.env.DEFAULT_LANGUAGE || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  return { language, i18n: getServerI18n(language) };
}

function applyLogLevel(level = 'info'): void {
  // INFO par defaut pour voir la banniere de demarrage
  const levels: Record<string, LogLevel> = {
    silent: LogLevel.SILENT,
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    debug: LogLevel.DEBUG,
  };
  setLogLevel(levels[level.toLowerCase()] ?? LogLevel.INFO);
}
