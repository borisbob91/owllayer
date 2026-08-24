import { get } from 'svelte/store';
import { owlLayerClient, agentState, sessionId, subscribeAnyEvent, subscribeEvent } from '../stores/owllayer.store.js';

export interface CreateDevToolsOptions {
  /** Element DOM cible. Par défaut, un div ajouté au body. */
  container?: HTMLElement;
}

/**
 * createDevTools — Monte le panneau DevTools @owllayer/ui dans une app Svelte.
 *
 * Chargement dynamique de @owllayer/ui — n'impacte pas le bundle de production.
 * Les plugins installés via initOwlLayer() sont auto-détectés.
 * Retourne une fonction de cleanup (unmount + suppression du DOM).
 *
 * À appeler dans onMount, conditionné par `import.meta.env.DEV`.
 *
 * @example
 * ```svelte
 * <script>
 * import { onMount } from 'svelte';
 * import { createDevTools } from '@owllayer/svelte';
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
    d.id = '__owllayer_devtools__';
    document.body.appendChild(d);
    return d;
  })();

  const uiDevToolsPath = '@owllayer/ui/devtools';
  const legacyPath = '@owllayer/ui/devtools';
  const loadDevTools = () =>
    (import(/* @vite-ignore */ uiDevToolsPath) as Promise<any>).catch(
      () => import(/* @vite-ignore */ legacyPath) as Promise<any>,
    );
  const { mountDevTools, unmountDevTools } = await loadDevTools();

  mountDevTools(el, {
    plugins: get(owlLayerClient)?.registeredPlugins ?? [],
    getRegisteredTools: () => get(owlLayerClient)?.toolsInfo ?? [],
    getToolSurface: () => get(owlLayerClient)?.toolSurface ?? {
      effectiveTools: [],
      serverTools: [],
      clientTools: [],
      ignoredClientTools: [],
    },
    getEffectiveTools: () => get(owlLayerClient)?.effectiveTools ?? [],
    getIgnoredClientTools: () => get(owlLayerClient)?.ignoredClientTools ?? [],
    callTool: (name: string, args: Record<string, unknown>) => {
      const client = get(owlLayerClient);
      if (!client) return Promise.reject(new Error('OwlLayer non initialisé'));
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
