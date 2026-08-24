import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { injectOwlLayer } from '../../providers/provideOwlLayer.js';
import type { OwlLayerToolDefinition, OwlLayerToolHandler } from '../../types/types.js';

/**
 * OwlLayerToolButtonComponent — Bouton standalone qui enregistre et déclenche un outil OwlLayer.
 *
 * Utile pour valider un tool en développement ou exposer une action manuelle à
 * l'utilisateur. Enregistre l'outil au `ngOnInit` (si un handler est fourni) et le
 * désenregistre au `ngOnDestroy`. Peut aussi simplement invoquer un tool déjà existant.
 *
 * @public
 *
 * @example
 * ```html
 * <owllayer-tool-button
 *   toolName="contact_seller"
 *   [toolArgs]="{ listingId: 1 }"
 *   buttonClass="contact-btn"
 * >
 *   Contacter le vendeur
 * </owllayer-tool-button>
 * ```
 */
@Component({
  selector: 'owllayer-tool-button',
  standalone: true,
  template: `
    <button type="button" (click)="invoke()" [class]="buttonClass">
      <ng-content>{{ label }}</ng-content>
    </button>
  `,
})
export class OwlLayerToolButtonComponent implements OnInit, OnDestroy {
  @Input() name?: string;
  @Input() toolName?: string;

  @Input() description?: string;
  @Input() handler?: OwlLayerToolHandler;
  @Input() label = 'Invoke';
  @Input() schema?: OwlLayerToolDefinition['schema'];
  @Input() risk?: OwlLayerToolDefinition['risk'];

  @Input() toolArgs?: Record<string, unknown>;
  @Input() buttonClass?: string;

  private readonly owllayer: ReturnType<typeof injectOwlLayer>;
  private dispose?: VoidFunction;

  constructor() {
    this.owllayer = injectOwlLayer();
  }

  get resolvedName(): string {
    return this.toolName || this.name || '';
  }

  ngOnInit(): void {
    if (this.handler && this.description && this.resolvedName) {
      this.dispose = this.owllayer.registerTool(
        {
          name: this.resolvedName,
          description: this.description,
          schema: this.schema,
          risk: this.risk ?? 'low',
        },
        this.handler
      );
    }
  }

  ngOnDestroy(): void {
    this.dispose?.();
  }

  invoke(): void {
    if (this.resolvedName) {
      this.owllayer.callTool(this.resolvedName, this.toolArgs ?? {});
    }
  }
}
