<script lang="ts">
  import { tripStore, totalDays, removeFromTrip, clearTrip } from '../lib/tripStore';
  import { agentTool, agentContext, OwlLayerToolBtn, sendText } from '@owllayer/svelte';
  import { t, currentLocale, getDestinationName } from '../lib/i18n';
  import { z } from 'zod';

  const itinerary    = $derived($tripStore.itinerary);
  const destinations = $derived($tripStore.destinations);
  const days         = $derived($totalDays);

  function getDest(id: string) {
    return destinations.find((d) => d.id === id);
  }

  function handleBookClick() {
    const prompt = $currentLocale === 'fr' ? 'Réserve ce voyage maintenant' : 'Book this trip now';
    sendText(prompt);
  }

  // Tool handler pour retirer une destination
  async function handleRemoveDestination(args: any) {
    const { destinationId } = args;
    removeFromTrip(destinationId);
    return { success: true };
  }
</script>

<div class="itinerary"
  use:agentTool={{
    name: 'remove_destination',
    description: $t.agent.removeDestDesc,
    schema: z.object({ destinationId: z.string() }),
    risk: 'low',
    handler: handleRemoveDestination,
    global: false
  }}
  use:agentContext={{
    page: 'itinerary',
    itinerary,
    days
  }}
>
  <div class="it-header">
    <h3 class="it-title">{$t.itinerary.title}</h3>
    {#if days > 0}
      <span class="days-pill">{days} {$t.common.days}</span>
    {/if}
  </div>

  {#if itinerary.length === 0}
    <!-- Empty state -->
    <div class="empty">
      <div class="empty-icon-wrap">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
      </div>
      <p class="empty-text">{$t.itinerary.emptyTitle}</p>
      <p class="empty-hint">{$t.itinerary.emptyDesc}</p>
    </div>

  {:else}
    <div class="it-list">
      {#each itinerary as item, i (item.destinationId)}
        {@const dest = getDest(item.destinationId)}
        {#if dest}
          <div class="it-row" style="--ra: {dest.accentColor}" >
            <div class="row-handle">
              <span class="drag-pip"></span>
              <span class="drag-pip"></span>
            </div>
            <div class="row-body">
              <div class="row-head">
                <span class="row-flag">{dest.emoji}</span>
                <span class="row-name">{getDestinationName(dest.id, dest.name)}</span>
                <span class="row-days">{item.days} {$t.common.days}</span>
                <button
                  class="row-del"
                  onclick={() => removeFromTrip(dest.id)}
                  aria-label="Remove {getDestinationName(dest.id, dest.name)}"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              {#if item.activities.length > 0}
                <ul class="activities">
                  {#each item.activities as act}
                    <li>
                      <span class="act-dot" style="background:{dest.accentColor}"></span>
                      {act}
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>

          {#if i < itinerary.length - 1}
            <div class="connector"><div class="connector-line"></div></div>
          {/if}
        {/if}
      {/each}
    </div>

    <!-- ② OwlLayerToolBtn — bouton autonome, déclenché par l'humain OU l'agent (risk: high) -->
    <OwlLayerToolBtn
      name="clear_itinerary"
      description="Clear complete itinerary. Irreversible action."
      risk="high"
      handler={clearTrip}
      class="clear-btn"
    >
      {$t.common.delete} {$t.itinerary.title}
    </OwlLayerToolBtn>

    <!-- Book CTA -->
    <button class="book-btn" onclick={handleBookClick}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
      </svg>
      {$t.itinerary.bookTripBtn}
    </button>
  {/if}
</div>

<style>
  .itinerary {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .it-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .it-title {
    font-family: var(--font-display);
    font-size: 14.5px;
    font-weight: 400;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .days-pill {
    font-size: 11px;
    padding: 2px 9px;
    border-radius: 20px;
    background: rgba(59,130,246,0.1);
    color: #93c5fd;
    border: 1px solid rgba(59,130,246,0.18);
    font-weight: 500;
  }

  /* Empty */
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 22px 12px;
    text-align: center;
    border: 1px dashed var(--border-bright);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }
  .empty-icon-wrap {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
  }
  .empty-text  { font-size: 13px; color: #f1f5f9; font-weight: 600; }
  .empty-hint  { font-size: 11.5px; color: #94a3b8; line-height: 1.45; }

  /* List */
  .it-list { display: flex; flex-direction: column; }

  .it-row {
    display: flex;
    gap: 9px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--ra);
    border-radius: var(--radius-sm);
    padding: 9px 9px 9px 7px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    animation: fade-up 0.3s ease both;
  }

  .row-handle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 2px 2px;
    opacity: 0.3;
    cursor: grab;
    flex-shrink: 0;
  }
  .drag-pip {
    display: block;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--text);
    box-shadow: 5px 0 0 var(--text);
  }

  .row-body { flex: 1; min-width: 0; }

  .row-head {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .row-flag { font-size: 17px; line-height: 1; flex-shrink: 0; }
  .row-name {
    flex: 1;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row-days  { font-size: 11px; color: #94a3b8; white-space: nowrap; }
  .row-del {
    color: var(--text-muted);
    line-height: 0;
    padding: 3px;
    border-radius: 4px;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .it-row:hover .row-del { opacity: 1; }
  .row-del:hover { color: var(--danger); }

  /* Activities */
  .activities {
    list-style: none;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .activities li {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    color: #cbd5e1;
    line-height: 1.4;
  }
  .act-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
    opacity: 0.8;
  }

  /* Connector */
  .connector {
    display: flex;
    justify-content: center;
    padding: 3px 0;
  }
  .connector-line {
    width: 1px;
    height: 9px;
    background: var(--border-bright);
  }

  /* Book */
  .book-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    width: 100%;
    padding: 10px;
    border-radius: var(--radius-sm);
    background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12));
    border: 1px solid rgba(139,92,246,0.22);
    color: #c4b5fd;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 2px;
  }
  .book-btn:hover {
    background: linear-gradient(135deg, rgba(59,130,246,0.22), rgba(139,92,246,0.22));
    border-color: rgba(139,92,246,0.4);
    box-shadow: 0 4px 18px rgba(139,92,246,0.14);
  }

  /* OwlLayerToolBtn — Vider le voyage */
  :global(.clear-btn) {
    width: 100%;
    padding: 7px 12px;
    font-size: 11.5px;
    color: rgba(239,68,68,0.7);
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.18);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.18s, background 0.18s, border-color 0.18s;
  }
  :global(.clear-btn:hover) {
    color: #ef4444;
    background: rgba(239,68,68,0.12);
    border-color: rgba(239,68,68,0.35);
  }
</style>
