import { Directive, Input, OnInit, OnDestroy } from '@angular/core';
import { injectOwlLayer } from '../providers/provideOwlLayer.js';
import type { OwlLayerToolDefinition, OwlLayerToolHandler } from '../types/types.js';

/**
 * OwlLayerToolDirective — Co-localise un outil OwlLayer sur un élément Angular.
 *
 * Directive standalone qui enregistre un outil OwlLayer au `ngOnInit` et le
 * désenregistre au `ngOnDestroy`, alignée sur le cycle de vie du template.
 *
 * @public
 *
 * @example
 * ```html
 * <button
 *   [owllayerToolName]="'add_to_cart'"
 *   [owllayerToolDescription]="'Ajouter au panier'"
 *   [owllayerToolHandler]="onAddToCart"
 *   [owllayerToolSchema]="cartSchema"
 * >
 *   Ajouter
 * </button>
 * ```
 */
@Directive({
  selector: '[owllayerToolName]',
  standalone: true,
})
export class OwlLayerToolDirective implements OnInit, OnDestroy {
  @Input() owllayerToolName!: string;
  @Input() owllayerToolDescription!: string;
  @Input() owllayerToolHandler!: OwlLayerToolHandler;
  @Input() owllayerToolSchema?: OwlLayerToolDefinition['schema'];
  @Input() owllayerToolRisk?: OwlLayerToolDefinition['risk'];

  private readonly owllayer: ReturnType<typeof injectOwlLayer>;
  private dispose?: VoidFunction;

  constructor() {
    this.owllayer = injectOwlLayer();
  }

  ngOnInit(): void {
    this.dispose = this.owllayer.registerTool(
      {
        name: this.owllayerToolName,
        description: this.owllayerToolDescription,
        schema: this.owllayerToolSchema,
        risk: this.owllayerToolRisk ?? 'low',
      },
      this.owllayerToolHandler
    );
  }

  ngOnDestroy(): void {
    this.dispose?.();
  }
}
