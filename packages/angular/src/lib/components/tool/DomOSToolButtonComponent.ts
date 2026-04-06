import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { injectDomOS } from '../../providers/provideDomOS.js';
import type { DomOSToolDefinition, DomOSToolHandler } from '../../types/types.js';

/**
 * DomOSToolButtonComponent — Bouton standalone qui enregistre et déclenche un outil DomOS.
 *
 * Utile pour valider un tool en développement ou exposer une action manuelle à
 * l'utilisateur. Enregistre l'outil au `ngOnInit` et le désenregistre au
 * `ngOnDestroy`.
 *
 * @public
 *
 * @example
 * ```html
 * <domos-tool-button
 *   name="search_products"
 *   description="Rechercher des produits"
 *   [handler]="onSearch"
 *   label="Rechercher"
 * />
 * ```
 */
@Component({
  selector: 'domos-tool-button',
  standalone: true,
  template: `<button type="button" (click)="invoke()">{{ label }}</button>`,
})
export class DomOSToolButtonComponent implements OnInit, OnDestroy {
  @Input() name!: string;
  @Input() description!: string;
  @Input() handler!: DomOSToolHandler;
  @Input() label = 'Invoke';
  @Input() schema?: DomOSToolDefinition['schema'];
  @Input() risk?: DomOSToolDefinition['risk'];

  private readonly domos: ReturnType<typeof injectDomOS>;
  private dispose?: VoidFunction;

  constructor() {
    this.domos = injectDomOS();
  }

  ngOnInit(): void {
    this.dispose = this.domos.registerTool(
      {
        name: this.name,
        description: this.description,
        schema: this.schema,
        risk: this.risk ?? 'low',
      },
      this.handler
    );
  }

  ngOnDestroy(): void {
    this.dispose?.();
  }

  invoke(): void {
    this.domos.callTool(this.name, {});
  }
}
