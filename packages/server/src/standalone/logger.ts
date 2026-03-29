export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Logger minimaliste sans dépendance :
 * - Production → JSON structuré (Datadog, Loki, etc.)
 * - Développement → sortie lisible avec prefix emoji
 */
export function createLogger(minLevel: LogLevel = 'info'): Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const threshold = LEVELS[minLevel];

  function log(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
    if (LEVELS[level] < threshold) return;

    if (isProduction) {
      process.stdout.write(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level,
          msg,
          ...meta,
        }) + '\n',
      );
    } else {
      const prefix: Record<LogLevel, string> = {
        debug: '🐛',
        info: 'ℹ️ ',
        warn: '⚠️ ',
        error: '❌',
      };
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      console.log(`${prefix[level]} [${level.toUpperCase()}] ${msg}${metaStr}`);
    }
  }

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  };
}
