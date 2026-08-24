<script lang="ts">
  import {
    offersStore, filteredOffers, OFFERS,
    setCountryFilter, setTypeFilter, toggleCompare, selectOffer,
  } from '../lib/offersStore';
  import { navigate } from '../lib/navStore';
  import { agentToolResolver, agentContext } from '@owllayer/svelte';
  import { z } from 'zod';
  import type { ResolverConfig } from '@owllayer/svelte';
  const offers       = $derived($filteredOffers);
  const compareList  = $derived($offersStore.compareList);
  const countryFilter = $derived($offersStore.filter);
  const typeFilter   = $derived($offersStore.typeFilter);

  function openDetails(id: string) {
    selectOffer(id);
    navigate('details');
  }

  function goCompare() {
    navigate('comparer');
  }

  function starArray(n: number) {
    return Array.from({ length: 5 }, (_, i) => i < n);
  }

  // Config tools resolver

  const resolverConfig: ResolverConfig = {
    offers: {
      prefix: 'offer_',
      tools: {
        compare: {
          description: 'Ajouter ou retirer une offre de la comparaison',
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            toggleCompare(args.offerId);
            return { success: true };
          },
        },
        select: {
          description: 'Sélectionner une offre',
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            selectOffer(args.offerId);
            return { success: true };
          },
        },
        filterCountry: {
          description: 'Filtrer les offres par pays',
          schema: z.object({ country: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            setCountryFilter(args.country);
            return { success: true };
          },
        },
        filterType: {
          description: 'Filtrer les offres par type',
          schema: z.object({ type: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            setTypeFilter(args.type);
            return { success: true };
          },
        },
        showDetails: {
          description: "Afficher le détail d'une offre. Utilisez l'identifiant de l'offre (offerId) présent dans la liste des produits du contexte pour ouvrir la fiche détaillée.",
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            openDetails(args.offerId);
            return { success: true };
          },
        },
      },
    },
  };
