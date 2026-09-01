<script lang="ts">
  import { selectedOffer, offersStore, toggleCompare, selectOffer, OFFERS } from '../lib/offersStore';
  import { navigate } from '../lib/navStore';
  import { agentContext, agentToolResolver } from '@owllayer/svelte';
  import {
    t, formatCurrency, getOfferName, getOfferCity, getOfferCountry, getOfferDesc,
  } from '../lib/i18n';
  import { z } from 'zod';
  import type { ResolverConfig } from '@owllayer/svelte';

  const offer       = $derived($selectedOffer);
  const compareList = $derived($offersStore.compareList);

  // Config tools resolver
  const resolverConfig: ResolverConfig = {
    details: {
      prefix: 'details_',
      tools: {
        addToCompare: {
          description: "Ajouter l'offre courante à la comparaison. Utiliser offerId du contexte.",
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            if (!compareList.includes(args.offerId) && compareList.length < 3) {
              toggleCompare(args.offerId);
              return { success: true,   message: 'Offre ajoutée à la comparaison' };
            }
            return { success: false, reason: 'L\'offre est déjà dans la comparaison ou la limite de 3 offres a été atteinte' };
          },
        },
        removeFromCompare: {
          description: "Retirer l'offre courante de la comparaison. Utiliser offerId du contexte.",
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async (args: any) => {
            if (compareList.includes(args.offerId)) {
              toggleCompare(args.offerId);
              return { success: true };
            }
            return { success: false, reason: 'Non présente dans la comparaison' };
          },
       
        },
        bookOffer: {
          description: "Réserver l'offre courante. Utiliser offerId du contexte.",
          schema: z.object({ offerId: z.string() }),
          risk: 'low',
          handler: async (args: any) => {
            return { success: true, message: 'Réservation effectuée pour ' + args.offerId };
          },
        },
        showSimilarOffers: {
          description: "Afficher les offres similaires à l'offre courante. Utiliser offerId du contexte.",
          schema: z.object({ offerId: z.string() }),
          risk: 'none',
          handler: async () => {
            return { success: true, similar: similar };
          },
        },
        goBackToList: {
          description: "Retourner à la liste des offres.",
          schema: z.object({}),
          risk: 'none',
          handler: async () => {
            goBack();
            return { success: true, message: 'Retour à la liste des offres' };
          },
        },
        goToCompare: {
          description: "Afficher la page de comparaison.",
          schema: z.object({}),
          risk: 'none',
          handler: async () => {
            goCompare();
            return { success: true, message: 'Page de comparaison affichée' };
          },
        },
      },
    },
  };

  function goBack() {
    navigate('offres');
  }

  function goCompare() {
    navigate('comparer');
  }

  function starArray(n: number) {
    return Array.from({ length: 5 }, (_, i) => i < n);
  }

  // Suggest similar offers (same country, different id)
  const similar = $derived(
    offer
      ? OFFERS.filter((o) => o.country === offer.country && o.id !== offer.id).slice(0, 3)
      : []
  );
</script>

