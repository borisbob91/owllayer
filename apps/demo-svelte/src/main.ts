import { initDomOS } from '@domos/svelte';
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

const ENDPOINT = import.meta.env.VITE_DOMOS_ENDPOINT || 'ws://localhost:4001/domos';
const API_KEY  = import.meta.env.VITE_DOMOS_API_KEY  || '';

initDomOS({ endpoint: ENDPOINT, apiKey: API_KEY });

const app = mount(App, { target: document.getElementById('app')! });
export default app;
