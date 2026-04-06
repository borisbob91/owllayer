import {
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
} from '@angular/core';
import { DomOSClient } from '@domos/core';
import { DomOSAngularService } from './DomOSAngularService.js';
import type { DomOSAngularConfig } from './types.js';

const DOMOS_ANGULAR_CONFIG = new InjectionToken<DomOSAngularConfig>('DOMOS_ANGULAR_CONFIG');
const DOMOS_ANGULAR_SERVICE = new InjectionToken<DomOSAngularService>('DOMOS_ANGULAR_SERVICE');

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
        const { componentId, ...clientOptions } = resolvedConfig;

        return new DomOSAngularService(new DomOSClient(clientOptions), componentId);
      },
    },
  ]);
}

export function injectDomOS(): DomOSAngularService {
  return inject(DOMOS_ANGULAR_SERVICE);
}