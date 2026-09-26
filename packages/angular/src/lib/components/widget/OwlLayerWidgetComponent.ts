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
  OwlLayerClient,
  type WidgetConfig,
  type ApprovalRequest,
  type HitlLabels,
} from '@owllayer/core';
import { OwlLayerAngularService } from '../../services/OwlLayerAngularService.js';
import { FloatingButtonComponent } from './FloatingButton.component.js';
import { WidgetInnerComponent } from './WidgetInner.component.js';
import { OwlLayerApprovalModalComponent } from '../hitl/OwlLayerApprovalModalComponent.js';

import { OWLLAYER_ANGULAR_SERVICE } from '../../providers/provideOwlLayer.js';

import { WIDGET_STYLES } from './widget.styles.js';

@Component({
  selector: 'owllayer-widget',
  standalone: true,
  imports: [
    CommonModule,
    FloatingButtonComponent,
    WidgetInnerComponent,
    OwlLayerApprovalModalComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // Provide OwlLayerAngularService locally so WidgetInner can inject it
    {
      provide: OwlLayerAngularService,
      useFactory: (widget: OwlLayerWidgetComponent) => widget.getService(),
      deps: [OwlLayerWidgetComponent]
    }
  ],
  template: `
    <div class="owllayer-widget-root">
      <owllayer-floating-button
        *ngIf="!isOpen()"
        [isOpen]="isOpen()"
        [unreadCount]="unreadCount()"
        (onToggle)="handleOpen()"
      ></owllayer-floating-button>

      <owllayer-widget-inner
        *ngIf="isOpen()"
        [isClosing]="isClosing()"
        (onClose)="handleClose()"
      ></owllayer-widget-inner>

      <!-- Approval Modal (HITL) -->
      <owllayer-approval-modal
        [request]="pendingApproval()"
        [open]="!!pendingApproval()"
        [labels]="hitlLabels()"
        (approve)="approveAction()"
        (deny)="denyAction()"
      />
    </div>
  `,
  styles: [WIDGET_STYLES]
})
export class OwlLayerWidgetComponent implements OnInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly parentService = inject(OWLLAYER_ANGULAR_SERVICE, { optional: true });

  @Input() apiKey?: string;
  @Input() endpoint?: string;
  @Input() client?: OwlLayerClient;
  @Input() config: WidgetConfig = {};

  isOpen = signal(false);
  isClosing = signal(false);
  unreadCount = signal(0);
  pendingApproval = signal<ApprovalRequest | null>(null);

  private _client: OwlLayerClient | null = null;
  private _service: OwlLayerAngularService | null = null;
  private _ownsClient = false;
  private approvalResolver: ((approved: boolean) => void) | null = null;
  private approvalUnsubscribe: VoidFunction | null = null;

  getService(): OwlLayerAngularService {
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
    const parentService = this.parentService;
    const providedClient = this.client;

    if (providedClient && parentService && parentService.client === providedClient) {
      this._client = providedClient;
      this._service = parentService;
      this._ownsClient = false;
    } else if (!providedClient && !this.endpoint && !this.apiKey && parentService) {
      this._client = parentService.client;
      this._service = parentService;
      this._ownsClient = false;
    } else if (providedClient) {
      this._client = providedClient;
      this._ownsClient = false;
      this._service = new OwlLayerAngularService(this._client, 'angular-widget', this.ngZone);
    } else {
      const ep = this.endpoint;
      const key = this.apiKey;
      if (!ep || key === undefined) {
        throw new Error('OwlLayerWidget: endpoint/apiKey requis si client non fourni');
      }

      this._client = new OwlLayerClient({
        endpoint: ep,
        apiKey: key,
        autoReconnect: true,
      });
      this._ownsClient = true;
      this._service = new OwlLayerAngularService(this._client, 'angular-widget', this.ngZone);
    }

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

  /** Libelles HITL configures via provideOwlLayer({ hitl: { labels } }), si un service est disponible. */
  hitlLabels(): HitlLabels {
    return this._service?.hitlLabels ?? {};
  }
}
