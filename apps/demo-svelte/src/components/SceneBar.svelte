<script lang="ts">
  import { SCENES, applyScene } from '../lib/homeStore';
  import { agentTool } from '@owllayer/svelte';
  import { agentContext } from '@owllayer/svelte';
  import { z } from 'zod';

  let { activeScene = null }: { activeScene?: string | null } = $props();

  // Tool handler pour appliquer une scène (type any pour compatibilité agentTool)
  async function handleApplyScene(args: any) {
    const { scene } = args;
    if (SCENES[scene]) {
      applyScene(scene);
      return { success: true };
    }
    return { success: false };
  }
</script>

<div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide"
  use:agentTool={{
    name: 'apply_scene',
    description: 'Appliquer une scène domotique',
    schema: z.object({ scene: z.string() }),
    risk: 'low',
    handler: handleApplyScene,
    global: false
  }}
  use:agentContext={{
    page: 'scene',
    activeScene
  }}
>
  {#each Object.entries(SCENES) as [id, scene]}
    <button
      onclick={() => applyScene(id)}
      class="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium
             whitespace-nowrap transition-all duration-200 flex-shrink-0
             {activeScene === id
               ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-105'
               : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.09] hover:text-white/90 border border-white/[0.07]'
             }"
      title={scene.description}
    >
      <span class="text-base leading-none">{scene.icon}</span>
      <span>{scene.label}</span>
    </button>
  {/each}
</div>
