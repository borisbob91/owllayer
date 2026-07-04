import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WIDGET_STYLES } from './widget.styles.js';

@Component({
  selector: 'domos-floating-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button class="fab" (click)="onToggle.emit()" aria-label="Ouvrir l'assistant">
      <!-- Halo d'animation derrière l'icône -->
      <span class="fab-halo"></span>

      <!-- Icône -->
      <span class="fab-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8"  y1="23" x2="16" y2="23"/>
        </svg>
      </span>

      <!-- Texte -->
      <span class="fab-content">
        <span class="fab-title">Assistant DomOS</span>
        <span class="fab-sub">Réponse immédiate</span>
      </span>

      <!-- Badge non-lu -->
      @if (unreadCount > 0) {
        <span class="fab-badge">{{ unreadCount }}</span>
      }
    </button>
  `,
  styles: [`
    :host { display: block; }

    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px 12px 14px;
      background: #ffffff;
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 999px;
      cursor: pointer;
      outline: none;
      text-decoration: none;
      user-select: none;
      box-shadow:
        0 4px 24px rgba(37, 99, 235, 0.14),
        0 1px 4px rgba(15, 23, 42, 0.08),
        0 0 0 1px rgba(255,255,255,0.8) inset;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.25s ease;
      animation: fabSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    }

    .fab:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow:
        0 8px 32px rgba(37, 99, 235, 0.22),
        0 2px 8px rgba(15, 23, 42, 0.1),
        0 0 0 1px rgba(255,255,255,0.9) inset;
    }
    .fab:active {
      transform: scale(0.97);
    }

    /* ---- Halo animé ---- */
    .fab-halo {
      position: absolute;
      inset: -2px;
      border-radius: 999px;
      background: linear-gradient(135deg, #6366f1, #3b82f6, #06b6d4);
      opacity: 0.12;
      animation: haloBreath 3s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes haloBreath {
      0%, 100% { opacity: 0.08; transform: scale(1); }
      50%       { opacity: 0.18; transform: scale(1.03); }
    }

    /* ---- Icône ---- */
    .fab-icon {
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(59,130,246,0.35);
      transition: box-shadow 0.2s;
    }
    .fab:hover .fab-icon {
      box-shadow: 0 6px 18px rgba(59,130,246,0.5);
    }
    .fab-icon svg {
      width: 18px;
      height: 18px;
      color: #ffffff;
    }

    /* ---- Texte ---- */
    .fab-content {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }
    .fab-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13.5px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }
    .fab-sub {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
    }

    /* ---- Badge ---- */
    .fab-badge {
      position: absolute;
      top: -6px;
      right: 10px;
      background: linear-gradient(135deg, #f97316, #ef4444);
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      padding: 0 5px;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(249,115,22,0.4);
      animation: badgePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    @keyframes badgePop {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    /* ---- Entrée ---- */
    @keyframes fabSlideIn {
      from { opacity: 0; transform: translateY(20px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class FloatingButtonComponent {
  @Input() isOpen!: boolean;
  @Input() unreadCount: number = 0;
  @Output() onToggle = new EventEmitter<void>();
}
