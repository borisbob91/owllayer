import { DestroyRef, inject, assertInInjectionContext } from '@angular/core';
import { injectOwlLayer } from '../providers/provideOwlLayer.js';

export interface OwlLayerAngularDevToolsOptions {
  /** Élément DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * injectOwlLayerDevTools — Monte le panneau DevTools @owllayer/ui dans une app Angular.
 *
 * Chargement dynamique de @owllayer/ui — n'impacte pas le bundle de production.
 * À conditionner par `import.meta.env.DEV`.
 *
 * @public
 *
 * @example
 * ```typescript
 * if (import.meta.env.DEV) injectOwlLayerDevTools();
 * ```
 */
export function injectOwlLayerDevTools(options: OwlLayerAngularDevToolsOptions = {}): void {
  assertInInjectionContext(injectOwlLayerDevTools);

  const owllayer = injectOwlLayer();
  const destroyRef = inject(DestroyRef);
  let el: HTMLElement | null = null;
  let unmountFn: ((el: Element) => void) | null = null;

  const container = options.container ?? (() => {
    const d = document.createElement('div');
    d.id = '__owllayer_devtools__';
    document.body.appendChild(d);
    return d;
  })();
  el = container;

  const uiDevToolsPath = '@owllayer/ui/devtools';
  const legacyPath = '@owllayer/ui/devtools';
  const loadDevTools = () =>
    (import(/* @vite-ignore */ uiDevToolsPath) as Promise<any>).catch(
      () => import(/* @vite-ignore */ legacyPath) as Promise<any>,
    );

  loadDevTools().then(({ mountDevTools, unmountDevTools }: any) => {
    if (!el) return;
    unmountFn = unmountDevTools;
    mountDevTools(el, {
      plugins: owllayer.getInstalledPlugins(),
      getRegisteredTools: () => owllayer.getRegisteredTools(),
      getEffectiveTools: () => owllayer.getEffectiveTools(),
      getIgnoredClientTools: () => owllayer.getIgnoredClientTools(),
      callTool: (name: string, args: Record<string, unknown>) => owllayer.callTool(name, args),
      getAgentState: () => owllayer.getAgentState(),
      getSessionId: () => owllayer.sessionId(),
      subscribeEvent: (type: any, listener: any) => owllayer.subscribeEvent(type, listener),
      subscribeAnyEvent: (listener: any) => owllayer.subscribeAnyEvent(listener),
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
