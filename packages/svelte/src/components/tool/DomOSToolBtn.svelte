<!--
  DomOSToolBtn - self-rendered button with built-in agent tool.

  Difference from DomOSTool:
    DomOSTool: wrapper around an EXISTING element
    DomOSToolBtn: renders its own button, styleable via class prop

  The handler is called via TWO independent paths:
    1. User click via onclick on the button
    2. Agent call via use:agentTool (independent of the DOM/disabled state)

  Important: disabled does NOT block the agent.
    disabled blocks the human click, but use:agentTool is independent.
-->
<script lang="ts">
  import { agentTool } from '../../actions/useAgentTool.js';
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    description: string;
    risk?: 'none' | 'low' | 'high' | 'critical';
    context?: Record<string, unknown>;
    handler: () => unknown | Promise<unknown>;
    class?: string;
    disabled?: boolean;
    children: Snippet;
  }

  // `class` is a reserved JS keyword — access via the reactive proxy to avoid closure warnings
  const p: Props = $props();

  // Serialize context appended to description.
  // $derived → Svelte tracks reactivity → agentTool.update() called automatically.
  const fullDescription = $derived(
    p.context
      ? `${p.description}. Context: ${JSON.stringify(p.context)}`
      : p.description
  );
</script>

<!--
  use:agentTool directly on the <button> — no wrapper span needed.
  disabled blocks the human click only. The agent calls handler via use:agentTool.
-->
<button
  class={p.class}
  disabled={p.disabled}
  onclick={p.handler}
  use:agentTool={{ name: p.name, description: fullDescription, risk: p.risk ?? 'none', handler: p.handler }}
>
  {@render p.children()}
</button>
