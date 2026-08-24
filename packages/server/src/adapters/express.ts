import type { Server as HttpServer } from 'http';
import { OwlLayerServer, type OwlLayerServerOptions } from '../core/OwlLayerServer.js';

export interface ExpressLikeApp {
  use?: (...args: unknown[]) => unknown;
}

export interface AttachOwlLayerExpressOptions extends Omit<OwlLayerServerOptions, 'server'> {
  server: HttpServer;
}

export function attachOwlLayer(_app: ExpressLikeApp, options: AttachOwlLayerExpressOptions): OwlLayerServer {
  return new OwlLayerServer({
    ...options,
    server: options.server,
  });
}
