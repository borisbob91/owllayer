# DomOS — TODO & Roadmap

> État réel du projet. La quasi-totalité du framework est livrée. Ce qui reste concerne surtout le **déploiement** et la mise en production.

---

## ✅ Livré

### Core & Serveur

| Package | Description | Status |
|---|---|---|
| `@domos/core` | Protocole ADTP, DomOSClient, ToolRegistry, Shadow Context, HITL, Widget, mémoire agent | ✅ |
| `@domos/server` | DomOSServer, ADTPTransport, SessionManager, ToolRouter, middleware, sécurité, storage | ✅ |
| `@domos/audio` | Pipeline audio PCM partagé | ✅ |
| `@domos/ui` | Runtime UI partagé + DevTools + dashboard | ✅ |

### SDKs Client (tous livrés)

| Package | Description | Status |
|---|---|---|
| `@domos/react` | Provider, hooks, composants, DomOSTool/DomOSToolBtn, widget | ✅ |
| `@domos/vue` | Plugin, composables, composants, DomOSTool/DomOSToolBtn, widget | ✅ |
| `@domos/svelte` | Stores, actions, composables, composants, widget | ✅ |
| `@domos/angular` | Providers, services, signals, directives, widget | ✅ |
| `@domos/browser` | API impérative + auto-discovery HTML | ✅ |

### Adaptateurs LLM (tous livrés)

| Package | Description | Status |
|---|---|---|
| `@domos/adapter-google` | Gemini (texte + function calling) | ✅ |
| `@domos/adapter-openai` | OpenAI GPT-4o / GPT-4o-mini | ✅ |
| `@domos/adapter-anthropic` | Claude Sonnet / Opus | ✅ |
| `@domos/adapter-livekit` | LiveKit realtime voice (GeminiLiveAdapter, TTS, AgentSession bridge) | ✅ |

### Intégrations CMS

| Package | Description | Status |
|---|---|---|
| `@domos/shopify` | Intégration Shopify | ✅ |
| `@domos/woocommerce` | Intégration WooCommerce | ✅ |

### Apps & Docs

| Item | Description | Status |
|---|---|---|
| `apps/demo*` | Demos React, Vue, Svelte, Angular, Browser + serveur | ✅ |
| `apps/dashboard` | Dashboard de gestion | ✅ |
| `apps/docs-site` | Docs Astro + Starlight (FR, détaillées) | ✅ |
| `docs-site` | Docs VitePress (EN, concises) | ✅ |
| Tests unitaires | core + server + SDKs | ✅ |

---

## 🚀 Ce qui reste : Déploiement & Production

### 1. Publication npm

- [ ] Configurer les versions et le versioning (Changesets recommandé)
- [ ] Vérifier les `package.json` de chaque package publiable (`files`, `exports`, `types`, `publishConfig`)
- [ ] Publier les packages `@domos/*` sur npm (public access)
- [ ] Valider l'installation depuis npm dans un projet vierge (React, Vue, Svelte, Angular, Browser)

### 2. Docs publiques (GitHub Pages)

- [ ] Passer le repo en public
- [ ] Activer GitHub Pages sur la doc VitePress (`docs-site`)
- [ ] Vérifier que le workflow de build/deploy docs tourne en CI
- [ ] Vérifier les liens et images du README une fois le repo public

### 3. Serveur de démo (hosting)

- [ ] Déployer `apps/demo-server` (Dockerfile déjà présent dans `docs-site/`)
- [ ] Configurer les variables d'environnement de prod (clés LLM, LiveKit, CORS allowlist)
- [ ] Déployer une demo client accessible publiquement
- [ ] Rate limiting et quotas côté serveur de demo

### 4. CI/CD

- [ ] Pipeline de build + test sur PR (Danger.js déjà présent)
- [ ] Pipeline de release automatisé (tag → publish npm + deploy docs)
- [ ] Badge de statut CI dans le README

### 5. Finitions open source (avant public)

- [x] `LICENSE` (MIT)
- [x] `CODE_OF_CONDUCT.md`
- [x] `SECURITY.md`
- [x] `README_EN.md`
- [ ] Templates d'issues et de PR (`.github/ISSUE_TEMPLATE`, `PULL_REQUEST_TEMPLATE.md`)
- [ ] Nettoyer les fichiers de travail internes (`sprints/`, `cahiers/`, `rapport/`, `TODO.md` historique) ou les déplacer hors du repo public

---

## 💡 Améliorations futures (post-lancement)

- Alignement complet de la doc EN (VitePress) avec la doc FR (Astro) — en cours
- Plus d'adaptateurs LLM selon la demande communauté
- Téléphonie / SIP via LiveKit (non implémenté)
- Exemples d'intégration supplémentaires (Next.js, Nuxt, SvelteKit en production)
