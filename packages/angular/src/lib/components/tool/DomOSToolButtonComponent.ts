import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { injectDomOS } from '../../providers/provideDomOS.js';
import type { DomOSToolDefinition, DomOSToolHandler } from '../../types/types.js';

/**
 * DomOSToolButtonComponent — Bouton standalone qui enregistre et déclenche un outil DomOS.
 *
 * Utile pour valider un tool en développement ou exposer une action manuelle à
 * l'utilisateur. Enregistre l'outil au `ngOnInit` (si un handler est fourni) et le
 * désenregistre au `ngOnDestroy`. Peut aussi simplement invoquer un tool déjà existant.
 *
 * @public
 *
 * @example
 * ```html
 * <domos-tool-button
 *   toolName="contact_seller"
 *   [toolArgs]="{ listingId: 1 }"
 *   buttonClass="contact-btn"
 * >
 *   Contacter le vendeur
 * </domos-tool-button>
 * ```
 */
@Component({
  selector: 'domos-tool-button',
  standalone: true,
  template: `
    <button type="button" (click)="invoke()" [class]="buttonClass">
      <ng-content>{{ label }}</ng-content>
    </button>
  `,
})
export class DomOSToolButtonComponent implements OnInit, OnDestroy {
  @Input() name?: string;
  @Input() toolName?: string;

  @Input() description?: string;
  @Input() handler?: DomOSToolHandler;
  @Input() label = 'Invoke';
  @Input() schema?: DomOSToolDefinition['schema'];
  @Input() risk?: DomOSToolDefinition['risk'];

  @Input() toolArgs?: Record<string, unknown>;
  @Input() buttonClass?: string;

  private readonly domos: ReturnType<typeof injectDomOS>;
  private dispose?: VoidFunction;

  constructor() {
    this.domos = injectDomOS();
  }

  get resolvedName(): string {
    return this.toolName || this.name || '';
  }

  ngOnInit(): void {
    if (this.handler && this.description && this.resolvedName) {
      this.dispose = this.domos.registerTool(
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
      this.domos.callTool(this.resolvedName, this.toolArgs ?? {});
    }
  }
}
