<script lang="ts">
  import { compareOffers, offersStore, clearCompare, toggleCompare, selectOffer } from '../lib/offersStore';
  import { navigate } from '../lib/navStore';
  import { agentToolResolver, agentContext } from '@domos/svelte';
  import { z } from 'zod';
  import type { ResolverConfig } from '@domos/svelte';

  const offers      = $derived($compareOffers);
  const compareList = $derived($offersStore.compareList);

  function goBack() {
    navigate('offres');
  }

  // All unique amenities across compared offers
  const allAmenities = $derived(
    [...new Set(offers.flatMap((o) => o.amenities))].sort()
  );

  function starStr(n: number) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  const COLS_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

  // Config tools resolver
  const resolverConfig: ResolverConfig = {
    compare: {
      prefix: 'compare_',
      tools: {
        toggle: {
          description: 'Ajouter ou retirer une offre de la comparaison',
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            toggleCompare(args.offerId);
            return { success: true };
          },
        },
        clear: {
          description: 'Vider la liste de comparaison',
          schema: z.object({}),
          risk: 'none',
          handler: async () => {
            clearCompare();
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
        showDetails: {
          description: "Afficher le détail d'une offre. Utilisez l'identifiant de l'offre (offerId) pour ouvrir la fiche détaillée.",
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            selectOffer(args.offerId);
            navigate('details');
            return { success: true };
          },
        },
        bookOffer: {
          description: "Réserver une offre depuis la comparaison. Utilisez l'identifiant de l'offre (offerId).",
          schema: z.object({ offerId: z.string() }),
          risk: 'low',
          handler: async (args: any) => {
            // Simuler une réservation (à adapter selon backend)
            return { success: true, message: 'Réservation effectuée pour ' + args.offerId };
          },
        },
      },
    },
  };
</script>

<div class="compare-page"
  use:agentToolResolver={{ config: resolverConfig }}
  use:agentContext={{
    page: 'compare',
    compareList,
    offersCount: offers.length,
    amenities: allAmenities,
    context: 'compare_offres',
  }}
