<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAgent } from '@owllayer/vue';

const route = useRoute();
const { state } = useAgent();

const statusColor = computed(() => {
  switch (state.agentState) {
    case 'connecting': return 'bg-amber-400 animate-pulse';
    case 'thinking': return 'bg-amber-400 animate-pulse';
    case 'speaking': return 'bg-green-400 animate-pulse';
    case 'listening': return 'bg-violet-400 animate-pulse';
    case 'error': return 'bg-red-500';
    case 'connected': return 'bg-green-500';
    default: return 'bg-slate-500';
  }
});

const statusLabel = computed(() => {
  switch (state.agentState) {
    case 'connecting': return 'Connexion…';
    case 'thinking': return 'Réfléchit…';
    case 'speaking': return 'Répond…';
    case 'listening': return 'Écoute…';
    case 'error': return 'Erreur';
    case 'connected': return 'Connecté';
    case 'disconnected': return 'Déconnecté';
    default: return state.agentState;
  }
});

const connectionFeedback = computed(() => {
  switch (state.agentState) {
    case 'connecting':
      return {
        label: 'Connexion au serveur…',
        textColor: 'text-amber-400',
      };
    case 'error':
    case 'disconnected':
      return {
        label: 'Serveur inaccessible',
        textColor: 'text-red-400',
      };
    default:
      if (state.systemError) {
        return {
          label: 'Incident non bloquant',
          textColor: 'text-amber-400',
        };
      }
      return null;
  }
});

const navLinks = [
  { path: '/products', label: 'Catalogue', icon: '▤' },
  { path: '/products/add', label: 'Ajouter produit', icon: '+' },
];
</script>

<template>
  <aside class="w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-screen">
    <!-- Brand -->
    <div class="px-5 pt-6 pb-5 border-b border-slate-800">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-bold">D</div>
        <div>
          <p class="text-white text-sm font-semibold leading-none">OwlLayer</p>
          <p class="text-slate-500 text-xs mt-0.5">Admin Dashboard</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1">
      <p class="text-slate-500 text-xs font-medium uppercase tracking-wider px-2 mb-3">Produits</p>
      <RouterLink
        v-for="link in navLinks"
        :key="link.path"
        :to="link.path"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
        :class="route.path === link.path
          ? 'bg-violet-600/20 text-violet-300 font-medium'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'"
      >
        <span class="text-base w-4 text-center">{{ link.icon }}</span>
        {{ link.label }}
      </RouterLink>
    </nav>

    <!-- Agent status -->
    <div class="px-4 py-4 border-t border-slate-800">
      <div class="flex items-center gap-2.5">
        <span class="flex-shrink-0 w-2 h-2 rounded-full" :class="statusColor" />
        <div class="min-w-0">
          <p class="text-slate-300 text-xs font-medium">Agent OwlLayer</p>
          <p class="text-slate-500 text-xs truncate">{{ statusLabel }}</p>
        </div>
      </div>
      <p v-if="connectionFeedback" class="mt-2 text-xs" :class="connectionFeedback.textColor">
        {{ connectionFeedback.label }}
      </p>
    </div>
  </aside>
</template>
