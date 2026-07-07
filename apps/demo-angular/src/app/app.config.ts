import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideDomOS, type DomOSAngularConfig } from '@domos/angular';
import { routes } from './app.routes.js';

export const demoDomOSConfig: DomOSAngularConfig = {
  endpoint: import.meta.env.VITE_DOMOS_ENDPOINT || 'ws://localhost:4001/domos',
  apiKey: import.meta.env.VITE_DOMOS_API_KEY || 'pk_demo_local',
  debug: true,
  componentId: 'demo-angular-marketplace',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideDomOS(demoDomOSConfig),
  ],
};