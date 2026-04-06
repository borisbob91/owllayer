<script lang="ts">
  import { tripStore, filteredDestinations, addToTrip, setSearchQuery, COST_PER_DAY } from '../lib/tripStore';
  import type { Destination } from '../lib/tripStore';
  import { agentTool } from '@domos/svelte';
  import { agentContext } from '@domos/svelte';
  import { DomOSTool } from '@domos/svelte';
  import { z } from 'zod';

  const itinerary     = $derived($tripStore.itinerary);
  const destinations  = $derived($filteredDestinations);
  const query         = $derived($tripStore.searchQuery);

  function isInTrip(id: string) {
    return itinerary.some((i) => i.destinationId === id);
  }

  function handleSearch(e: Event) {
    setSearchQuery((e.target as HTMLInputElement).value);
  }

  function clearSearch() {
    setSearchQuery('');
  }

  function handleAdd(dest: Destination) {
    if (!isInTrip(dest.id)) addToTrip(dest.id, dest.avgDays);
  }

  // Tool handler pour ajouter une destination (type any pour compatibilité agentTool)
  async function handleAddDestination(args: any) {
    // On parse explicitement les arguments
    const { destinationId, days } = args;
    if (!isInTrip(destinationId)) {
      addToTrip(destinationId, days);
      return { success: true };
    }
    return { success: false, reason: 'Déjà dans le voyage' };
  }
</script>

<div class="grid-wrapper"
  use:agentTool={{
    name: 'add_destination',
    description: 'Ajouter une destination à l\'itinéraire',
    schema: z.object({ destinationId: z.string(), days: z.number().min(1) }),
    risk: 'low',
    handler: handleAddDestination,
    global: false
  }}
  use:agentContext={{
    page: 'destinations',
    query,
    itinerary
  }}
