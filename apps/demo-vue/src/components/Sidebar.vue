<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAgent } from '@owllayer/vue';
import { useI18n } from '../i18n';

const route = useRoute();
const { state } = useAgent();
const { locale, setLocale, t } = useI18n();

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
    case 'connecting': return t.value.status.connecting;
    case 'thinking': return t.value.status.thinking;
    case 'speaking': return t.value.status.speaking;
    case 'listening': return t.value.status.listening;
    case 'error': return t.value.status.error;
    case 'connected': return t.value.status.connected;
    case 'disconnected': return t.value.status.disconnected;
    default: return state.agentState;
  }
});

const connectionFeedback = computed(() => {
  switch (state.agentState) {
    case 'connecting':
      return {
        label: t.value.status.connectingFeedback,
        textColor: 'text-amber-400',
      };
    case 'error':
    case 'disconnected':
      return {
        label: t.value.status.serverUnreachable,
        textColor: 'text-red-400',
      };
    default:
      if (state.systemError) {
        return {
          label: t.value.status.incidentFeedback,
          textColor: 'text-amber-400',
        };
      }
      return null;
  }
});

const navLinks = computed(() => [
  { path: '/products', label: t.value.nav.catalog, icon: '▤' },
  { path: '/products/add', label: t.value.nav.addProduct, icon: '+' },
]);
</script>

<template>
  <aside class="w-56 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 h-screen">
    <!-- Brand -->
    <div class="px-5 pt-6 pb-5 border-b border-slate-800">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white text-xs font-bold">D</div>
        <div>
          <p class="text-white text-sm font-semibold leading-none">OwlLayer</p>
          <p class="text-slate-500 text-xs mt-0.5">{{ t.nav.adminDashboard }}</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1">
      <p class="text-slate-500 text-xs font-medium uppercase tracking-wider px-2 mb-3">{{ t.nav.products }}</p>
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

    <!-- Language selector toggle -->
    <div class="px-4 py-3 border-t border-slate-800/80">
      <div class="flex items-center justify-between bg-slate-950/70 p-1 rounded-lg border border-slate-800">
        <button
          @click="setLocale('en')"
          class="flex-1 py-1 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1"
          :class="locale === 'en' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'"
        >
          <span>🇬🇧</span> EN
        </button>
        <button
          @click="setLocale('fr')"
          class="flex-1 py-1 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1"
          :class="locale === 'fr' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'"
        >
          <span>🇫🇷</span> FR
        </button>
      </div>
    </div>

    <!-- Agent status -->
    <div class="px-4 py-4 border-t border-slate-800">
      <div class="flex items-center gap-2.5">
        <span class="flex-shrink-0 w-2 h-2 rounded-full" :class="statusColor" />
        <div class="min-w-0">
          <p class="text-slate-300 text-xs font-medium">{{ t.nav.agent }}</p>
          <p class="text-slate-500 text-xs truncate">{{ statusLabel }}</p>
        </div>
      </div>
      <p v-if="connectionFeedback" class="mt-2 text-xs" :class="connectionFeedback.textColor">
        {{ connectionFeedback.label }}
      </p>
    </div>
  </aside>
</template>
