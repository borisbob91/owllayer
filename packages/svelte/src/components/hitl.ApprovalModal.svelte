<script lang="ts">
  import type { HitlLabels } from '@owllayer/core';

  let { toolName, message, risk = 'high', args = {}, labels, onapprove, ondeny }: {
    toolName: string;
    message: string;
    risk?: 'high' | 'critical';
    args?: Record<string, unknown>;
    /** Libelles de l'UI d'approbation (tous optionnels, textes actuels par defaut) */
    labels?: HitlLabels;
    onapprove: () => void;
    ondeny: () => void;
  } = $props();

  const riskLabel = $derived(risk === 'critical' ? 'CRITIQUE' : 'IMPORTANT');
  const riskColor = $derived(risk === 'critical' ? '#dc2626' : '#f59e0b');
</script>

<div class="overlay">
  <div class="modal">
    <div class="header" style="border-color: {riskColor}">
      <span class="badge" style="background: {riskColor}">{riskLabel}</span>
      <h3>{labels?.title ?? 'Approbation requise'}</h3>
    </div>
    <div class="body">
      <p>{labels?.message ?? message}</p>
      {#if Object.keys(args).length > 0}
        <div class="args">
          <p class="args-label">Parametres :</p>
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </div>
      {/if}
    </div>
    <div class="actions">
      <button class="btn-deny" onclick={() => ondeny()}>{labels?.deny ?? 'Refuser'}</button>
      <button class="btn-approve" onclick={() => onapprove()}>{labels?.approve ?? 'Approuver'}</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 10000; font-family: system-ui, sans-serif;
  }
  .modal {
    background: white; border-radius: 12px;
    width: 420px; max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;
  }
  .header {
    padding: 16px 20px; border-bottom: 3px solid;
    display: flex; align-items: center; gap: 10px;
  }
  .badge {
    color: white; font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 4px;
  }
  h3 { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
  .body { padding: 20px; }
  .body p { color: #374151; font-size: 14px; margin: 0; }
  .args { margin-top: 12px; }
  .args-label { font-size: 12px; color: #6b7280; margin: 0 0 4px; }
  pre {
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
    padding: 8px 12px; font-size: 12px; overflow-x: auto; margin: 0;
  }
  .actions {
    padding: 12px 20px; background: #f9fafb;
    display: flex; justify-content: flex-end; gap: 8px;
  }
  .btn-deny, .btn-approve {
    padding: 8px 20px; border-radius: 8px;
    font-size: 14px; font-weight: 500; cursor: pointer; border: none;
  }
  .btn-deny { background: #e5e7eb; color: #374151; }
  .btn-deny:hover { background: #d1d5db; }
  .btn-approve { background: #0070c7; color: white; }
  .btn-approve:hover { background: #0059a1; }
</style>
