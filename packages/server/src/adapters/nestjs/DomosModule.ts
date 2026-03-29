// @ts-nocheck — @nestjs/common is a peerDependency; not installed in this package
import { Module, DynamicModule, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { DomOSServer } from '../../core/DomOSServer.js';
import type { DomOSServerOptions } from '../../core/DomOSServer.js';

const DOMOS_OPTIONS = 'DOMOS_SERVER_OPTIONS';
const DOMOS_SERVER = 'DOMOS_SERVER';

/**
 * Module NestJS pour DomOS.
 *
 * Enregistre DomOS comme provider global dans l'application NestJS.
 * Le cycle de vie est géré par `OnModuleDestroy`.
 *
 * @example
 * ```ts
 * // app.module.ts
 * import { DomosModule } from '@domos/server/adapters/nestjs';
 *
 * @Module({
 *   imports: [DomosModule.forRoot({ llm, port: 3000 })],
 * })
 * export class AppModule {}
 * ```
 *
 * @note NestJS et ses décorateurs sont des peerDependencies — pas installés dans @domos/server.
 */
@Global()
@Module({})
export class DomosModule implements OnModuleDestroy {
  constructor(@Inject(DOMOS_SERVER) private server: DomOSServer) {}

  static forRoot(options: DomOSServerOptions): DynamicModule {
    return {
      module: DomosModule,
      providers: [
        { provide: DOMOS_OPTIONS, useValue: options },
        {
          provide: DOMOS_SERVER,
          useFactory: (opts: DomOSServerOptions) => {
            const server = new DomOSServer(opts);
            server.listen();
            return server;
          },
          inject: [DOMOS_OPTIONS],
        },
      ],
      exports: [DOMOS_SERVER],
    };
  }

  async onModuleDestroy() {
    this.server.stop();
  }
}
