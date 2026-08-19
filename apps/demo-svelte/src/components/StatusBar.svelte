<script lang="ts">
  import { agentState, isConnected } from '@owllayer/svelte';
  import { agentContext } from '@owllayer/svelte';

  const STATE_LABELS: Record<string, string> = {
    connected:    'Connecté',
    disconnected: 'Déconnecté',
    connecting:   'Connexion…',
    listening:    'Écoute…',
    thinking:     'Réflexion…',
    speaking:     'Parle…',
    error:        'Erreur',
  };

  const DOT_CLASSES: Record<string, string> = {
    connected:    'bg-emerald-400',
    disconnected: 'bg-slate-500',
    connecting:   'bg-amber-400 animate-pulse',
    listening:    'bg-blue-400 animate-pulse',
    thinking:     'bg-purple-400 animate-pulse',
    speaking:     'bg-emerald-400 animate-pulse',
    error:        'bg-red-500',
  };

  let currentTime = '';
  function updateTime() {
    currentTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  updateTime();
  setInterval(updateTime, 30_000);
</script>

<header class="sticky top-0 z-30 px-6 py-3 flex items-center justify-between
               bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]"
  use:agentContext={{
    agentState: $agentState,
    isConnected: $isConnected,
    currentTime
  }}
>
  <!-- Left: brand -->
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
      <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    </div>
    <div>
      <p class="text-sm font-bold text-white leading-none">OwlLayer</p>
      <p class="text-xs text-white/30 leading-none mt-0.5">Smart Home</p>
    </div>
  </div>

  <!-- Right: connection status + time -->
  <div class="flex items-center gap-4">
    <div class="flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full {DOT_CLASSES[$agentState] ?? 'bg-slate-500'}"></span>
      <span class="text-xs text-white/40">{STATE_LABELS[$agentState] ?? $agentState}</span>
    </div>
    <span class="text-xs text-white/20 font-mono">{currentTime}</span>
  </div>
</header>