</script>

  <div class="offres-page"
    use:agentToolResolver={{ config: resolverConfig }}
    use:agentContext={{
      page: 'offres',
      countryFilter,
      typeFilter,
      compareList,
      offersCount: offers.length,
      products: offers,
      context: 'listing_offres',
    }}
  >

  <!-- Page title -->
  <div class="page-head">
    <div>
      <h2 class="page-title">Hébergements</h2>
      <p class="page-sub">{offers.length} offres disponibles · France & Côte d'Ivoire</p>
    </div>

    {#if compareList.length > 0}
      <button class="compare-fab" onclick={goCompare}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="10"/>
        </svg>
        Comparer ({compareList.length})
        <span class="compare-badge">{compareList.length}</span>
      </button>
    {/if}
  </div>

  <!-- Filters -->
  <div class="filters">
    <div class="filter-group">
      <span class="filter-label">Pays</span>
      <div class="chips">
        <button class="chip" class:active={countryFilter === 'all'}          onclick={() => setCountryFilter('all')}>Tous</button>
        <button class="chip" class:active={countryFilter === 'france'}       onclick={() => setCountryFilter('france')}>🇫🇷 France</button>
        <button class="chip" class:active={countryFilter === 'cote-divoire'} onclick={() => setCountryFilter('cote-divoire')}>🇨🇮 Côte d'Ivoire</button>
      </div>
    </div>
    <div class="filter-group">
      <span class="filter-label">Type</span>
      <div class="chips">
        <button class="chip" class:active={typeFilter === 'all'}          onclick={() => setTypeFilter('all')}>Tous types</button>
        <button class="chip" class:active={typeFilter === 'hotel'}        onclick={() => setTypeFilter('hotel')}>🏨 Hôtels</button>
        <button class="chip" class:active={typeFilter === 'appartement'}  onclick={() => setTypeFilter('appartement')}>🏠 Appartements</button>
      </div>
    </div>
  </div>

  <!-- Grid -->
  <div class="offers-grid">
    {#each offers as offer, i (offer.id)}
      {@const inCompare = compareList.includes(offer.id)}
      {@const stars     = starArray(offer.stars)}
      <div
        class="offer-card"
        class:in-compare={inCompare}
        style="--cg:{offer.gradient}; --ca:{offer.accentColor}; animation-delay:{i * 35}ms"
      >
        <!-- Visual -->
        <div class="card-visual">
          <div class="card-grad"></div>
          <div class="card-fade"></div>

          <div class="card-badges">
            <span class="type-badge" class:hotel={offer.type === 'hotel'}>
              {offer.type === 'hotel' ? '🏨' : '🏠'} {offer.type}
            </span>
            {#if inCompare}
              <span class="compare-indicator">Comparé</span>
            {/if}
          </div>

          <div class="card-location">
            <span class="card-flag">{offer.countryEmoji}</span>
            <span class="card-city">{offer.city}</span>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="card-name">{offer.name}</div>
              <div class="stars">
                {#each stars as filled}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" class={filled ? 'star-filled' : 'star-empty'}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                {/each}
                <span class="rating-num">{offer.rating.toFixed(1)}</span>
                <span class="review-count">({offer.reviewCount.toLocaleString('fr-FR')})</span>
              </div>
            </div>
            <div class="price-block">
              <span class="price">{offer.pricePerNight} €</span>
              <span class="per-night">/nuit</span>
            </div>
          </div>

          <p class="card-desc">{offer.description}</p>

          <!-- Amenities preview -->
          <div class="amenities-preview">
            {#each offer.amenities.slice(0, 3) as am}
              <span class="amenity-tag">{am}</span>
            {/each}
            {#if offer.amenities.length > 3}
              <span class="amenity-more">+{offer.amenities.length - 3}</span>
            {/if}
          </div>

          <div class="card-actions">
            <button class="btn-details" onclick={() => openDetails(offer.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              Voir détails
            </button>
            <button
              class="btn-compare"
              class:active={inCompare}
              onclick={() => toggleCompare(offer.id)}
              disabled={!inCompare && compareList.length >= 3}
              title={compareList.length >= 3 && !inCompare ? 'Maximum 3 offres comparables' : ''}
            >
              {#if inCompare}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Retiré
              {:else}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="10"/>
                </svg>
                Comparer
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/each}

    {#if offers.length === 0}
      <div class="empty-state">
        <span class="empty-emoji">🔍</span>
        <p>Aucune offre pour ces filtres.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .offres-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Head */
  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .page-title {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 300;
    letter-spacing: -0.025em;
    color: var(--text);
    margin-bottom: 4px;
  }
  .page-sub { font-size: 13px; color: var(--text-muted); }

  .compare-fab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 40px;
    background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2));
    border: 1px solid rgba(139,92,246,0.35);
    color: #c4b5fd;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
    animation: fade-up 0.4s ease both;
  }
  .compare-fab:hover {
    background: linear-gradient(135deg, rgba(59,130,246,0.32), rgba(139,92,246,0.32));
    box-shadow: 0 4px 24px rgba(139,92,246,0.2);
  }
  .compare-badge {
    display: none; /* already shown in text */
  }

  /* Filters */
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .filter-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }

  .chip {
    padding: 5px 13px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--border);
    color: var(--text-dim);
    background: transparent;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .chip:hover { border-color: var(--border-bright); color: var(--text); }
  .chip.active {
    background: rgba(59,130,246,0.14);
    border-color: rgba(59,130,246,0.4);
    color: #93c5fd;
  }

  /* Grid */
  .offers-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  @media (max-width: 1200px) { .offers-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px)  { .offers-grid { grid-template-columns: 1fr; } }

  /* Card */
  .offer-card {
    border-radius: var(--radius);
    border: 1px solid var(--border);
    background: var(--bg-card);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: card-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
    transition: transform 0.22s, border-color 0.2s, box-shadow 0.22s;
  }
  .offer-card:hover {
    transform: translateY(-4px) scale(1.01);
    border-color: rgba(255,255,255,0.12);
    box-shadow: 0 12px 40px rgba(0,0,0,0.5),
                0 2px 14px color-mix(in srgb, var(--ca) 18%, transparent);
  }
  .offer-card.in-compare {
    border-color: rgba(139,92,246,0.4);
    box-shadow: 0 0 0 1px rgba(139,92,246,0.2);
  }

  /* Visual block */
  .card-visual {
    position: relative;
    height: 120px;
    overflow: hidden;
  }
  .card-grad {
    position: absolute;
    inset: 0;
    background: var(--cg);
    opacity: 0.18;
    transition: opacity 0.3s;
  }
  .offer-card:hover .card-grad { opacity: 0.26; }
  .card-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 20%, var(--bg-card) 100%);
  }
  .card-badges {
    position: absolute;
    top: 10px;
    left: 10px;
    display: flex;
    gap: 6px;
  }
  .type-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .type-badge.hotel { background: rgba(59,130,246,0.22); border-color: rgba(59,130,246,0.3); color: #93c5fd; }
  .compare-indicator {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    background: rgba(139,92,246,0.25);
    border: 1px solid rgba(139,92,246,0.4);
    color: #c4b5fd;
  }
  .card-location {
    position: absolute;
    bottom: 10px;
    left: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .card-flag { font-size: 18px; line-height: 1; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.7)); }
  .card-city { font-size: 11px; font-weight: 600; color: var(--text-dim); }

  /* Body */
  .card-body {
    padding: 12px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    flex: 1;
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .card-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.25;
    margin-bottom: 4px;
  }
  .stars {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .star-filled { color: #fbbf24; }
  .star-empty  { color: rgba(255,255,255,0.12); }
  .rating-num  { font-size: 11px; color: var(--text); margin-left: 4px; font-weight: 600; }
  .review-count { font-size: 10px; color: var(--text-muted); }

  .price-block {
    text-align: right;
    flex-shrink: 0;
  }
  .price {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 300;
    color: var(--text);
    display: block;
  }
  .per-night { font-size: 10px; color: var(--text-muted); }

  .card-desc {
    font-size: 11.5px;
    color: var(--text-dim);
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Amenities */
  .amenities-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .amenity-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 20px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text-dim);
    white-space: nowrap;
  }
  .amenity-more {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 20px;
    color: var(--text-muted);
  }

  /* Actions */
  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: 2px;
  }
  .btn-details {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: 7px 10px;
    border-radius: 8px;
    background: rgba(59,130,246,0.12);
    border: 1px solid rgba(59,130,246,0.22);
    color: #93c5fd;
    font-size: 12px;
    font-weight: 600;
    transition: all 0.18s;
  }
  .btn-details:hover {
    background: rgba(59,130,246,0.24);
    border-color: rgba(59,130,246,0.5);
    box-shadow: 0 2px 12px rgba(59,130,246,0.18);
  }
  .btn-compare {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 7px 11px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .btn-compare:hover:not(:disabled):not(.active) {
    background: rgba(139,92,246,0.12);
    border-color: rgba(139,92,246,0.3);
    color: #c4b5fd;
  }
  .btn-compare.active {
    background: rgba(139,92,246,0.15);
    border-color: rgba(139,92,246,0.4);
    color: #c4b5fd;
  }
  .btn-compare:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Empty */
  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 64px 32px;
    color: var(--text-muted);
    text-align: center;
    font-size: 13px;
  }
  .empty-emoji { font-size: 40px; }
</style>
