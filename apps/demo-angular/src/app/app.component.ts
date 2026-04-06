import { Component, signal } from '@angular/core';
import { injectDomOS } from '@domos/angular';
import { demoDomOSConfig } from './app.config.js';
import { registerDemoTools } from './register-demo-tools.js';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `
    <main class="shell">
      <section class="panel">
        <p class="eyebrow">Sprint 9</p>
        <h1>DomOS Angular final gate</h1>
        <p class="lead">
          Surface publique minimale de <strong>@domos/angular</strong> validee par la demo,
          sans dependance a <strong>@domos/ui</strong> ni import interne du package.
        </p>

        <dl class="facts">
          <div>
            <dt>Connexion</dt>
            <dd>{{ connection() }}</dd>
          </div>
          <div>
            <dt>Endpoint</dt>
            <dd>{{ endpoint }}</dd>
          </div>
          <div>
            <dt>Tool enregistre</dt>
            <dd>{{ toolName }}</dd>
          </div>
          <div>
            <dt>Derniere action</dt>
            <dd>{{ lastAction() }}</dd>
          </div>
        </dl>

        <div class="actions">
          <button type="button" (click)="reconnect()">Connecter</button>
          <button type="button" class="secondary" (click)="disconnect()">Deconnecter</button>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        color: #f6efe3;
        display: block;
        font-family: Georgia, 'Times New Roman', serif;
      }

      body {
        margin: 0;
      }

      .shell {
        align-items: center;
        background:
          radial-gradient(circle at top left, rgba(255, 185, 108, 0.22), transparent 30%),
          linear-gradient(135deg, #10212a 0%, #173845 48%, #29545f 100%);
        display: grid;
        min-height: 100vh;
        padding: 24px;
      }

      .panel {
        backdrop-filter: blur(10px);
        background: rgba(12, 23, 29, 0.78);
        border: 1px solid rgba(255, 240, 214, 0.18);
        border-radius: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
        margin: 0 auto;
        max-width: 720px;
        padding: 32px;
        width: 100%;
      }

      .eyebrow {
        color: #ffcf8b;
        font-size: 0.8rem;
        letter-spacing: 0.18em;
        margin: 0 0 12px;
        text-transform: uppercase;
      }

      h1 {
        font-size: clamp(2.2rem, 5vw, 4rem);
        line-height: 0.95;
        margin: 0 0 16px;
      }

      .lead {
        color: #dfd2c0;
        font-size: 1.05rem;
        line-height: 1.6;
        margin: 0 0 24px;
      }

      .facts {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin: 0 0 24px;
      }

      .facts div {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 14px;
      }

      dt {
        color: #a9c0c7;
        font-size: 0.8rem;
        margin-bottom: 8px;
        text-transform: uppercase;
      }

      dd {
        margin: 0;
      }

      .actions {
        display: flex;
        gap: 12px;
      }

      button {
        background: #ffcf8b;
        border: none;
        border-radius: 999px;
        color: #1d1f1f;
        cursor: pointer;
        font: inherit;
        padding: 12px 18px;
      }

      button.secondary {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #f6efe3;
      }

      @media (max-width: 640px) {
        .panel {
          padding: 24px;
        }

        .actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class AppComponent {
  readonly domos = injectDomOS();
  readonly endpoint = demoDomOSConfig.endpoint;
  readonly toolName = 'demo_echo';
  readonly connection = signal('deconnecte');
  readonly lastAction = signal('registerTool() en attente');

  private disposeTool: VoidFunction = () => {};

  async ngOnInit(): Promise<void> {
    this.disposeTool = registerDemoTools(this.domos);
    this.lastAction.set('registerTool() execute');
    await this.domos.connect();
    this.connection.set('connecte');
    this.lastAction.set('connect() execute');
  }

  ngOnDestroy(): void {
    this.disposeTool();
    void this.domos.disconnect();
    this.connection.set('deconnecte');
    this.lastAction.set('disconnect() execute');
  }

  async reconnect(): Promise<void> {
    await this.domos.connect();
    this.connection.set('connecte');
    this.lastAction.set('connect() execute');
  }

  async disconnect(): Promise<void> {
    await this.domos.disconnect();
    this.connection.set('deconnecte');
    this.lastAction.set('disconnect() execute');
  }
}