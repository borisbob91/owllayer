import { inject, watch, toRefs, type Ref } from 'vue';
import { OWLLAYER_CLIENT_KEY } from '../plugin/OwlLayerPlugin.js';

/**
 * useAgentContext - Injecter des donnees contextuelles passives pour le LLM.
 *
 * Contrairement a useAgentTool, ceci ne cree pas d'outil.
 * Ca fournit simplement des informations supplementaires au LLM.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAgentContext } from '@owllayer/vue';
 * import { computed } from 'vue';
 *
 * const props = defineProps<{ user: { id: string; name: string } }>();
 *
 * // Reactif - se met a jour quand les props changent
 * useAgentContext(() => ({
 *   userId: props.user.id,
 *   userName: props.user.name,
 * }));
 * </script>
 * ```
 */
export function useAgentContext(
  dataOrGetter: Record<string, unknown> | (() => Record<string, unknown>)
): void {
  const client = inject(OWLLAYER_CLIENT_KEY);

  if (!client) {
    throw new Error('useAgentContext: OwlLayerPlugin non installe.');
  }

  if (typeof dataOrGetter === 'function') {
    // Mode reactif - watch le getter
    watch(
      dataOrGetter,
      (newData) => {
        client.updateContext(newData);
      },
      { immediate: true, deep: true }
    );
  } else {
    // Mode statique
    client.updateContext(dataOrGetter);
  }
}
