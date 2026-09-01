<script lang="ts">
  import { tripStore, estimatedCost, setBudget } from '../lib/tripStore';
  import { agentTool } from '@owllayer/svelte';
  import { agentContext } from '@owllayer/svelte';
  import { t, formatCurrency } from '../lib/i18n';
  import { z } from 'zod';

  const budget = $derived($tripStore.budget);
  const spent  = $derived($estimatedCost);
  const pct    = $derived(budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0);
  const barColor = $derived(pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981');

  let editing     = $state(false);
  let inputVal    = $state('');

  // Tool handler pour modifier le budget
  async function handleSetBudget(args: any) {
    const { value } = args;
    if (!isNaN(value) && value >= 100) setBudget(value);
    editing = false;
    return { success: true };
  }

  function startEdit() {
    inputVal = String(budget);
    editing = true;
  }

  function confirmEdit() {
    const v = parseInt(inputVal, 10);
    if (!isNaN(v) && v >= 100) setBudget(v);
    editing = false;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter')  confirmEdit();
    if (e.key === 'Escape') editing = false;
  }
</script>

<div class="budget"
  use:agentTool={{
    name: 'set_budget',
    description: $t.agent.setBudgetDesc,
    schema: z.object({ value: z.number().min(100) }),
    risk: 'low',
    handler: handleSetBudget,
    global: false
  }}
  use:agentContext={{
    page: 'budget',
    budget,
    spent
  }}
>
  <div class="b-header">
    <h3 class="b-title">{$t.budget.title}</h3>
    {#if !editing}
      <button class="b-edit" onclick={startEdit} title={$t.budget.setBudgetPrompt}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        </svg>
      </button>
    {/if}
  </div>

  <!-- Numbers -->
  {#if editing}
    <div class="b-input-row">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        class="b-input"
        type="number"
        bind:value={inputVal}
        onkeydown={onKey}
        onblur={confirmEdit}
        min="100"
        autofocus
      />
      <span class="b-currency">{$t.common.currencySymbol}</span>
      <button class="b-confirm" onclick={confirmEdit}>✓</button>
    </div>
  {:else}
    <div class="b-numbers">
      <span class="b-spent" style="color: {barColor}">{formatCurrency(spent)}</span>
      <span class="b-sep">/</span>
      <span class="b-total">{formatCurrency(budget)}</span>
    </div>
    <div class="b-remaining">
      {#if spent <= budget}
        <span class="ok">{$t.budget.remaining}: {formatCurrency(budget - spent)}</span>
      {:else}
        <span class="over">{$t.budget.overBudget.replace('{amount}', formatCurrency(spent - budget))}</span>
      {/if}
    </div>
  {/if}

  <!-- Bar -->
  <div class="bar-track">
    <div class="bar-fill" style="width: {pct}%; background: {barColor}"></div>
  </div>

  <p class="b-note">{$t.common.estimated} ~200 {$t.common.currencySymbol}/{$t.common.day}</p>
</div>

<style>
  .budget {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.2);
  }

  .b-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .b-title {
    font-family: var(--font-display);
    font-size: 14.5px;
    font-weight: 500;
    color: #ffffff;
    letter-spacing: -0.01em;
  }
  .b-edit {
    color: var(--text-muted);
    line-height: 0;
    padding: 3px;
    border-radius: 4px;
  }
  .b-edit:hover { color: #ffffff; }

  /* Numbers */
  .b-numbers {
    display: flex;
    align-items: baseline;
    gap: 5px;
  }
  .b-spent {
    font-size: 20px;
    font-family: var(--font-display);
    font-weight: 400;
    transition: color 0.5s;
  }
  .b-sep   { font-size: 13px; color: #64748b; }
  .b-total { font-size: 13.5px; color: #94a3b8; font-weight: 500; }
  .b-remaining { margin-top: -2px; }
  .ok   { font-size: 11.5px; color: #34d399; font-weight: 500; }
  .over { font-size: 11.5px; color: #f87171; font-weight: 500; }

  /* Editing */
  .b-input-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .b-input {
    width: 90px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--border-bright);
    border-radius: 7px;
    color: var(--text);
    font-size: 16px;
    font-family: var(--font-display);
    font-weight: 300;
    padding: 4px 8px;
    outline: none;
  }
  .b-currency { font-size: 13px; color: var(--text-muted); }
  .b-confirm {
    padding: 4px 9px;
    border-radius: 7px;
    background: rgba(16,185,129,0.18);
    color: #6ee7b7;
    border: 1px solid rgba(16,185,129,0.3);
    font-size: 13px;
  }

  /* Progress bar */
  .bar-track {
    height: 5px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.5s;
  }

  .b-note {
    font-size: 11px;
    color: #94a3b8;
    text-align: right;
  }
</style>