>

  <!-- Search -->
  <div class="search-bar">
    <span class="search-icon">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    </span>
    <input
      class="search-input"
      type="text"
      placeholder="Rechercher une destination, un pays, une ambiance…"
      value={query}
      oninput={handleSearch}
    />
    {#if query}
      <!-- ① DomOSTool — le bouton × est déclenché par l'humain OU l'agent -->
      <DomOSTool
        name="clear_search"
        description="Effacer la recherche en cours et afficher toutes les destinations."
        action="click"
      >
        <button class="search-clear" onclick={clearSearch} aria-label="Effacer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </DomOSTool>
    {/if}
  </div>

  <!-- Heading -->
  <div class="section-head">
    <h2 class="section-title">
      {#if query}
        <span class="query-highlight">"{query}"</span>
        <span class="results-count">— {destinations.length} résultat{destinations.length !== 1 ? 's' : ''}</span>
      {:else}
        Destinations populaires
      {/if}
    </h2>
    <p class="section-sub">Parlez à l'IA ou ajoutez directement une destination à votre voyage.</p>
  </div>

  <!-- Grid -->
  <div class="dest-grid">
    {#each destinations as dest, i (dest.id)}
      {@const added = isInTrip(dest.id)}
      <div
        class="dest-card"
        class:added
        style="
          --cg: {dest.gradient};
          --ca: {dest.accentColor};
          animation-delay: {i * 40}ms;
        "
      >
        <!-- Visual band -->
        <div class="card-visual">
          <div class="card-grad"></div>
          <div class="card-fade"></div>
          <span class="card-flag">{dest.emoji}</span>
          {#if added}
            <div class="card-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Dans le voyage
            </div>
          {/if}
        </div>

        <!-- Body -->
        <div class="card-body">
          <div>
            <div class="card-name">{dest.name}</div>
            <div class="card-country">{dest.country}</div>
            <p class="card-desc">{dest.description}</p>
          </div>
          <div class="card-footer">
            <div class="card-meta">
              <span class="card-days">~{dest.avgDays}j</span>
              <span class="card-price">~{dest.avgDays * COST_PER_DAY} €</span>
            </div>
            <button
              class="card-btn"
              class:added
              onclick={() => handleAdd(dest)}
              disabled={added}
            >
              {#if added}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Ajouté
              {:else}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Ajouter
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/each}

    {#if destinations.length === 0}
      <div class="empty-results">
        <span class="empty-emoji">🗺️</span>
        <p>Aucune destination pour <em>"{query}"</em>.</p>
        <p class="empty-hint">Demandez à l'IA de chercher pour vous !</p>
      </div>
    {/if}
  </div>

</div>

<style>
  .grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ── Search ── */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    height: 44px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    transition: border-color 0.2s;
  }
  .search-bar:focus-within { border-color: var(--border-bright); }
  .search-icon { color: var(--text-muted); line-height: 0; flex-shrink: 0; }
  .search-input {
    flex: 1;
    background: none;
    border: none;
    color: var(--text);
    font-size: 13.5px;
    outline: none;
  }
  .search-input::placeholder { color: var(--text-muted); }
  .search-clear {
    color: var(--text-muted);
    line-height: 0;
    padding: 3px;
    border-radius: 4px;
  }
  .search-clear:hover { color: var(--text); background: rgba(255,255,255,0.06); }

  /* ── Heading ── */
  .section-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 3px;
  }
  .query-highlight {
    font-style: italic;
    background: linear-gradient(90deg, var(--accent), var(--accent-v));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .results-count {
    color: var(--text-muted);
    font-size: 14px;
    font-family: var(--font-body);
    font-weight: 400;
  }
  .section-sub { font-size: 13px; color: var(--text-muted); }

  /* ── Grid ── */
  .dest-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }
  @media (max-width: 1100px) { .dest-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 580px)  { .dest-grid { grid-template-columns: 1fr; } }

  /* ── Card ── */
  .dest-card {
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: card-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
    transition: transform 0.22s cubic-bezier(0.4,0,0.2,1),
                border-color 0.2s,
                box-shadow 0.22s;
  }
  .dest-card:hover {
    transform: translateY(-3px) scale(1.012);
    border-color: rgba(255,255,255,0.11);
    box-shadow: 0 10px 36px rgba(0,0,0,0.45),
                0 2px 12px color-mix(in srgb, var(--ca) 20%, transparent);
  }
  .dest-card:hover .card-grad { opacity: 0.22; }
  .dest-card.added {
    border-color: rgba(16, 185, 129, 0.3);
  }

  /* Card visual */
  .card-visual {
    position: relative;
    height: 106px;
    overflow: hidden;
  }
  .card-grad {
    position: absolute;
    inset: 0;
    background: var(--cg);
    opacity: 0.16;
    transition: opacity 0.3s;
  }
  .card-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 25%, var(--bg-card) 100%);
  }
  .card-flag {
    position: absolute;
    bottom: 10px;
    left: 14px;
    font-size: 30px;
    line-height: 1;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
  }
  .card-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--success);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 20px;
    letter-spacing: 0.02em;
  }

  /* Card body */
  .card-body {
    padding: 12px 14px 13px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
  }
  .card-name {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.2;
  }
  .card-country {
    font-size: 10.5px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.09em;
    margin-top: 1px;
    margin-bottom: 5px;
  }
  .card-desc {
    font-size: 12px;
    color: var(--text-dim);
    line-height: 1.55;
  }
  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .card-days {
    font-size: 11px;
    color: var(--text-muted);
    background: rgba(255,255,255,0.05);
    padding: 2px 8px;
    border-radius: 20px;
  }
  .card-price {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 300;
    color: var(--text-dim);
    padding-left: 2px;
  }
  .card-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 8px;
    background: rgba(59,130,246,0.14);
    color: #93c5fd;
    border: 1px solid rgba(59,130,246,0.22);
    cursor: pointer;
    transition: all 0.18s;
  }
  .card-btn:hover:not(:disabled) {
    background: rgba(59,130,246,0.26);
    border-color: rgba(59,130,246,0.48);
    box-shadow: 0 2px 14px rgba(59,130,246,0.2);
  }
  .card-btn.added {
    background: rgba(16,185,129,0.1);
    color: #6ee7b7;
    border-color: rgba(16,185,129,0.18);
    cursor: default;
  }

  /* Empty */
  .empty-results {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    padding: 52px 32px;
    color: var(--text-muted);
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
  }
  .empty-emoji { font-size: 38px; margin-bottom: 4px; }
  .empty-hint  { font-size: 12px; opacity: 0.7; }
</style>
