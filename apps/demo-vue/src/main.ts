import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { OwlLayerPlugin } from '@owllayer/vue';
import App from './App.vue';
import ProductsPage from './pages/ProductsPage.vue';
import AddProductPage from './pages/AddProductPage.vue';
import './index.css';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/products' },
    { path: '/products', component: ProductsPage },
    { path: '/products/add', component: AddProductPage },
    { path: '/products/edit/:id', component: AddProductPage, props: true },
  ],
});

const ENDPOINT = import.meta.env.VITE_OWLLAYER_ENDPOINT || 'ws://localhost:4001/owllayer';
const API_KEY = import.meta.env.VITE_OWLLAYER_API_KEY || 'pk_78ab37_vue_admin';
const USE_DEFAULT_WIDGET = import.meta.env.VITE_USE_DEFAULT_WIDGET === 'true';

const app = createApp(App);
app.use(router);
app.use(OwlLayerPlugin, {
  endpoint: ENDPOINT,
  apiKey: API_KEY,
  voice: true,
  debug: true,
  autoConnect: true,
  widget: USE_DEFAULT_WIDGET
    ? {
        enabled: true,
        config: { stylePreset: 'chat', mode: 'audio', allowModeSwitch: true },
      }
    : undefined,
});
app.mount('#app');
