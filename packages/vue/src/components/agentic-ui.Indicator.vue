<script setup lang="ts">
import { useAgent } from '../composables/useAgent.js';

const { state } = useAgent();

const labels: Record<string, string> = {
  disconnected: 'Deconnecte',
  connecting: 'Connexion...',
  connected: 'En ligne',
  listening: 'Ecoute',
  thinking: 'Reflexion...',
  speaking: 'Parle...',
  error: 'Erreur',
};

const colors: Record<string, string> = {
  disconnected: '#9ca3af',
  connecting: '#f59e0b',
  connected: '#22c55e',
  listening: '#3b82f6',
  thinking: '#f59e0b',
  speaking: '#8b5cf6',
  error: '#ef4444',
};
</script>

<template>
  <div class="owllayer-indicator" :style="{ '--indicator-color': colors[state.agentState] || '#9ca3af' }">
    <span class="owllayer-indicator__dot" :class="{ 'owllayer-indicator__dot--pulse': state.isThinking || state.isSpeaking }" />
    <span class="owllayer-indicator__label">
      {{ labels[state.agentState] || state.agentState }}
    </span>
  </div>
</template>

<style scoped>
.owllayer-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: #f3f4f6;
  font-size: 12px;
  font-family: system-ui, sans-serif;
}

.owllayer-indicator__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--indicator-color);
}

.owllayer-indicator__dot--pulse {
  animation: owllayer-pulse 1.5s infinite;
}

.owllayer-indicator__label {
  color: #374151;
}

@keyframes owllayer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
