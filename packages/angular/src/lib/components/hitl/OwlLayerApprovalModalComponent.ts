import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ApprovalRequest, HitlLabels } from '@owllayer/core';

/**
 * OwlLayerApprovalModalComponent — Modale d'approbation HITL pour actions à risque.
 *
 * Surface officielle d'approbation pour le widget Angular.
 * Affiche les détails d'une `ApprovalRequest` et permet d'approuver ou refuser.
 *
 * @example
 * ```typescript
 * import { OwlLayerApprovalModalComponent } from '@owllayer/angular';
 *
 * @Component({
 *   standalone: true,
 *   imports: [OwlLayerApprovalModalComponent],
 *   template: `
 *     <owllayer-approval-modal
 *       [request]="pendingApproval"
 *       [open]="!!pendingApproval"
 *       (approve)="handleApprove()"
 *       (deny)="handleDeny()"
 *     />
 *   `,
 * })
 * export class MyComponent {}
 * ```
 */
@Component({
  selector: 'owllayer-approval-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="owllayer-modal-overlay">
        <div class="owllayer-modal">
          <div class="owllayer-modal__header" [style.border-color]="riskColor()">
            <span class="owllayer-modal__badge" [style.background]="riskColor()">
              {{ riskLabel() }}
            </span>
            <h3 class="owllayer-modal__title">{{ titleText() }}</h3>
          </div>

          <div class="owllayer-modal__body">
            <p class="owllayer-modal__message">{{ messageText() }}</p>

            @if (hasArgs()) {
              <div class="owllayer-modal__args">
                <p class="owllayer-modal__args-label">Paramètres :</p>
                <pre class="owllayer-modal__args-code">{{ formatArgs() }}</pre>
              </div>
            }
          </div>

          <div class="owllayer-modal__actions">
            <button class="owllayer-modal__btn owllayer-modal__btn--deny" (click)="deny.emit()">
              {{ denyText() }}
            </button>
            <button class="owllayer-modal__btn owllayer-modal__btn--approve" (click)="approve.emit()">
              {{ approveText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .owllayer-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: system-ui, sans-serif;
    }

    .owllayer-modal {
      background: white;
      border-radius: 12px;
      width: 420px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .owllayer-modal__header {
      padding: 16px 20px;
      border-bottom: 3px solid;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .owllayer-modal__badge {
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .owllayer-modal__title {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .owllayer-modal__body {
      padding: 20px;
    }

    .owllayer-modal__message {
      color: #374151;
      font-size: 14px;
      margin: 0;
    }

    .owllayer-modal__args {
      margin-top: 12px;
    }

    .owllayer-modal__args-label {
      font-size: 12px;
      color: #6b7280;
      margin: 0 0 4px;
    }

    .owllayer-modal__args-code {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      overflow-x: auto;
      margin: 0;
    }

    .owllayer-modal__actions {
      padding: 12px 20px;
      background: #f9fafb;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .owllayer-modal__btn {
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
    }

    .owllayer-modal__btn--deny {
      background: #e5e7eb;
      color: #374151;
    }

    .owllayer-modal__btn--deny:hover {
      background: #d1d5db;
    }

    .owllayer-modal__btn--approve {
      background: #0070c7;
      color: white;
    }

    .owllayer-modal__btn--approve:hover {
      background: #0059a1;
    }
  `],
})
export class OwlLayerApprovalModalComponent {
  // ---- Inputs ----
  @Input() request: ApprovalRequest | null = null;
  @Input() open: boolean = false;
  /** Libelles de l'UI d'approbation (tous optionnels, textes actuels par defaut) */
  @Input() labels: HitlLabels | null = null;

  // ---- Outputs ----
  @Output() approve = new EventEmitter<void>();
  @Output() deny = new EventEmitter<void>();

  // ---- Derived state ----
  riskLabel = computed(() => {
    const risk = this.request?.risk;
    return risk === 'critical' ? 'CRITIQUE' : 'IMPORTANT';
  });

  riskColor = computed(() => {
    const risk = this.request?.risk;
    return risk === 'critical' ? '#dc2626' : '#f59e0b';
  });

  hasArgs = computed(() => {
    const args = this.request?.args;
    return args && Object.keys(args).length > 0;
  });

  formatArgs(): string {
    const args = this.request?.args;
    return args ? JSON.stringify(args, null, 2) : '';
  }

  // ---- Libelles HITL (labels), textes actuels par defaut ----
  titleText(): string {
    return this.labels?.title ?? 'Approbation requise';
  }

  messageText(): string {
    return this.labels?.message ?? this.request?.message ?? '';
  }

  denyText(): string {
    return this.labels?.deny ?? 'Refuser';
  }

  approveText(): string {
    return this.labels?.approve ?? 'Approuver';
  }
}
