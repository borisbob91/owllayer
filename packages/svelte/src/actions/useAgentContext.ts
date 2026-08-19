import { get } from 'svelte/store';
import { owlLayerClient } from '../stores/owllayer.store.js';

/**
 * Action Svelte pour injecter du contexte.
 *
 * @example
 * ```svelte
 * <div use:agentContext={{ userId: user.id, page: 'profile' }}>
 *   ...
 * </div>
 * ```
 */
export function agentContext(node: HTMLElement, data: Record<string, unknown>) {
  const client = get(owlLayerClient);
  client?.updateContext(data);

  return {
    update(newData: Record<string, unknown>) {
      client?.updateContext(newData);
    },
  };
}
