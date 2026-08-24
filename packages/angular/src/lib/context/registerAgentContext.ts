import {
  assertInInjectionContext,
  DestroyRef,
  effect,
  inject,
  Injector,
} from '@angular/core';
import { injectOwlLayer } from '../providers/provideOwlLayer.js';
import type { OwlLayerContextInput } from '../types/types.js';

/**
 * registerContext — Enregistre un contexte passif envoyé à l'agent OwlLayer.
 *
 * Accepte un objet statique ou un getter réactif (Signal/fonction). Si un
 * getter est fourni, le contexte est réévalué à chaque changement via `effect`.
 *
 * @public
 *
 * @example
 * ```typescript
 * // Contexte statique
 * registerContext({ page: 'home' });
 *
 * // Contexte réactif
 * registerContext(() => ({ page: currentRoute() }));
 * ```
 */
export function registerContext(dataOrGetter: OwlLayerContextInput): VoidFunction {
  assertInInjectionContext(registerContext);

  const owllayer = injectOwlLayer();

  if (typeof dataOrGetter !== 'function') {
    owllayer.updateContext(dataOrGetter);
    return () => {};
  }

  const destroyRef = inject(DestroyRef);
  const injector = inject(Injector);
  const contextEffect = effect(
    () => {
      owllayer.updateContext(dataOrGetter());
    },
    { injector }
  );

  const dispose = () => {
    contextEffect.destroy();
  };

  destroyRef.onDestroy(dispose);

  return dispose;
}
