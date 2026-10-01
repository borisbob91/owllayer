import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const SITE = 'https://borisbob91.github.io/owllayer/'
const TITLE = 'OwlLayer AI'
const TAGLINE = 'Make your interface drivable by AI'
const DESCRIPTION =
  'Open-source SDK that makes your interface drivable by AI. The agent lives inside your app: users ask in text or voice, with nothing to install.'
const OG_IMAGE = `${SITE}og-image.png`

// Version shown in the nav, read from the package at build time. The docs image builds from docs-site/ alone,
// where packages/ is absent: the nav item then just says "npm".
function coreVersion(): string | null {
  try {
    const file = new URL('../../packages/core/package.json', import.meta.url)
    return JSON.parse(readFileSync(file, 'utf8')).version ?? null
  } catch {
    return null
  }
}
const version = coreVersion()

export default withMermaid(
  defineConfig({
    base: '/owllayer/',
    title: TITLE,
    description: DESCRIPTION,
    lastUpdated: true,
    sitemap: { hostname: SITE },
    head: [
      ['link', { rel: 'icon', href: '/owllayer/favicon.ico' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
      ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
      ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&display=swap' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: TITLE }],
      ['meta', { property: 'og:image', content: OG_IMAGE }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:alt', content: `${TITLE}: ${TAGLINE}` }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:image', content: OG_IMAGE }]
    ],
    // Per page: the title, description and address that the shared card shows.
    transformHead({ pageData }) {
      const home = pageData.frontmatter.layout === 'home'
      const title = home ? `${TITLE}: ${TAGLINE}` : `${pageData.title} | ${TITLE}`
      const description = pageData.description || DESCRIPTION
      const page = pageData.relativePath
      const path = page === 'index.md' ? '' : page.endsWith('/index.md') ? page.slice(0, -'index.md'.length) : page.replace(/[.]md$/, '.html')
      const url = `${SITE}${path}`
      return [
        ['link', { rel: 'canonical', href: url }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { property: 'og:url', content: url }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }]
      ]
    },
    themeConfig: {
      logo: '/logo-owl.png',
      search: {
        provider: 'local'
      },
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Guide', link: '/introduction' },
        { text: 'AITP Protocol', link: '/aitp-protocol' },
        { text: 'Website', link: 'https://owllayer.dev' },
        { text: 'Scan your site', link: 'https://owllayer.dev/scan' },
        { text: 'Changelog', link: 'https://owllayer.dev/changelog' },
        { text: version ? `v${version}` : 'npm', link: 'https://www.npmjs.com/package/@owllayer/core' }
      ],
      editLink: {
        pattern: 'https://github.com/borisbob91/owllayer/edit/dev-integration/docs-site/:path',
        text: 'Edit this page on GitHub'
      },
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
            { text: 'AITP Protocol Spec', link: '/aitp-protocol' },
            { text: 'Audio Pipeline & Rules', link: '/audio-pipeline' },
            { text: 'LiveKit Integration', link: '/livekit' },
            { text: 'Deepgram Integration', link: '/deepgram' }
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
          text: 'Tutorials & Demos',
          items: [
            { text: 'React E-Commerce ShopMate', link: '/react-ecommerce-demo' },
            { text: 'Vue.js Admin Dashboard', link: '/vue-admin-demo' },
            { text: 'Svelte Travel Planner', link: '/svelte-travel-demo' },
            { text: 'Angular Marketplace', link: '/angular-marketplace-demo' },
            { text: 'Vanilla Browser E-Commerce', link: '/vanilla-browser-demo' },
            { text: 'LiveKit Voice & WebRTC', link: '/livekit-voice-demo' }
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
        { icon: 'github', link: 'https://github.com/borisbob91/owllayer' }
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