{#if offer}
  <div class="details-page"
    use:agentToolResolver={{ config: resolverConfig }}
    use:agentContext={{
      page: 'details',
      offerId: offer.id,
      name: getOfferName(offer.id, offer.name),
      country: getOfferCountry(offer.id, offer.country),
      city: getOfferCity(offer.id, offer.city),
      type: offer.type,
      rating: offer.rating,
      reviewCount: offer.reviewCount,
      compareList,
      context: 'details_offre',
    }}
  >

    <!-- Hero -->
    <div class="hero" style="--cg:{offer.gradient}; --ca:{offer.accentColor}">
      <div class="hero-grad"></div>
      <div class="hero-fade"></div>

      <button class="back-btn" onclick={goBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        {$t.common.backToOffers}
      </button>

      <div class="hero-content">
        <div class="hero-meta">
          <span class="hero-flag">{offer.countryEmoji}</span>
          <span class="hero-city">{getOfferCity(offer.id, offer.city)}, {getOfferCountry(offer.id, offer.country)}</span>
          <span class="hero-type">{offer.type === 'hotel' ? `🏨 ${$t.common.hotel}` : `🏠 ${$t.common.apartment}`}</span>
        </div>
        <h1 class="hero-title">{getOfferName(offer.id, offer.name)}</h1>
        <div class="hero-stars">
          {#each starArray(offer.stars) as filled}
            <svg width="14" height="14" viewBox="0 0 24 24"
              fill={filled ? 'currentColor' : 'none'}
              stroke="currentColor" stroke-width="1.5"
              class={filled ? 'star-filled' : 'star-empty'}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          {/each}
          <span class="rating-val">{offer.rating.toFixed(1)}</span>
          <span class="rating-reviews">{offer.reviewCount.toLocaleString('fr-FR')} {$t.common.reviews}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content">

      <!-- Left column -->
      <div class="col-main">

        <!-- Description -->
        <section class="section">
          <h2 class="section-title">{$t.common.about}</h2>
          <p class="description">{getOfferDesc(offer.id, offer.description)}</p>
        </section>

        <!-- Amenities -->
        <section class="section">
          <h2 class="section-title">{$t.common.amenitiesAndServices}</h2>
          <div class="amenities-grid">
            {#each offer.amenities as am}
              <div class="amenity-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="amenity-icon">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{am}</span>
              </div>
            {/each}
          </div>
        </section>

        <!-- Nearby -->
        <section class="section">
          <h2 class="section-title">{$t.common.nearby}</h2>
          <div class="nearby-list">
            {#each offer.nearby as place}
              <div class="nearby-item">
                <span class="nearby-dot" style="background:{offer.accentColor}"></span>
                {place}
              </div>
            {/each}
          </div>
        </section>
      </div>

      <!-- Right column — booking card -->
      <div class="col-side">
        <div class="booking-card">
          <div class="booking-price">
            <span class="price-big">{formatCurrency(offer.pricePerNight)}</span>
            <span class="price-label">{$t.common.perNight}</span>
          </div>
          <div class="booking-divider"></div>
          <div class="booking-info">
            <div class="info-row">
              <span class="info-label">{$t.common.rating}</span>
              <span class="info-val">⭐ {offer.rating.toFixed(1)} / 5.0</span>
            </div>
            <div class="info-row">
              <span class="info-label">{$t.common.reviews}</span>
              <span class="info-val">{offer.reviewCount.toLocaleString('fr-FR')} {$t.common.verifiedReviews}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{$t.common.category}</span>
              <span class="info-val">{'★'.repeat(offer.stars)}{'☆'.repeat(5 - offer.stars)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">{$t.common.location}</span>
              <span class="info-val">{getOfferCity(offer.id, offer.city)}, {getOfferCountry(offer.id, offer.country)}</span>
            </div>
          </div>
          <button class="btn-book">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {$t.common.bookOfferBtn}
          </button>
          <button
            class="btn-add-compare"
            class:active={compareList.includes(offer.id)}
            onclick={() => toggleCompare(offer.id)}
            disabled={!compareList.includes(offer.id) && compareList.length >= 3}
          >
            {compareList.includes(offer.id) ? `✓ ${$t.common.inCompare}` : $t.common.addToCompare}
          </button>
          {#if compareList.length > 0}
            <button class="btn-go-compare" onclick={goCompare}>
              {$t.common.compareAction} ({compareList.length})
            </button>
          {/if}
        </div>
      </div>
    </div>

    <!-- Similar offers -->
    {#if similar.length > 0}
      <section class="similar-section">
        <h2 class="section-title">{$t.offers.title} — {getOfferCountry(offer.id, offer.country)}</h2>
        <div class="similar-grid">
          {#each similar as s}
            <button
              class="similar-card"
              style="--cg:{s.gradient}; --ca:{s.accentColor}"
              onclick={() => selectOffer(s.id)}
            >
              <div class="sim-grad"></div>
              <div class="sim-fade"></div>
              <div class="sim-body">
                <span class="sim-flag">{s.countryEmoji}</span>
                <div class="sim-name">{getOfferName(s.id, s.name)}</div>
                <div class="sim-price">{formatCurrency(s.pricePerNight)}{$t.common.perNight}</div>
              </div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

  </div>
{:else}
  <div class="no-selection">
    <span class="no-sel-icon">🏨</span>
    <p>{$t.common.emptyCompareTitle}</p>
    <button class="btn-go-back" onclick={goBack}>{$t.common.backToOffers}</button>
  </div>
{/if}

<style>
  .details-page {
    display: flex;
    flex-direction: column;
    gap: 0;
    animation: fade-up 0.35s ease both;
  }

  /* Hero */
  .hero {
    position: relative;
    height: 260px;
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 28px;
  }
  .hero-grad {
    position: absolute;
    inset: 0;
    background: var(--cg);
    opacity: 0.22;
  }
  .hero-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(9,9,11,0.1) 0%, rgba(9,9,11,0.85) 100%);
  }

  .back-btn {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--text-dim);
    font-size: 12px;
    font-weight: 500;
    transition: all 0.18s;
  }
  .back-btn:hover { background: rgba(0,0,0,0.7); color: var(--text); }

  .hero-content {
    position: absolute;
    bottom: 22px;
    left: 24px;
    z-index: 2;
  }
  .hero-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .hero-flag { font-size: 20px; }
  .hero-city {
    font-size: 12px;
    color: var(--text-dim);
    font-weight: 500;
  }
  .hero-type {
    font-size: 10px;
    padding: 2px 9px;
    border-radius: 20px;
    background: rgba(0,0,0,0.45);
    border: 1px solid rgba(255,255,255,0.14);
    color: var(--text-dim);
  }
  .hero-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 300;
    letter-spacing: -0.02em;
    color: var(--text);
    line-height: 1.15;
    margin-bottom: 8px;
  }
  .hero-stars {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .star-filled { color: #fbbf24; }
  .star-empty  { color: rgba(255,255,255,0.15); }
  .rating-val  { font-size: 14px; color: var(--text); font-weight: 600; margin-left: 6px; }
  .rating-reviews { font-size: 12px; color: var(--text-muted); margin-left: 4px; }

  /* Content layout */
  .content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 28px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .content { grid-template-columns: 1fr; }
    .col-side { order: -1; }
  }

  .col-main { display: flex; flex-direction: column; gap: 28px; }

  /* Sections */
  .section { display: flex; flex-direction: column; gap: 14px; }
  .section-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 400;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .description {
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.7;
  }

  .amenities-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }
  .amenity-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12.5px;
    color: var(--text-dim);
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .amenity-icon { color: var(--success); flex-shrink: 0; }

  .nearby-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .nearby-item {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .nearby-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    opacity: 0.8;
  }

  /* Booking card */
  .booking-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: sticky;
    top: 74px;
  }
  .booking-price {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .price-big {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 200;
    color: var(--text);
  }
  .price-label { font-size: 13px; color: var(--text-muted); }
  .booking-divider { height: 1px; background: var(--border); }

  .booking-info { display: flex; flex-direction: column; gap: 10px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .info-label { font-size: 12px; color: var(--text-muted); }
  .info-val   { font-size: 12px; color: var(--text); font-weight: 500; }

  .btn-book {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 10px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(139,92,246,0.3);
  }
  .btn-book:hover { filter: brightness(1.1); box-shadow: 0 6px 28px rgba(139,92,246,0.45); }

  .btn-add-compare {
    padding: 9px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    transition: all 0.18s;
  }
  .btn-add-compare:hover:not(:disabled) {
    background: rgba(139,92,246,0.12);
    border-color: rgba(139,92,246,0.3);
    color: #c4b5fd;
  }
  .btn-add-compare.active {
    background: rgba(139,92,246,0.15);
    border-color: rgba(139,92,246,0.4);
    color: #c4b5fd;
  }
  .btn-add-compare:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-go-compare {
    padding: 8px;
    border-radius: 8px;
    background: rgba(139,92,246,0.1);
    border: 1px solid rgba(139,92,246,0.25);
    color: #c4b5fd;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    transition: all 0.18s;
  }
  .btn-go-compare:hover {
    background: rgba(139,92,246,0.2);
    border-color: rgba(139,92,246,0.45);
  }

  /* Similar */
  .similar-section {
    margin-top: 36px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .similar-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 700px) { .similar-grid { grid-template-columns: 1fr; } }

  .similar-card {
    position: relative;
    height: 110px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid var(--border);
    cursor: pointer;
    transition: transform 0.2s, border-color 0.2s;
  }
  .similar-card:hover {
    transform: translateY(-3px);
    border-color: rgba(255,255,255,0.14);
  }
  .sim-grad {
    position: absolute;
    inset: 0;
    background: var(--cg);
    opacity: 0.18;
    transition: opacity 0.3s;
  }
  .similar-card:hover .sim-grad { opacity: 0.28; }
  .sim-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 20%, rgba(9,9,11,0.9) 100%);
  }
  .sim-body {
    position: absolute;
    bottom: 10px;
    left: 12px;
    right: 12px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sim-flag { font-size: 18px; margin-bottom: 3px; }
  .sim-name  { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sim-price { font-size: 11px; color: var(--text-muted); }

  /* Empty */
  .no-selection {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 80px 32px;
    text-align: center;
    color: var(--text-muted);
  }
  .no-sel-icon { font-size: 48px; }
  .btn-go-back {
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
  .btn-go-back:hover { background: rgba(59,130,246,0.26); }
</style>
