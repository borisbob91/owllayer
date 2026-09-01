import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OwlLayerWidgetComponent, injectOwlLayer, injectOwlLayerDevTools } from '@owllayer/angular';
import { demoOwlLayerConfig } from './app.config.js';
import { ListingsStoreService } from './marketplace/store/listings.store.js';
import { registerDemoTools } from './core/register-demo-tools.js';
import { I18nService } from './core/i18n/i18n.service.js';

/**
 * Shell principal de la marketplace Angular OwlLayer.
 * Démontre l'intégration complète:
 * - injectOwlLayer pour accès au client
 * - injectOwlLayerDevTools pour debug
 * - I18nService pour le support bilingue FR / EN
 * - OwlLayerWidgetComponent monté
 * - RouterModule pour les pages marketplace
 * - registerDemoTools pour tous les tools marketplace
 */
@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterModule, OwlLayerWidgetComponent],
  template: `
    <div class="marketplace-shell">
      <header class="app-header">
        <div class="brand">
          <h1 class="logo">🏪 {{ i18n.t().common.appName }}</h1>
          <p class="tagline">{{ i18n.t().common.tagline }}</p>
        </div>
        <nav class="main-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            {{ i18n.t().nav.home }}
          </a>
          <a routerLink="/favorites" routerLinkActive="active">
            ⭐ {{ i18n.t().nav.favorites }} ({{ favoriteCount() }})
          </a>
          <a routerLink="/edit" class="create-btn">
            + {{ i18n.t().nav.create }}
          </a>
        </nav>
        <div class="header-actions">
          <button class="lang-toggle-btn" (click)="i18n.toggleLocale()" aria-label="Toggle language">
            {{ i18n.locale() === 'fr' ? '🇬🇧 English' : '🇫🇷 Français' }}
          </button>
          <div class="connection-status">
            <span class="status-dot" [class.connected]="owllayer.state() === 'connected'"></span>
            {{ owllayer.state() === 'connected' ? i18n.t().nav.agentConnected : i18n.t().nav.agentDisconnected }}
          </div>
        </div>
      </header>

      <main class="app-content">
        <router-outlet />
      </main>

      <footer class="app-footer">
        <p>{{ i18n.t().common.appName }} — {{ i18n.locale() === 'fr' ? 'Démo SDK Angular' : 'Angular SDK Demo' }}</p>
        <p class="footer-meta">
          Endpoint: {{ endpoint }} | 
          {{ i18n.locale() === 'fr' ? 'Tools marketplace enregistrés' : 'Marketplace tools registered' }} | 
          {{ i18n.locale() === 'fr' ? 'Widget IA actif' : 'AI Widget active' }} ({{ i18n.locale().toUpperCase() }})
        </p>
      </footer>

      <!-- Widget natif Angular marketplace -->
      <owllayer-widget [client]="owllayer.client" [config]="widgetConfig()" />
    </div>
  `,
  styles: [
    `
      :host {
        color: #f6efe3;
        display: block;
        font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .marketplace-shell {
        background: linear-gradient(135deg, #10212a 0%, #173845 48%, #29545f 100%);
        min-height: 100vh;
      }

      .app-header {
        align-items: center;
        backdrop-filter: blur(10px);
        background: rgba(12, 23, 29, 0.78);
        border-bottom: 1px solid rgba(255, 240, 214, 0.18);
        display: flex;
        gap: 32px;
        padding: 16px 24px;
      }

      .brand {
        flex: 0 0 auto;
      }

      .logo {
        font-size: 1.5rem;
        margin: 0;
      }

      .tagline {
        color: #a9c0c7;
        font-size: 0.85rem;
        margin: 4px 0 0;
      }

      .main-nav {
        display: flex;
        flex: 1;
        gap: 12px;
      }

      .main-nav a {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        color: #f6efe3;
        padding: 10px 16px;
        text-decoration: none;
        transition: background 0.2s;
      }

      .main-nav a:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .main-nav a.active {
        background: rgba(255, 207, 139, 0.2);
        border: 1px solid #ffcf8b;
      }

      .header-actions {
        align-items: center;
        display: flex;
        gap: 16px;
      }

      .lang-toggle-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        color: #f6efe3;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 6px 14px;
        transition: all 0.2s;
      }

      .lang-toggle-btn:hover {
        background: rgba(255, 207, 139, 0.25);
        border-color: #ffcf8b;
        color: #ffcf8b;
      }

      .connection-status {
        align-items: center;
        color: #a9c0c7;
        display: flex;
        font-size: 0.9rem;
        gap: 8px;
      }

      .status-dot {
        background: #666;
        border-radius: 50%;
        height: 8px;
        width: 8px;
      }

      .status-dot.connected {
        background: #4ade80;
      }

      .app-content {
        min-height: calc(100vh - 200px);
      }

      .app-footer {
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        color: #a9c0c7;
        font-size: 0.9rem;
        padding: 24px;
        text-align: center;
      }

      .app-footer p {
        margin: 4px 0;
      }

      .footer-meta {
        color: #7a8c92;
        font-size: 0.8rem;
      }
    `,
  ],
})
export class AppComponent {
  readonly owllayer = injectOwlLayer();
  readonly i18n = inject(I18nService);
  readonly endpoint = demoOwlLayerConfig.endpoint;

  readonly widgetConfig = computed(() => ({
    agentName: this.i18n.t().chat.assistantName,
    agentTitle: this.i18n.t().chat.assistantSubtitle,
    mode: 'audio' as const,
  }));

  // Injection des devtools pour debug (démontre injectOwlLayerDevTools)
  private readonly devTools = injectOwlLayerDevTools();

  private readonly store = inject(ListingsStoreService);

  readonly favoriteCount = computed(() => this.store.favoriteIds().length);

  private disposeTool: VoidFunction = () => {};

  constructor() {
    // registerDemoTools() DOIT être dans le constructor (injection context requis)
    this.disposeTool = registerDemoTools();
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.owllayer.connect();
    } catch {
      // Serveur non disponible — la demo fonctionne sans connexion active
    }
  }

  ngOnDestroy(): void {
    this.disposeTool();
    void this.owllayer.disconnect();
  }
}
