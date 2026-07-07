import {
  assertInInjectionContext,
  DestroyRef,
  effect,
  inject,
  Injector,
} from '@angular/core';
import { injectDomOS } from '../providers/provideDomOS.js';
import type { DomOSContextInput } from '../types/types.js';

/**
 * registerContext — Enregistre un contexte passif envoyé à l'agent DomOS.
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
export function registerContext(dataOrGetter: DomOSContextInput): VoidFunction {
  assertInInjectionContext(registerContext);

  const domos = injectDomOS();

  if (typeof dataOrGetter !== 'function') {
    domos.updateContext(dataOrGetter);
    return () => {};
  }

  const destroyRef = inject(DestroyRef);
  const injector = inject(Injector);
  const contextEffect = effect(
    () => {
      domos.updateContext(dataOrGetter());
    },
    { injector }
  );

  const dispose = () => {
    contextEffect.destroy();
  };

  destroyRef.onDestroy(dispose);

  return dispose;
}
