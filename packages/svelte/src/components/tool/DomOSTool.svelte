<!--
  DomOSTool - transparent wrapper that co-locates an agent tool
  directly with its UI element.

  How it works:
    - Renders a <span style="display:contents"> invisible to layout
    - use:agentTool handles mount/destroy automatically (Svelte action lifecycle)
    - When fullDescription or risk changes, Svelte calls agentTool.update() -> re-registration

  DomOSTool vs agentTool - when to use which:
    DomOSTool: single standalone element, outside a list
    agentTool action: N elements in a each block (1 tool for all items)

  Supported actions: click, focus, scrollIntoView, show, hide
-->
<script lang="ts">
  import { agentTool } from '../../actions/useAgentTool.js';
  import type { Snippet } from 'svelte';

  interface Props {
    name: string;
    description: string;
    risk?: 'none' | 'low' | 'high' | 'critical';
    context?: Record<string, unknown>;
    /** DOM action triggered on the first child element. Mutually exclusive with handler. */
    action?: 'click' | 'focus' | 'scrollIntoView' | 'show' | 'hide';
    /** Direct callback invoked by the agent. Mutually exclusive with action. */
    handler?: () => unknown | Promise<unknown>;
    children: Snippet;
  }

  // Use the reactive proxy object directly — avoids "captures initial value" warnings
  // when closures (toolHandler, validation) need to read the latest prop values.
  const p: Props = $props();

  // Runtime validation
  if (p.action && p.handler) {
    throw new Error(`DomOSTool "${p.name}": provide action OR handler, not both.`);
  }
  if (!p.action && !p.handler) {
    throw new Error(`DomOSTool "${p.name}": action or handler is required.`);
  }

  // Ref to the wrapper span — needed to access the first child for DOM actions
  let wrapperEl: HTMLElement | undefined = $state();

  // Serialize context appended to description.
  // $derived ensures Svelte tracks reactivity → agentTool.update() called automatically.
  const fullDescription = $derived(
    p.context
      ? `${p.description}. Context: ${JSON.stringify(p.context)}`
      : p.description
  );

  // Internal handler passed to use:agentTool.
  // Reads from the reactive props proxy (p.action, p.handler) at call time.
  function toolHandler() {
    if (p.handler) return p.handler();
    const child = wrapperEl?.firstElementChild as HTMLElement | null;
    if (!child) return;
    switch (p.action) {
      case 'click':          child.click(); break;
      case 'focus':          child.focus(); break;
      case 'scrollIntoView': child.scrollIntoView({ behavior: 'smooth' }); break;
      case 'show':           child.style.display = ''; break;
      case 'hide':           child.style.display = 'none'; break;
    }
  }
</script>

<!--
  use:agentTool manages mount/destroy automatically.
  When fullDescription/risk/handler change, Svelte calls agentTool.update() → re-registration.
  display:contents — the <span> is transparent to layout (flexbox, grid, child styles).
-->
<span
  bind:this={wrapperEl}
  style="display: contents"
  use:agentTool={{ name: p.name, description: fullDescription, risk: p.risk ?? 'none', handler: toolHandler }}
>
  {@render p.children()}
</span>
