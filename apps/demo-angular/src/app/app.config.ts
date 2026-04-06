import type { ApplicationConfig } from '@angular/core';
import { provideDomOS, type DomOSAngularConfig } from '@domos/angular';

export const demoDomOSConfig: DomOSAngularConfig = {
  endpoint: 'ws://localhost:3000/domos',
  apiKey: 'pk_demo_local',
  debug: true,
  componentId: 'demo-angular-app',
};

export const appConfig: ApplicationConfig = {
  providers: [provideDomOS(demoDomOSConfig)],
};