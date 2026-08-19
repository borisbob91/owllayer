import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideOwlLayer, type OwlLayerAngularConfig } from '@owllayer/angular';
import { routes } from './app.routes.js';

export const demoOwlLayerConfig: OwlLayerAngularConfig = {
  endpoint: import.meta.env.VITE_OWLLAYER_ENDPOINT || 'ws://localhost:4001/owllayer',
  apiKey: import.meta.env.VITE_OWLLAYER_API_KEY || 'pk_demo_local',
  debug: true,
  componentId: 'demo-angular-marketplace',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideOwlLayer(demoOwlLayerConfig),
  ],
};