>

  <div class="page-head">
    <div>
      <h2 class="page-title">Comparaison</h2>
      <p class="page-sub">
        {#if offers.length === 0}
          Aucune offre sélectionnée pour la comparaison.
        {:else}
          {offers.length} offre{offers.length > 1 ? 's' : ''} en comparaison · max. 3
        {/if}
      </p>
    </div>
    <div class="head-actions">
      <button class="btn-back" onclick={goBack}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Retour aux offres
      </button>
      {#if offers.length > 0}
        <button class="btn-clear" onclick={clearCompare}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
          Vider
        </button>
      {/if}
    </div>
  </div>

  {#if offers.length === 0}
    <div class="empty-state">
      <span class="empty-icon">📊</span>
      <p>Ajoutez 2 à 3 offres depuis la page Hébergements pour les comparer.</p>
      <button class="btn-go-offers" onclick={goBack}>Parcourir les offres</button>
    </div>

  {:else}
    <div class="compare-table-wrap">
      <table class="compare-table">

        <!-- Header row: offer cards -->
        <thead>
          <tr class="header-row">
            <th class="label-col">Critère</th>
            {#each offers as offer, idx}
              <th class="offer-col" style="--col:{COLS_COLORS[idx]}">
                <div class="offer-header" style="--cg:{offer.gradient}">
                  <div class="offer-grad"></div>
                  <div class="offer-fade"></div>
                  <div class="offer-header-body">
                    <span class="offer-flag">{offer.countryEmoji}</span>
                    <div class="offer-hname">{offer.name}</div>
                    <div class="offer-hcity">{offer.city}</div>
                    <button
                      class="remove-btn"
                      onclick={() => toggleCompare(offer.id)}
                      aria-label="Retirer"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </th>
            {/each}
          </tr>
        </thead>

        <tbody>

          <!-- Prix par nuit -->
          <tr class="data-row highlight-row">
            <td class="label-cell">
              <span class="label-icon">💶</span> Prix / nuit
            </td>
            {#each offers as offer, idx}
              {@const minPrice = Math.min(...offers.map((o) => o.pricePerNight))}
              <td class="data-cell" style="--col:{COLS_COLORS[idx]}">
                <span class="price-val" class:best-val={offer.pricePerNight === minPrice}>
                  {offer.pricePerNight} €
                </span>
                {#if offer.pricePerNight === minPrice && offers.length > 1}
                  <span class="best-badge">Meilleur prix</span>
                {/if}
              </td>
            {/each}
          </tr>

          <!-- Étoiles -->
          <tr class="data-row">
            <td class="label-cell"><span class="label-icon">⭐</span> Étoiles</td>
            {#each offers as offer, idx}
              <td class="data-cell" style="--col:{COLS_COLORS[idx]}">
                <span class="stars-str">{starStr(offer.stars)}</span>
              </td>
            {/each}
          </tr>

          <!-- Note -->
          <tr class="data-row highlight-row">
            <td class="label-cell"><span class="label-icon">📊</span> Note</td>
            {#each offers as offer, idx}
              {@const maxRating = Math.max(...offers.map((o) => o.rating))}
              <td class="data-cell" style="--col:{COLS_COLORS[idx]}">
                <span class="rating-val" class:best-val={offer.rating === maxRating}>
                  {offer.rating.toFixed(1)} / 5
                </span>
                <div class="rating-bar-wrap">
                  <div class="rating-bar" style="width:{(offer.rating / 5) * 100}%; background:{COLS_COLORS[idx]}"></div>
                </div>
              </td>
            {/each}
          </tr>

          <!-- Avis -->
          <tr class="data-row">
            <td class="label-cell"><span class="label-icon">💬</span> Avis</td>
            {#each offers as offer, idx}
              <td class="data-cell" style="--col:{COLS_COLORS[idx]}">
                {offer.reviewCount.toLocaleString('fr-FR')} avis
              </td>
            {/each}
          </tr>

          <!-- Type -->
          <tr class="data-row highlight-row">
            <td class="label-cell"><span class="label-icon">🏷️</span> Type</td>
            {#each offers as offer, idx}
              <td class="data-cell" style="--col:{COLS_COLORS[idx]}">
                {offer.type === 'hotel' ? '🏨 Hôtel' : '🏠 Appartement'}
              </td>
            {/each}
          </tr>

          <!-- Pays / Ville -->
          <tr class="data-row">
            <td class="label-cell"><span class="label-icon">📍</span> Localisation</td>
            {#each offers as offer, idx}
              <td class="data-cell" style="--col:{COLS_COLORS[idx]}">
                {offer.countryEmoji} {offer.city}
              </td>
            {/each}
          </tr>

          <!-- Divider -->
          <tr class="section-separator">
            <td colspan={offers.length + 1}>
              <span class="sep-label">Équipements</span>
            </td>
          </tr>

          <!-- Amenities -->
          {#each allAmenities as am}
            <tr class="data-row amenity-row">
              <td class="label-cell amenity-label">{am}</td>
              {#each offers as offer, idx}
                {@const has = offer.amenities.includes(am)}
                <td class="data-cell amenity-cell" style="--col:{COLS_COLORS[idx]}">
                  {#if has}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  {:else}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}

          <!-- CTA row -->
          <tr class="cta-row">
            <td class="label-cell"></td>
            {#each offers as offer, idx}
              <td class="data-cell cta-cell" style="--col:{COLS_COLORS[idx]}">
                <button
                  class="btn-reserve"
                  style="--col:{COLS_COLORS[idx]}"
                  onclick={() => { selectOffer(offer.id); navigate('details'); }}
                >
                  Voir détails
                </button>
              </td>
            {/each}
          </tr>

        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .compare-page {
    display: flex;
    flex-direction: column;
    gap: 24px;
    animation: fade-up 0.35s ease both;
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

  .head-actions { display: flex; gap: 8px; }

  .btn-back, .btn-clear {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.18s;
  }
  .btn-back {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--text-dim);
  }
  .btn-back:hover { background: rgba(255,255,255,0.09); color: var(--text); }
  .btn-clear {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    color: #fca5a5;
  }
  .btn-clear:hover { background: rgba(239,68,68,0.14); }

  /* Empty */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 80px 32px;
    text-align: center;
    color: var(--text-muted);
    font-size: 14px;
    border: 1px dashed rgba(255,255,255,0.09);
    border-radius: var(--radius);
    background: rgba(255,255,255,0.01);
  }
  .empty-icon { font-size: 48px; }
  .btn-go-offers {
    margin-top: 8px;
    padding: 10px 24px;
    border-radius: 8px;
    background: rgba(59,130,246,0.14);
    border: 1px solid rgba(59,130,246,0.3);
    color: #93c5fd;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.18s;
  }
  .btn-go-offers:hover { background: rgba(59,130,246,0.26); }

  /* Table wrap */
  .compare-table-wrap {
    overflow-x: auto;
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  .compare-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 560px;
  }

  /* Header row */
  .header-row th { padding: 0; vertical-align: bottom; }
  .label-col {
    width: 200px;
    min-width: 160px;
    padding: 16px 20px;
    background: var(--bg-elevated);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    border-right: 1px solid var(--border);
  }

  .offer-col {
    border-right: 1px solid var(--border);
    border-bottom: 2px solid var(--col);
  }
  .offer-col:last-child { border-right: none; }

  .offer-header {
    position: relative;
    height: 130px;
    overflow: hidden;
  }
  .offer-grad {
    position: absolute;
    inset: 0;
    background: var(--cg);
    opacity: 0.15;
  }
  .offer-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 20%, rgba(9,9,11,0.9) 100%);
  }
  .offer-header-body {
    position: absolute;
    bottom: 12px;
    left: 16px;
    right: 10px;
    z-index: 2;
  }
  .offer-flag { font-size: 18px; margin-bottom: 4px; display: block; }
  .offer-hname {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .offer-hcity { font-size: 11px; color: var(--text-muted); }

  .remove-btn {
    position: absolute;
    top: -70px;
    right: 0;
    padding: 4px;
    border-radius: 4px;
    color: var(--text-muted);
    transition: all 0.15s;
  }
  .remove-btn:hover { color: var(--danger); background: rgba(239,68,68,0.1); }

  /* Data rows */
  .data-row td {
    padding: 12px 16px;
    font-size: 13px;
    color: var(--text-dim);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }
  .data-row td:last-child { border-right: none; }
  .highlight-row td { background: rgba(255,255,255,0.015); }

  .label-cell {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
    background: var(--bg-elevated) !important;
    border-right: 1px solid var(--border) !important;
    display: flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
  }
  .label-icon { font-size: 13px; }

  .data-cell { text-align: left; position: relative; }
  .data-cell::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--col);
    opacity: 0.25;
  }

  .price-val { font-family: var(--font-display); font-size: 18px; font-weight: 300; }
  .best-val  { color: var(--success) !important; }
  .best-badge {
    display: inline-block;
    margin-left: 6px;
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 20px;
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.25);
    color: #6ee7b7;
    vertical-align: middle;
  }

  .stars-str { letter-spacing: 2px; color: #fbbf24; font-size: 14px; }

  .rating-val { font-weight: 600; font-size: 14px; }
  .rating-bar-wrap {
    height: 3px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    margin-top: 5px;
  }
  .rating-bar {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
  }

  /* Amenity rows */
  .section-separator td {
    padding: 10px 20px 6px;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }
  .sep-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
  }
  .amenity-row td { padding: 8px 16px; }
  .amenity-label { font-size: 11.5px !important; }
  .amenity-cell { text-align: center; }

  /* CTA row */
  .cta-row td {
    padding: 16px;
    border-bottom: none;
    background: var(--bg-card);
  }
  .cta-cell { text-align: center; }
  .btn-reserve {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 20px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--col) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--col) 40%, transparent);
    color: var(--col);
    font-size: 12px;
    font-weight: 600;
    transition: all 0.18s;
  }
  .btn-reserve:hover {
    background: color-mix(in srgb, var(--col) 26%, transparent);
    box-shadow: 0 2px 12px color-mix(in srgb, var(--col) 25%, transparent);
  }
</style>
