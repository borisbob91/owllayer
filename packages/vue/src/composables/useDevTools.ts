import { inject, onMounted, onUnmounted } from 'vue';
import type {
  OwlLayerClientAnyEventListener,
  OwlLayerClientEventListener,
  OwlLayerClientEventType,
} from '@owllayer/core';
import { OWLLAYER_CLIENT_KEY, OWLLAYER_STATE_KEY } from '../plugin/OwlLayerPlugin.js';

export interface UseDevToolsOptions {
  /** Element DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * useDevTools — Monte le panneau DevTools @owllayer/ui dans l'app Vue.
 *
 * Chargement dynamique de @owllayer/ui — n'impacte pas le bundle de production.
 * Les plugins installés via OwlLayerPlugin sont auto-détectés.
 * À conditionner par `import.meta.env.DEV`.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useDevTools } from '@owllayer/vue';
 * if (import.meta.env.DEV) useDevTools();
 * </script>
 * ```
 */
export function useDevTools(options: UseDevToolsOptions = {}): void {
  const client = inject(OWLLAYER_CLIENT_KEY);
  const state = inject(OWLLAYER_STATE_KEY);

  let el: HTMLElement | null = null;
  let unmountFn: ((el: Element) => void) | null = null;

  onMounted(async () => {
    el = options.container ?? (() => {
      const d = document.createElement('div');
      d.id = '__owllayer_devtools__';
      document.body.appendChild(d);
      return d;
    })();

    const legacyPath = '@owllayer/ui/devtools';
    const loadDevTools = () =>
      (import(/* @vite-ignore */ '@owllayer/ui/devtools') as Promise<any>).catch(
        () => import(/* @vite-ignore */ legacyPath) as Promise<any>,
      );
    const { mountDevTools, unmountDevTools } = await loadDevTools();
    unmountFn = unmountDevTools;
    mountDevTools(el, {
      plugins: client?.registeredPlugins ?? [],
      getRegisteredTools: () => client?.toolsInfo ?? [],
      getToolSurface: () => client?.toolSurface ?? {
        effectiveTools: [],
        serverTools: [],
        clientTools: [],
        ignoredClientTools: [],
      },
      getEffectiveTools: () => client?.effectiveTools ?? [],
      getIgnoredClientTools: () => client?.ignoredClientTools ?? [],
      callTool: (name: string, args: Record<string, unknown>) => {
        if (!client) return Promise.reject(new Error('OwlLayerPlugin non installé'));
        return client.callTool(name, args);
      },
      getAgentState: () => state?.agentState ?? 'disconnected',
      getSessionId: () => state?.sessionId ?? null,
      subscribeEvent: <TType extends OwlLayerClientEventType>(type: TType, listener: OwlLayerClientEventListener<TType>) => {
        if (!client) return () => {};
        client.onEvent(type, listener);
        return () => {
          client.offEvent(type, listener);
        };
      },
      subscribeAnyEvent: (listener: OwlLayerClientAnyEventListener) => {
        if (!client) return () => {};
        client.onAnyEvent(listener);
        return () => {
          client.offAnyEvent(listener);
        };
      },
    });
  });

  onUnmounted(() => {
    if (el && unmountFn) {
      unmountFn(el);
      if (!options.container && el.parentNode) {
        el.parentNode.removeChild(el);
      }
      el = null;
    }
  });
}
