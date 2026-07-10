import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: process.env.DOCS_SITE_URL ?? 'http://localhost:4322',
  integrations: [
    starlight({
      title: 'DomOS Documentation',
      customCss: ['./src/styles/domos-docs.css'],
      locales: {
        root: {
          label: 'Français',
          lang: 'fr',
        },
        en: {
          label: 'English',
          lang: 'en',
        },
      },
      social: {
        github: 'https://github.com/withastro/starlight',
      },
      head: [
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: '/domos-docs-lightbox.js',
          },
        },
      ],
      sidebar: [
        {
          label: 'Commencer',
          items: [
            { label: 'Introduction', slug: '' },
            { label: 'Bien debuter', slug: 'getting-started' },
            { label: 'Architecture', slug: 'architecture' },
            { label: 'Concepts Cles', slug: 'core-concepts' },
          ],
        },
        {
          label: 'Guides produit',
          items: [
            { label: 'Widget', slug: 'widget' },
            { label: 'Plugins', slug: 'plugins' },
            { label: 'Adapters personnalises', slug: 'custom_adapter' },
            { label: 'System Prompt', slug: 'system_prompt' },
            { label: 'Memoire agent', slug: 'agent_memory' },
            { label: 'Memoire frontend', slug: 'agent_memory_frontend' },
            { label: 'Pipeline audio', slug: 'audio_pipeline_rules' },
            { label: 'LiveKit optionnel', slug: 'livekit' },
          ],
        },
        {
          label: 'Serveur',
          items: [
            { label: 'Comprendre le serveur', slug: 'server' },
            { label: 'Demarrer un serveur', slug: 'server/getting-started' },
            { label: 'Sessions et tools', slug: 'server/runtime-and-tools' },
            { label: 'Securite et stockage', slug: 'server/security-and-storage' },
          ],
        },
        {
          label: 'SDKs Frameworks',
          items: [
            {
              label: 'Angular',
              items: [
                { label: 'Vue d ensemble', slug: 'angular/readme' },
                { label: 'Bien debuter', slug: 'angular/getting-started' },
                { label: 'Tools et contexte', slug: 'angular/tools-and-context' },
                { label: 'Composants', slug: 'angular/components' },
                { label: 'Widget', slug: 'angular/widget' },
              ],
            },
            {
              label: 'React',
              items: [
                { label: 'Vue d ensemble', slug: 'react/readme' },
                { label: 'Bien debuter', slug: 'react/getting-started' },
                { label: 'Hooks', slug: 'react/hooks' },
                { label: 'Composants', slug: 'react/components' },
                { label: 'Widget', slug: 'react/widget' },
              ],
            },
            {
              label: 'Vue',
              items: [
                { label: 'Vue d ensemble', slug: 'vue/readme' },
                { label: 'Bien debuter', slug: 'vue/getting-started' },
                { label: 'Composables', slug: 'vue/composables' },
                { label: 'Composants', slug: 'vue/components' },
                { label: 'Widget', slug: 'vue/widget' },
              ],
            },
            {
              label: 'Svelte',
              items: [
                { label: 'Vue d ensemble', slug: 'svelte/readme' },
                { label: 'Bien debuter', slug: 'svelte/getting-started' },
                { label: 'Stores et actions', slug: 'svelte/stores-actions' },
                { label: 'Composants', slug: 'svelte/components' },
                { label: 'Widget', slug: 'svelte/widget' },
              ],
            },
            {
              label: 'Browser',
              items: [
                { label: 'Vue d ensemble', slug: 'browser/readme' },
                { label: 'Bien debuter', slug: 'browser/getting-started' },
                { label: 'Reference API', slug: 'browser/api-reference' },
                { label: 'Auto-discovery HTML', slug: 'browser/auto-discovery' },
                { label: 'Widget, voix et session', slug: 'browser/widget-voice-session' },
              ],
            },
          ],
        },
        {
          label: 'Protocole & Securite',
          items: [
            { label: 'Protocole ADTP', slug: 'adtp-protocol' },
            { label: 'Securite (HITL)', slug: 'hitl_security' },
          ],
        },
        {
          label: 'Migrations',
          items: [
            { label: 'Migration v0.2', slug: 'migration_v02' },
            { label: 'Migration Resolver', slug: 'migration_resolver' },
          ],
        },
        {
          label: 'Communaute',
          items: [
            { label: 'A propos', slug: 'about' },
          ],
        },
      ],
    }),
  ],
});
