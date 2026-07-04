'use client';

import { useEffect, useRef, useContext } from 'react';
import type {
  DomOSClientAnyEventListener,
  DomOSClientEventListener,
  DomOSClientEventType,
} from '@domos/core';
import { DomOSContext } from '../provider/DomOSContext.js';

export interface UseDevToolsOptions {
  /** Element DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * useDevTools — Monte le panneau DevTools @domos/ui dans l'app React.
 *
 * Chargement dynamique de @domos/ui — n'impacte pas le bundle de production.
 * Les plugins installés via DomOSProvider sont auto-détectés.
 * À conditionner par `import.meta.env.DEV`.
 *
 * @example
 * ```tsx
 * if (import.meta.env.DEV) useDevTools();
 * ```
 */
export function useDevTools(options: UseDevToolsOptions = {}): void {
  const ctx = useContext(DomOSContext);
  const containerRef = useRef<HTMLElement | null>(null);
  const unmountRef = useRef<((el: Element) => void) | null>(null);

  useEffect(() => {
    if (!ctx) return;

    let active = true;

    const el = options.container ?? (() => {
      const d = document.createElement('div');
      d.id = '__domos_devtools__';
      document.body.appendChild(d);
      return d;
    })();
    containerRef.current = el;

    // @ts-ignore — @domos/ui est une dépendance optionnelle chargée à l'exécution
    (import(/* @vite-ignore */ '@domos/ui/devtools') as Promise<any>).then(({ mountDevTools, unmountDevTools }: any) => {
      if (!active) return;
      unmountRef.current = unmountDevTools;
      mountDevTools(el, {
        plugins: ctx.getInstalledPlugins(),
        getRegisteredTools: () => ctx.getRegisteredTools(),
        getToolSurface: () => ctx.toolSurface,
        getEffectiveTools: () => ctx.getEffectiveTools(),
        getIgnoredClientTools: () => ctx.getIgnoredClientTools(),
        callTool: (name: string, args: Record<string, unknown>) => ctx.callTool(name, args),
        getAgentState: () => ctx.agentState,
        getSessionId: () => ctx.sessionId,
        subscribeEvent: <TType extends DomOSClientEventType>(type: TType, listener: DomOSClientEventListener<TType>) => ctx.subscribeEvent(type, listener),
        subscribeAnyEvent: (listener: DomOSClientAnyEventListener) => ctx.subscribeAnyEvent(listener),
      });
    });

    return () => {
      active = false;
      if (containerRef.current && unmountRef.current) {
        unmountRef.current(containerRef.current);
        if (!options.container && containerRef.current.parentNode) {
          containerRef.current.parentNode.removeChild(containerRef.current);
        }
        containerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
