import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DomOSWidgetComponent, injectDomOS, injectDomOSDevTools } from '@domos/angular';
import { demoDomOSConfig } from './app.config.js';
import { ListingsStoreService } from './marketplace/store/listings.store.js';
import { registerDemoTools } from './core/register-demo-tools.js';

/**
 * Shell principal de la marketplace Angular DomOS.
 * Démontre l'intégration complète:
 * - injectDomOS pour accès au client
 * - injectDomOSDevTools pour debug
 * - DomOSWidgetComponent monté
 * - RouterModule pour les pages marketplace
 * - registerDemoTools pour tous les tools marketplace
 */
@Component({
  standalone: true,
  selector: 'app-root',
  imports: [RouterModule, DomOSWidgetComponent],
  template: `
    <div class="marketplace-shell">
      <header class="app-header">
        <div class="brand">
          <h1 class="logo">🏪 Marketplace DomOS</h1>
          <p class="tagline">Petites annonces avec agent IA</p>
        </div>
        <nav class="main-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Annonces
          </a>
          <a routerLink="/favorites" routerLinkActive="active">
            ⭐ Favoris ({{ favoriteCount() }})
          </a>
          <a routerLink="/edit" class="create-btn">
            + Déposer une annonce
          </a>
        </nav>
        <div class="connection-status">
          <span class="status-dot" [class.connected]="domos.state() === 'connected'"></span>
          {{ domos.state() === 'connected' ? 'Connecté' : 'Déconnecté' }}
        </div>
      </header>

      <main class="app-content">
        <router-outlet />
      </main>

      <footer class="app-footer">
        <p>Marketplace DomOS — Démo SDK Angular</p>
        <p class="footer-meta">
          Endpoint: {{ endpoint }} | 
          Tools marketplace enregistrés | 
          Widget IA actif
        </p>
      </footer>

      <!-- Widget natif Angular marketplace -->
      <domos-widget [client]="domos.client" [config]="widgetConfig" />
    </div>
  `,
  styles: [
    `
      :host {
        color: #f6efe3;
        display: block;
        font-family: Georgia, 'Times New Roman', serif;
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

      .create-btn {
        background: #ffcf8b !important;
        color: #1d1f1f !important;
        font-weight: 600;
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
  readonly domos = injectDomOS();
  readonly endpoint = demoDomOSConfig.endpoint;
  readonly widgetConfig = {
    agentName: 'Assistant Marketplace',
    agentTitle: 'Marketplace',
    mode: 'audio' as const,
  };

  // Injection des devtools pour debug (démontre injectDomOSDevTools)
  private readonly devTools = injectDomOSDevTools();

  private readonly store = inject(ListingsStoreService);

  readonly favoriteCount = computed(() => this.store.favoriteIds().length);

  private disposeTool: VoidFunction = () => {};

  constructor() {
    // registerDemoTools() DOIT être dans le constructor (injection context requis)
    this.disposeTool = registerDemoTools();
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.domos.connect();
    } catch {
      // Serveur non disponible — la demo fonctionne sans connexion active
    }
  }

  ngOnDestroy(): void {
    this.disposeTool();
    void this.domos.disconnect();
  }
}
