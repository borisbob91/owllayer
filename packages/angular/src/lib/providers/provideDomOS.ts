import {
  inject,
  NgZone,
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import { DomOSClient } from '@domos/core';
import { DomOSAngularService } from '../services/DomOSAngularService.js';
import type { DomOSAngularConfig } from '../types/types.js';

const DOMOS_ANGULAR_CONFIG = new InjectionToken<DomOSAngularConfig>('DOMOS_ANGULAR_CONFIG');
const DOMOS_ANGULAR_SERVICE = new InjectionToken<DomOSAngularService>('DOMOS_ANGULAR_SERVICE');

function createNoopNgZone(): NgZone {
  return {
    run: <T>(fn: (...args: any[]) => T): T => fn(),
    runOutsideAngular: <T>(fn: (...args: any[]) => T): T => fn(),
  } as NgZone;
}

/**
 * provideDomOS — Configure et enregistre DomOSAngularService dans le contexte
 * d'injection Angular (Environment Injector).
 *
 * À placer dans `bootstrapApplication()` ou dans le tableau `providers` d'un `ApplicationConfig`.
 *
 * @public
 *
 * @example
 * ```typescript
 * bootstrapApplication(AppComponent, {
 *   providers: [provideDomOS({ url: 'wss://my-server/ws' })]
 * });
 * ```
 */
export function provideDomOS(config: DomOSAngularConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: DOMOS_ANGULAR_CONFIG,
      useValue: config,
    },
    {
      provide: DOMOS_ANGULAR_SERVICE,
      useFactory: () => {
        const resolvedConfig = inject(DOMOS_ANGULAR_CONFIG);
        const ngZone = inject(NgZone, { optional: true }) ?? createNoopNgZone();
        const { componentId, ...clientOptions } = resolvedConfig;

        return new DomOSAngularService(new DomOSClient(clientOptions), componentId, ngZone);
      },
    },
  ]);
}

/**
 * injectDomOS — Injecte le DomOSAngularService dans le contexte d'injection courant.
 *
 * Doit être appelé dans un contexte d'injection Angular (constructeur, `inject()`, factory).
 *
 * @public
 *
 * @example
 * ```typescript
 * const domos = injectDomOS();
 * await domos.connect();
 * ```
 */
export function injectDomOS(): DomOSAngularService {
  return inject(DOMOS_ANGULAR_SERVICE);
}
