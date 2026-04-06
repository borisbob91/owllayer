import {
  assertInInjectionContext,
  DestroyRef,
  effect,
  inject,
  Injector,
} from '@angular/core';
import { injectDomOS } from './provideDomOS.js';
import type { DomOSContextInput } from './types.js';

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