<script setup lang="ts">
// ============================================================
// DomOSTool — transparent wrapper that co-locates an agent tool
// directly with its UI element.
//
// How it works:
//   • Renders a <span style="display:contents"> — invisible to layout
//   • Registers a tool via the DomOS client (onMounted / onUnmounted)
//   • Agent triggers either a DOM action on the child, or a direct handler
//   • Re-registers when context changes (watch on fullDescription)
//
// DomOSTool vs useAgentTool — when to use which:
//
//   ✅ DomOSTool — single standalone element, outside a list
//      <DomOSTool name="clear_cart" action="click" ...>
//        <button @click="clearCart">Clear cart</button>
//      </DomOSTool>
//
//   ✅ useAgentTool — N elements in a v-for loop
//      → one tool with an exhaustive description of all items
//      → avoids N near-identical tools that confuse the LLM
//
// Supported actions:
//   • click          → element.click()
//   • focus          → element.focus()
//   • scrollIntoView → element.scrollIntoView({ behavior: 'smooth' })
//   • show           → element.style.display = ''
//   • hide           → element.style.display = 'none'
// ============================================================
import { ref, computed, inject, onMounted, onUnmounted, watch, getCurrentInstance } from 'vue';
import type { ToolDeclaration } from '@domos/core';
import { DOMOS_CLIENT_KEY } from '../../plugin/DomOSPlugin.js';

const props = defineProps<{
  name: string;
  description: string;
  risk?: 'none' | 'low' | 'high' | 'critical';
  context?: Record<string, unknown>;
  action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
  handler?: () => unknown | Promise<unknown>;
}>();

// Runtime validation — one of action or handler is required, not both
if (props.action && props.handler) {
  throw new Error(`DomOSTool "${props.name}": provide action OR handler, not both.`);
}
if (!props.action && !props.handler) {
  throw new Error(`DomOSTool "${props.name}": action or handler is required.`);
}

const wrapperEl = ref<HTMLElement | null>(null);
const client = inject(DOMOS_CLIENT_KEY);
const componentId = getCurrentInstance()?.uid?.toString() ?? Math.random().toString(36).slice(2);

if (!client) {
  throw new Error('DomOSTool: DomOSPlugin is not installed.');
}

// Serialize context appended to description.
// When context changes, fullDescription changes → watch re-registers the tool.
const fullDescription = computed(() =>
  props.context
    ? `${props.description}. Context: ${JSON.stringify(props.context)}`
    : props.description
);

async function toolHandler(): Promise<unknown> {
  if (props.handler) return props.handler();
  const child = wrapperEl.value?.firstElementChild as HTMLElement | null;
  if (!child) return;
  switch (props.action) {
    case 'click':          child.click(); break;
    case 'focus':          child.focus(); break;
    case 'scrollIntoView': child.scrollIntoView({ behavior: 'smooth' }); break;
    case 'show':           child.style.display = ''; break;
    case 'hide':           child.style.display = 'none'; break;
  }
}

function buildDeclaration(): ToolDeclaration {
  return {
    name: props.name,
    description: fullDescription.value,
    risk: props.risk ?? 'none',
  };
}

onMounted(() => {
  client!.registerTool({
    declaration: buildDeclaration(),
    handler: toolHandler,
    componentId,
  });
});

onUnmounted(() => {
  client!.unregisterTool(props.name);
});

// Re-register if context changes after mount (reactive context support)
watch(fullDescription, () => {
  client!.unregisterTool(props.name);
  client!.registerTool({
    declaration: buildDeclaration(),
    handler: toolHandler,
    componentId,
  });
});
</script>

<template>
  <!-- display:contents — the <span> is transparent to layout (flexbox, grid, child styles) -->
  <span ref="wrapperEl" style="display:contents">
    <slot />
  </span>
</template>
