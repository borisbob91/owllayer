import { get } from 'svelte/store';
import { domosClient, agentState, sessionId, subscribeAnyEvent, subscribeEvent } from '../stores/domos.store.js';

export interface CreateDevToolsOptions {
  /** Element DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * createDevTools — Monte le panneau DevTools @domos/ui dans une app Svelte.
 *
 * Chargement dynamique de @domos/ui — n'impacte pas le bundle de production.
 * Les plugins installés via initDomOS() sont auto-détectés.
 * Retourne une fonction de cleanup (unmount + suppression du DOM).
 *
 * À appeler dans onMount, conditionné par `import.meta.env.DEV`.
 *
 * @example
 * ```svelte
 * <script>
 * import { onMount } from 'svelte';
 * import { createDevTools } from '@domos/svelte';
 *
 * let destroyDevTools: () => void;
 * onMount(async () => {
 *   if (import.meta.env.DEV) destroyDevTools = await createDevTools();
 * });
 * </script>
 * ```
 */
export async function createDevTools(options: CreateDevToolsOptions = {}): Promise<() => void> {
  const el = options.container ?? (() => {
    const d = document.createElement('div');
    d.id = '__domos_devtools__';
    document.body.appendChild(d);
    return d;
  })();

  // @ts-ignore — @domos/ui est une dépendance optionnelle chargée à l'exécution
  const { mountDevTools, unmountDevTools } = await (import('@domos/ui/devtools') as Promise<any>);

  mountDevTools(el, {
    plugins: get(domosClient)?.registeredPlugins ?? [],
    getRegisteredTools: () => get(domosClient)?.toolsInfo ?? [],
    callTool: (name: string, args: Record<string, unknown>) => {
      const client = get(domosClient);
      if (!client) return Promise.reject(new Error('DomOS non initialisé'));
      return client.callTool(name, args);
    },
    getAgentState: () => get(agentState),
    getSessionId: () => get(sessionId),
    subscribeEvent,
    subscribeAnyEvent,
  });

  return () => {
    unmountDevTools(el);
    if (!options.container && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  };
}
