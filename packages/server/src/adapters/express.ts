import type { Server as HttpServer } from 'http';
import { DomOSServer, type DomOSServerOptions } from '../core/DomOSServer.js';

export interface ExpressLikeApp {
  use?: (...args: unknown[]) => unknown;
}

export interface AttachDomOSExpressOptions extends Omit<DomOSServerOptions, 'server'> {
  server: HttpServer;
}

export function attachDomOS(_app: ExpressLikeApp, options: AttachDomOSExpressOptions): DomOSServer {
  return new DomOSServer({
    ...options,
    server: options.server,
  });
}
