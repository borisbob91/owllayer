import { DestroyRef, inject, assertInInjectionContext } from '@angular/core';
import { injectDomOS } from '../providers/provideDomOS.js';

export interface DomOSAngularDevToolsOptions {
  /** Élément DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * injectDomOSDevTools — Monte le panneau DevTools @domos/ui dans une app Angular.
 *
 * Chargement dynamique de @domos/ui — n'impacte pas le bundle de production.
 * À conditionner par `import.meta.env.DEV`.
 *
 * @public
 *
 * @example
 * ```typescript
 * if (import.meta.env.DEV) injectDomOSDevTools();
 * ```
 */
export function injectDomOSDevTools(options: DomOSAngularDevToolsOptions = {}): void {
  assertInInjectionContext(injectDomOSDevTools);

  const domos = injectDomOS();
  const destroyRef = inject(DestroyRef);
  let el: HTMLElement | null = null;
  let unmountFn: ((el: Element) => void) | null = null;

  const container = options.container ?? (() => {
    const d = document.createElement('div');
    d.id = '__domos_devtools__';
    document.body.appendChild(d);
    return d;
  })();
  el = container;

  // @ts-ignore — @domos/ui est une dépendance optionnelle chargée à l'exécution
  (import(/* @vite-ignore */ '@domos/ui/devtools') as Promise<any>).then(({ mountDevTools, unmountDevTools }: any) => {
    if (!el) return;
    unmountFn = unmountDevTools;
    mountDevTools(el, {
      plugins: domos.getInstalledPlugins(),
      getRegisteredTools: () => domos.getRegisteredTools(),
      getEffectiveTools: () => domos.getEffectiveTools(),
      getIgnoredClientTools: () => domos.getIgnoredClientTools(),
      callTool: (name: string, args: Record<string, unknown>) => domos.callTool(name, args),
      getAgentState: () => domos.getAgentState(),
      getSessionId: () => domos.sessionId(),
      subscribeEvent: (type: any, listener: any) => domos.subscribeEvent(type, listener),
      subscribeAnyEvent: (listener: any) => domos.subscribeAnyEvent(listener),
    });
  });

  destroyRef.onDestroy(() => {
    if (el && unmountFn) {
      unmountFn(el);
      if (!options.container && el.parentNode) {
        el.parentNode.removeChild(el);
      }
      el = null;
    }
  });
}
