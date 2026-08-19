/**
 * Niveaux de log.
 */
export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

/**
 * Logger configurable pour OwlLayer.
 *
 * @example
 * ```ts
 * const log = createLogger('OwlLayer:Client');
 * log.debug('Message envoye', data);
 * ```
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

let globalLevel: LogLevel = LogLevel.WARN;

/**
 * Definir le niveau de log global.
 */
export function setLogLevel(level: LogLevel): void {
  globalLevel = level;
}

/**
 * Creer un logger avec un prefix.
 */
export function createLogger(prefix: string): Logger {
  const fmt = (level: string) => `[${prefix}][${level}]`;

  return {
    debug(...args: unknown[]) {
      if (globalLevel >= LogLevel.DEBUG) {
        console.debug(fmt('DEBUG'), ...args);
      }
    },
    info(...args: unknown[]) {
      if (globalLevel >= LogLevel.INFO) {
        console.info(fmt('INFO'), ...args);
      }
    },
    warn(...args: unknown[]) {
      if (globalLevel >= LogLevel.WARN) {
        console.warn(fmt('WARN'), ...args);
      }
    },
    error(...args: unknown[]) {
      if (globalLevel >= LogLevel.ERROR) {
        console.error(fmt('ERROR'), ...args);
      }
    },
  };
}
