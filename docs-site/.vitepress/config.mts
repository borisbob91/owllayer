import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  defineConfig({
    title: "OwlLayer AI",
    description: "Agentic UI SDK — Give your AI control of your interface",
    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }]
    ],
    themeConfig: {
      logo: '/logo-owl.png',
      search: {
        provider: 'local'
      },
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Guide', link: '/introduction' },
        { text: 'AITP Protocol', link: '/adtp-protocol' }
      ],
      sidebar: [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/introduction' },
            { text: 'Quick Start', link: '/quick-start' },
            { text: 'Core Concepts', link: '/concepts' },
            { text: 'Tools Guide', link: '/tools-guide' },
            { text: 'Architecture', link: '/architecture' },
            { text: 'Agent Memory', link: '/agent-memory' },
            { text: 'Security & HITL', link: '/security-hitl' }
          ]
        },
        {
          text: 'Core Protocols & Audio',
          items: [
            { text: 'AITP Protocol Spec', link: '/adtp-protocol' },
            { text: 'Audio Pipeline & Rules', link: '/audio-pipeline' },
            { text: 'LiveKit Integration', link: '/livekit' }
          ]
        },
        {
          text: 'UI Components',
          items: [
            { text: 'Chat Widget', link: '/chat-widget' },
            { text: 'Custom Vocal UI', link: '/custom-vocal-ui' },
            { text: 'Headless & Shadow DOM', link: '/headless-shadow-dom' }
          ]
        },
        {
          text: 'Client SDKs',
          items: [
            { text: 'Directives & Components', link: '/directives-components' },
            { text: 'React SDK', link: '/react-sdk' },
            { text: 'Vue SDK', link: '/vue-sdk' },
            { text: 'Svelte SDK', link: '/svelte-sdk' },
            { text: 'Angular SDK', link: '/angular-sdk' },
            { text: 'Vanilla Browser', link: '/vanilla-browser' }
          ]
        },
        {
          text: 'CMS Integrations',
          items: [
            { text: 'Shopify', link: '/shopify' },
            { text: 'WooCommerce', link: '/woocommerce' }
          ]
        },
        {
          text: 'Server & Configuration',
          items: [
            { text: 'Server Setup', link: '/server-setup' },
            { text: 'System Prompt', link: '/system-prompt' },
            { text: 'Plugins System', link: '/plugins-system' },
            { text: 'Production Deployment', link: '/production-deployment' }
          ]
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Core & SDKs API', link: '/api-reference' }
          ]
        },
        {
          text: 'Contributing',
          items: [
            { text: 'Contribution Guide', link: '/contributing' }
          ]
        }
      ],
      socialLinks: [
        { icon: 'github', link: 'https://github.com/borisbob91/domos' }
      ],
      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2026 OwlLayer AI Team'
      }
    },
    vite: {
      optimizeDeps: {
        include: [
          '@braintree/sanitize-url',
          'mermaid'
        ]
      }
    }
  })
)
