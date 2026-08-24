<script lang="ts">
  import { agentState, isThinking, isSpeaking } from '../stores/owllayer.store.js';

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

<div class="owllayer-indicator">
  <span
    class="dot"
    class:pulse={$isThinking || $isSpeaking}
    style="background: {colors[$agentState] || '#9ca3af'}"
  ></span>
  <span class="label">{labels[$agentState] || $agentState}</span>
</div>

<style>
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
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .pulse {
    animation: owllayer-pulse 1.5s infinite;
  }
  .label {
    color: #374151;
  }
  @keyframes owllayer-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
