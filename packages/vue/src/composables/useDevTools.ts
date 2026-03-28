import { inject, onMounted, onUnmounted } from 'vue';
import { DOMOS_CLIENT_KEY, DOMOS_STATE_KEY } from '../plugin/DomOSPlugin.js';

export interface UseDevToolsOptions {
  /** Element DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * useDevTools — Monte le panneau DevTools @domos/ui dans l'app Vue.
 *
 * Chargement dynamique de @domos/ui — n'impacte pas le bundle de production.
 * Les plugins installés via DomOSPlugin sont auto-détectés.
 * À conditionner par `import.meta.env.DEV`.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useDevTools } from '@domos/vue';
 * if (import.meta.env.DEV) useDevTools();
 * </script>
 * ```
 */
export function useDevTools(options: UseDevToolsOptions = {}): void {
  const client = inject(DOMOS_CLIENT_KEY);
  const state = inject(DOMOS_STATE_KEY);

  let el: HTMLElement | null = null;
  let unmountFn: ((el: Element) => void) | null = null;

  onMounted(async () => {
    el = options.container ?? (() => {
      const d = document.createElement('div');
      d.id = '__domos_devtools__';
      document.body.appendChild(d);
      return d;
    })();

    // @ts-ignore — @domos/ui est une dépendance optionnelle chargée à l'exécution
    const { mountDevTools, unmountDevTools } = await (import('@domos/ui/devtools') as Promise<any>);
    unmountFn = unmountDevTools;
    mountDevTools(el, {
      plugins: client?.registeredPlugins ?? [],
      getRegisteredTools: () => client?.toolsInfo ?? [],
      callTool: (name: string, args: Record<string, unknown>) => {
        if (!client) return Promise.reject(new Error('DomOSPlugin non installé'));
        return client.callTool(name, args);
      },
      getAgentState: () => state?.agentState ?? 'disconnected',
      getSessionId: () => state?.sessionId ?? null,
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
