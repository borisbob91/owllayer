<script setup lang="ts">
// ============================================================
// OwlLayerToolBtn — self-rendered <button> with built-in agent tool.
//
// Difference from OwlLayerTool:
//   • OwlLayerTool    → wrapper around an EXISTING element
//   • OwlLayerToolBtn → renders its own <button>, styleable via class
//
// The handler is called via TWO independent paths:
//   1. User click → via the <button> @click
//   2. Agent call → via registerTool (independent of the DOM)
//
// Important — disabled does NOT block the agent:
//   disabled={true} disables the human click (UX feedback),
//   but registerTool is independent of the button state.
//   The agent can still trigger the action (e.g. while a loading spinner shows).
// ============================================================
import { computed, inject, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { OWLLAYER_CLIENT_KEY } from '../../plugin/OwlLayerPlugin.js';

const props = defineProps<{
  name: string;
  description: string;
  risk?: 'none' | 'low' | 'high' | 'critical';
  context?: Record<string, unknown>;
  handler: () => unknown | Promise<unknown>;
  class?: string;
  disabled?: boolean;
}>();

const client = inject(OWLLAYER_CLIENT_KEY);
const componentId = getCurrentInstance()?.uid?.toString() ?? Math.random().toString(36).slice(2);

if (!client) {
  throw new Error('OwlLayerToolBtn: OwlLayerPlugin is not installed.');
}

// Serialize context appended to description.
const fullDescription = computed(() =>
  props.context
    ? `${props.description}. Context: ${JSON.stringify(props.context)}`
    : props.description
);

// Independent registration — the agent calls this path directly.
onMounted(() => {
  client!.registerTool({
    declaration: {
      name: props.name,
      description: fullDescription.value,
      risk: props.risk ?? 'none',
    },
    handler: () => Promise.resolve(props.handler()),
    componentId,
  });
});

onUnmounted(() => {
  client!.unregisterTool(props.name);
});
</script>

<template>
  <!--
    disabled blocks human click only.
    The agent calls the handler via registerTool — independent of button state.
  -->
  <button :class="props.class" :disabled="disabled" @click="() => handler()">
    <slot />
  </button>
</template>
