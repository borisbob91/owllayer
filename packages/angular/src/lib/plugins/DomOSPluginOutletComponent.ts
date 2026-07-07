import { Component, Input, OnChanges, Type } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import type { DomOSClientPlugin } from '@domos/core';
import { getPluginComponents } from './getPluginComponents.js';

/**
 * DomOSPluginOutletComponent — Rendu déclaratif d'un composant de plugin Angular.
 *
 * Raccourci pour getPluginComponents + NgComponentOutlet.
 * Retourne un hôte vide si le composant n'est pas déclaré dans le plugin.
 *
 * Le composant du plugin doit être un standalone Angular component.
 *
 * @public
 *
 * @example
 * ```html
 * <domos-plugin-outlet
 *   [plugin]="BarChartPlugin"
 *   component="BarChart"
 *   [inputs]="{ data: salesData, title: 'Ventes' }"
 * />
 * ```
 */
@Component({
  selector: 'domos-plugin-outlet',
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      *ngComponentOutlet="resolvedComponent; inputs: resolvedInputs"
    />
  `,
})
export class DomOSPluginOutletComponent implements OnChanges {
  @Input({ required: true }) plugin!: DomOSClientPlugin<any>;
  @Input({ required: true }) component!: string;
  @Input() inputs?: Record<string, unknown>;

  resolvedComponent: Type<any> | null = null;
  resolvedInputs: Record<string, unknown> = {};

  ngOnChanges(): void {
    const components = getPluginComponents(this.plugin);
    const found = components[this.component];
    this.resolvedComponent = found ? (found as Type<any>) : null;
    this.resolvedInputs = this.inputs ?? {};
  }
}
