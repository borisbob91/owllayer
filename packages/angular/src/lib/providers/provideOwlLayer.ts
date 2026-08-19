import {
  inject,
  NgZone,
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import { OwlLayerClient } from '@owllayer/core';
import { OwlLayerAngularService } from '../services/OwlLayerAngularService.js';
import type { OwlLayerAngularConfig } from '../types/types.js';

const OWLLAYER_ANGULAR_CONFIG = new InjectionToken<OwlLayerAngularConfig>('OWLLAYER_ANGULAR_CONFIG');
const OWLLAYER_ANGULAR_SERVICE = new InjectionToken<OwlLayerAngularService>('OWLLAYER_ANGULAR_SERVICE');

function createNoopNgZone(): NgZone {
  return {
    run: <T>(fn: (...args: any[]) => T): T => fn(),
    runOutsideAngular: <T>(fn: (...args: any[]) => T): T => fn(),
  } as NgZone;
}

/**
 * provideOwlLayer — Configure et enregistre OwlLayerAngularService dans le contexte
 * d'injection Angular (Environment Injector).
 *
 * À placer dans `bootstrapApplication()` ou dans le tableau `providers` d'un `ApplicationConfig`.
 *
 * @public
 *
 * @example
 * ```typescript
 * bootstrapApplication(AppComponent, {
 *   providers: [provideOwlLayer({ url: 'wss://my-server/ws' })]
 * });
 * ```
 */
export function provideOwlLayer(config: OwlLayerAngularConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: OWLLAYER_ANGULAR_CONFIG,
      useValue: config,
    },
    {
      provide: OWLLAYER_ANGULAR_SERVICE,
      useFactory: () => {
        const resolvedConfig = inject(OWLLAYER_ANGULAR_CONFIG);
        const ngZone = inject(NgZone, { optional: true }) ?? createNoopNgZone();
        const { componentId, ...clientOptions } = resolvedConfig;

        return new OwlLayerAngularService(new OwlLayerClient(clientOptions), componentId, ngZone);
      },
    },
  ]);
}

/**
 * injectOwlLayer — Injecte le OwlLayerAngularService dans le contexte d'injection courant.
 *
 * Doit être appelé dans un contexte d'injection Angular (constructeur, `inject()`, factory).
 *
 * @public
 *
 * @example
 * ```typescript
 * const owllayer = injectOwlLayer();
 * await owllayer.connect();
 * ```
 */
export function injectOwlLayer(): OwlLayerAngularService {
  return inject(OWLLAYER_ANGULAR_SERVICE);
}
