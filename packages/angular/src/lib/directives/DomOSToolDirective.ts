import { Directive, Input, OnInit, OnDestroy } from '@angular/core';
import { injectDomOS } from '../providers/provideDomOS.js';
import type { DomOSToolDefinition, DomOSToolHandler } from '../types/types.js';

/**
 * DomOSToolDirective — Co-localise un outil DomOS sur un élément Angular.
 *
 * Directive standalone qui enregistre un outil DomOS au `ngOnInit` et le
 * désenregistre au `ngOnDestroy`, alignée sur le cycle de vie du template.
 *
 * @public
 *
 * @example
 * ```html
 * <button
 *   [domosToolName]="'add_to_cart'"
 *   [domosToolDescription]="'Ajouter au panier'"
 *   [domosToolHandler]="onAddToCart"
 *   [domosToolSchema]="cartSchema"
 * >
 *   Ajouter
 * </button>
 * ```
 */
@Directive({
  selector: '[domosToolName]',
  standalone: true,
})
export class DomOSToolDirective implements OnInit, OnDestroy {
  @Input() domosToolName!: string;
  @Input() domosToolDescription!: string;
  @Input() domosToolHandler!: DomOSToolHandler;
  @Input() domosToolSchema?: DomOSToolDefinition['schema'];
  @Input() domosToolRisk?: DomOSToolDefinition['risk'];

  private readonly domos: ReturnType<typeof injectDomOS>;
  private dispose?: VoidFunction;

  constructor() {
    this.domos = injectDomOS();
  }

  ngOnInit(): void {
    this.dispose = this.domos.registerTool(
      {
        name: this.domosToolName,
        description: this.domosToolDescription,
        schema: this.domosToolSchema,
        risk: this.domosToolRisk ?? 'low',
      },
      this.domosToolHandler
    );
  }

  ngOnDestroy(): void {
    this.dispose?.();
  }
}
