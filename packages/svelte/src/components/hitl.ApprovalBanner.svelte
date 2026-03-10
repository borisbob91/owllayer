<script lang="ts">
  import { pendingApproval, approveAction, denyAction } from '../stores/domos.store.js';
</script>

{#if $pendingApproval}
  <div class="domos-approval-banner">
    <div class="domos-approval-title">Confirmation requise</div>
    <div class="domos-approval-message">{$pendingApproval.message}</div>
    <div class="domos-approval-tool">
      {$pendingApproval.toolName}({JSON.stringify($pendingApproval.args)})
    </div>
    <div class="domos-approval-actions">
      <button class="domos-approval-btn domos-approval-btn-deny" onclick={denyAction}>
        Refuser
      </button>
      <button class="domos-approval-btn domos-approval-btn-approve" onclick={approveAction}>
        Approuver
      </button>
    </div>
  </div>
{/if}

<style>
  .domos-approval-banner {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 12px;
    padding: 14px 16px;
    max-width: 360px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
    font-family: system-ui, sans-serif;
    font-size: 13px;
    z-index: 999999;
  }

  .domos-approval-title {
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.2px;
    margin-bottom: 6px;
  }

  .domos-approval-message {
    color: #cbd5f5;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .domos-approval-tool {
    background: #111827;
    border-radius: 8px;
    padding: 8px 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
    font-size: 12px;
    margin-bottom: 10px;
  }

  .domos-approval-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .domos-approval-btn {
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-weight: 600;
    cursor: pointer;
    font-size: 12px;
  }

  .domos-approval-btn-approve {
    background: #22c55e;
    color: #0f172a;
  }

  .domos-approval-btn-deny {
    background: #334155;
    color: #e2e8f0;
  }
</style>
