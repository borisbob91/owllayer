import {
  Component,
  Input,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DomOSClient,
  type WidgetConfig,
  type ApprovalRequest,
} from '@domos/core';
import { DomOSAngularService } from '../../services/DomOSAngularService.js';
import { FloatingButtonComponent } from './FloatingButton.component.js';
import { WidgetInnerComponent } from './WidgetInner.component.js';
import { DomOSApprovalModalComponent } from '../hitl/DomOSApprovalModalComponent.js';

import { WIDGET_STYLES } from './widget.styles.js';

@Component({
  selector: 'domos-widget',
  standalone: true,
  imports: [
    CommonModule,
    FloatingButtonComponent,
    WidgetInnerComponent,
    DomOSApprovalModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // Provide DomOSAngularService locally so WidgetInner can inject it
    {
      provide: DomOSAngularService,
      useFactory: (widget: DomOSWidgetComponent) => widget.getService(),
      deps: [DomOSWidgetComponent]
    }
  ],
  template: `
    <div class="domos-widget-root">
      <domos-floating-button
        *ngIf="!isOpen()"
        [isOpen]="isOpen()"
        [unreadCount]="unreadCount()"
        (onToggle)="handleOpen()"
      ></domos-floating-button>

      <domos-widget-inner
        *ngIf="isOpen()"
        [isClosing]="isClosing()"
        (onClose)="handleClose()"
      ></domos-widget-inner>

      <!-- Approval Modal (HITL) -->
      <domos-approval-modal
        [request]="pendingApproval()"
        [open]="!!pendingApproval()"
        (approve)="approveAction()"
        (deny)="denyAction()"
      />
    </div>
  `,
  styles: [WIDGET_STYLES]
})
export class DomOSWidgetComponent implements OnInit, OnDestroy {
  private readonly ngZone = inject(NgZone);

  @Input() apiKey?: string;
  @Input() endpoint?: string;
  @Input() client?: DomOSClient;
  @Input() config: WidgetConfig = {};

  isOpen = signal(false);
  isClosing = signal(false);
  unreadCount = signal(0);
  pendingApproval = signal<ApprovalRequest | null>(null);

  private _client: DomOSClient | null = null;
  private _service: DomOSAngularService | null = null;
  private _ownsClient = false;
  private approvalResolver: ((approved: boolean) => void) | null = null;
  private approvalUnsubscribe: VoidFunction | null = null;

  getService(): DomOSAngularService {
    if (!this._service) {
        this.initializeClient();
    }
    return this._service!;
  }

  ngOnInit(): void {
    // initializeClient is called lazily by getService if needed, or here
    if (!this._service) {
        this.initializeClient();
    }
  }

  private initializeClient(): void {
    const providedClient = this.client;
    if (providedClient) {
      this._client = providedClient;
      this._ownsClient = false;
    } else {
      const ep = this.endpoint;
      const key = this.apiKey;
      if (!ep || key === undefined) {
        throw new Error('DomOSWidget: endpoint/apiKey requis si client non fourni');
      }

      this._client = new DomOSClient({
        endpoint: ep,
        apiKey: key,
        autoReconnect: true,
      });
      this._ownsClient = true;
    }

    this._service = new DomOSAngularService(this._client);

    this.approvalUnsubscribe?.();
    this.approvalUnsubscribe = this._client.onEvent('approval.requested', ({ request, resolve }) => {
      this.ngZone.run(() => {
        this.pendingApproval.set(request);
        this.approvalResolver = (approved: boolean) => {
          resolve(approved);
          this.pendingApproval.set(null);
          this.approvalResolver = null;
        };
      });
    });

    if (this._ownsClient) {
      this._client.connect();
    }
  }

  ngOnDestroy(): void {
    this.approvalUnsubscribe?.();
    this.approvalUnsubscribe = null;
    if (this._ownsClient) {
      this._client?.destroy();
    }
    this._client = null;
    this._service = null;
  }

  handleOpen() {
    this.isOpen.set(true);
    this.isClosing.set(false);
    this.unreadCount.set(0);
  }

  handleClose() {
    this.isClosing.set(true);
    setTimeout(() => {
        this.isOpen.set(false);
        this.isClosing.set(false);
    }, 250);
  }

  approveAction(): void {
    this.approvalResolver?.(true);
  }

  denyAction(): void {
    this.approvalResolver?.(false);
  }
}
