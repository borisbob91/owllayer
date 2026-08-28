<script lang="ts">
  import { z } from 'zod';
  import { agentToolResolver, agentContext, agentState, isThinking, isSpeaking, setClientLanguage } from '@owllayer/svelte';
  import { get } from 'svelte/store';
  import {
    tripStore, addToTrip, removeFromTrip, addActivity,
    setBudget, setSearchQuery, estimatedCost, COST_PER_DAY,
  } from './lib/tripStore';
  import { currentPage, navigate } from './lib/navStore';
  import { offersStore, selectOffer, OFFERS } from './lib/offersStore';
  import { isPanelOpen, togglePanel } from './lib/panelStore';
  import {
    t, currentLocale, setLocale, toggleLocale, formatCurrency,
    getDestinationName, getDestinationCountry, getDestinationDesc,
  } from './lib/i18n';

  import DestinationGrid  from './components/DestinationGrid.svelte';
  import TripItinerary    from './components/TripItinerary.svelte';
  import BudgetTracker    from './components/BudgetTracker.svelte';
  import VoicePanel       from './components/VoicePanel.svelte';
  import OffresPage       from './pages/OffresPage.svelte';
  import DetailsPage      from './pages/DetailsPage.svelte';
  import ComparePage      from './pages/ComparePage.svelte';

  const page         = $derived($currentPage);

  $effect(() => {
    setClientLanguage($currentLocale);
  });
  const compareCount = $derived($offersStore.compareList.length);
  const panelOpen    = $derived($isPanelOpen);
  const USE_DEFAULT_WIDGET = import.meta.env.VITE_USE_DEFAULT_WIDGET === 'true';

  // ── Live agent context (sent with every interaction) ────────────────────
  const contextData = $derived({
    role:        'assistant_voyage',
    description: $t.agent.roleDescription,
    language:    $currentLocale,
    currency:    $t.common.currency,
    currentPage: $currentPage,

    // Voyage en cours
    itinerary: $tripStore.itinerary.map((i) => ({
      destinationId: i.destinationId,
      name:          getDestinationName(i.destinationId, $tripStore.destinations.find((d) => d.id === i.destinationId)?.name ?? i.destinationId),
      days:          i.days,
      activities:    i.activities,
      estimatedCost: i.days * COST_PER_DAY,
    })),
    budget:         $tripStore.budget,
    estimatedCost:  $estimatedCost,
    remainingBudget: $tripStore.budget - $estimatedCost,
    totalDays:       $tripStore.itinerary.reduce((s, i) => s + i.days, 0),

    // Catalogue destinations
    destinations: $tripStore.destinations.map((d) => ({
      id:            d.id,
      name:          getDestinationName(d.id, d.name),
      country:       getDestinationCountry(d.id, d.country),
      avgDays:       d.avgDays,
      estimatedCost: d.avgDays * COST_PER_DAY,
      inTrip:        $tripStore.itinerary.some((i) => i.destinationId === d.id),
    })),

    // Hébergements disponibles (résumé)
    offers: OFFERS.map((o) => ({
      id:            o.id,
      name:          o.name,
      type:          o.type,
      city:          o.city,
      country:       o.country,
      stars:         o.stars,
      pricePerNight: o.pricePerNight,
      rating:        o.rating,
    })),

    compareList: $offersStore.compareList,
  });

  // ── Agent tool definitions (reactive — descriptions include live data) ───
  const resolverConfig = $derived({
    travel: {
      tools: {

        search_destinations: {
          description: `${$t.agent.searchDestDesc} : ${
            $tripStore.destinations.map((d) =>
              `${d.id}="${d.emoji}${getDestinationName(d.id, d.name)}" pays="${getDestinationCountry(d.id, d.country)}" avgDays=${d.avgDays}`
            ).join(' | ')
          }.`,
          schema: z.object({ query: z.string().describe('Search query') }),
          risk: 'none' as const,
          handler: ({ query }: { query: string }) => {
            setSearchQuery(query);
            navigate('destinations');
            const s = get(tripStore);
            const q = query.toLowerCase();
            const results = s.destinations.filter(
              (d) =>
                d.name.toLowerCase().includes(q)        ||
                d.country.toLowerCase().includes(q)     ||
                d.description.toLowerCase().includes(q),
            );
            return {
              found: results.length,
              destinations: results.map((d) => ({ id: d.id, name: getDestinationName(d.id, d.name), country: getDestinationCountry(d.id, d.country), avgDays: d.avgDays })),
            };
          },
        },

        add_to_trip: {
          description: `${$t.agent.addToTripDesc}. Budget: ${$tripStore.budget}${$t.common.currencySymbol}, spent: ~${$estimatedCost}${$t.common.currencySymbol}. Destinations: ${
            $tripStore.destinations
              .filter((d) => !$tripStore.itinerary.some((i) => i.destinationId === d.id))
              .map((d) => `${d.id}(${d.emoji}${getDestinationName(d.id, d.name)})`)
              .join(', ') || 'All added'
          }.`,
          schema: z.object({
            destinationId: z.string().describe('Destination ID'),
            days: z.number().min(1).max(30).describe('Duration in days'),
          }),
          risk: 'none' as const,
          handler: ({ destinationId, days }: { destinationId: string; days: number }) => {
            const s = get(tripStore);
            const dest = s.destinations.find((d) => d.id === destinationId);
            if (!dest) return { success: false, message: `Destination "${destinationId}" not found.` };
            if (s.itinerary.some((i) => i.destinationId === destinationId))
              return { success: false, message: `${getDestinationName(dest.id, dest.name)} is already in the trip.` };
            addToTrip(destinationId, days);
            return { success: true, message: `${dest.emoji} ${getDestinationName(dest.id, dest.name)} added (${days} day${days > 1 ? 's' : ''}).` };
          },
        },

        add_activity: {
          description: `${$t.agent.addActivityDesc}. Planned: ${
            $tripStore.itinerary.length
              ? $tripStore.itinerary.map((i) => {
                  const d = $tripStore.destinations.find((x) => x.id === i.destinationId);
                  return `${i.destinationId}(${d?.emoji}${getDestinationName(d?.id ?? '', d?.name ?? '')}, ${i.days}d, activities: ${i.activities.join(', ') || 'none'})`;
                }).join(' | ')
              : 'None'
          }.`,
          schema: z.object({
            destinationId: z.string().describe('Destination ID'),
            activity: z.string().describe('Activity description'),
          }),
          risk: 'none' as const,
          handler: ({ destinationId, activity }: { destinationId: string; activity: string }) => {
            const s = get(tripStore);
            if (!s.itinerary.some((i) => i.destinationId === destinationId))
              return { success: false, message: "This destination is not in your trip." };
            addActivity(destinationId, activity);
            const dest = s.destinations.find((d) => d.id === destinationId);
            return { success: true, message: `Activity added to ${dest ? getDestinationName(dest.id, dest.name) : destinationId}: "${activity}".` };
          },
        },

        set_budget: {
          description: `${$t.agent.setBudgetDesc}. Current: ${$tripStore.budget}${$t.common.currencySymbol}, estimated: ~${$estimatedCost}${$t.common.currencySymbol}.`,
          schema: z.object({ amount: z.number().min(100).describe('Budget amount') }),
          risk: 'low' as const,
          handler: ({ amount }: { amount: number }) => {
            setBudget(amount);
            return { success: true, message: `Budget updated to ${formatCurrency(amount)}.` };
          },
        },

        remove_destination: {
          description: `${$t.agent.removeDestDesc}. In trip: ${
            $tripStore.itinerary.length
              ? $tripStore.itinerary.map((i) => `${i.destinationId}(${i.days}d)`).join(', ')
              : 'None'
          }.`,
          schema: z.object({ destinationId: z.string().describe('Destination ID to remove') }),
          risk: 'low' as const,
          handler: ({ destinationId }: { destinationId: string }) => {
            const s = get(tripStore);
            const dest = s.destinations.find((d) => d.id === destinationId);
            removeFromTrip(destinationId);
            return { success: true, message: `${dest?.emoji ?? ''} ${dest ? getDestinationName(dest.id, dest.name) : destinationId} removed from trip.` };
          },
        },

        book_trip: {
          description: $t.agent.bookTripDesc,
          schema: z.object({
            confirm: z.boolean().optional().describe('Confirm booking (default: true)'),
          }),
          risk: 'critical' as const,
          handler: (args?: { confirm?: boolean }) => {
            const confirm = args?.confirm !== false;
            if (!confirm) {
              return {
                success: false,
                message: $currentLocale === 'fr' ? 'Réservation annulée.' : 'Booking cancelled.',
              };
            }
            const s = get(tripStore);
            if (s.itinerary.length === 0) {
              return {
                success: false,
                message: $currentLocale === 'fr'
                  ? 'Votre itinéraire est vide. Veuillez ajouter au moins une destination avant de réserver.'
                  : 'Your itinerary is empty. Please add at least one destination before booking.',
              };
            }
            const n    = s.itinerary.length;
            const days = s.itinerary.reduce((d, i) => d + i.days, 0);
            return {
              success: true,
              booked: true,
              message: $currentLocale === 'fr'
                ? `✅ Voyage réservé avec succès ! ${n} destination${n > 1 ? 's' : ''}, ${days} jours.`
                : `✅ Trip successfully booked! ${n} destination${n > 1 ? 's' : ''}, ${days} days.`,
            };
          },
        },

        navigate_to: {
          description: $t.nav.routesDescription,
          schema: z.object({
            page: z.enum(['destinations', 'offres', 'details', 'comparer']).describe('Target page'),
            offerId: z.string().optional().describe("Offer ID for details page"),
          }),
          risk: 'none' as const,
          handler: ({ page: p, offerId }: { page: 'destinations' | 'offres' | 'details' | 'comparer'; offerId?: string }) => {
            if (offerId) selectOffer(offerId);
            navigate(p);
            return { success: true, message: `Navigated to ${p}.` };
          },
        },

      },
    },
  });
</script>

<div
  class="app"
  use:agentToolResolver={{ config: resolverConfig, options: { global: true } }}
  use:agentContext={contextData}
>

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <header class="header">

    <div class="brand">
      <span class="brand-icon">✈</span>
      <span class="brand-name">OwlLayer <em>Travel</em></span>
    </div>

    <!-- Navigation tabs -->
    <nav class="nav-tabs">
      <button class="nav-tab" class:active={page === 'destinations'} onclick={() => navigate('destinations')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
        </svg>
        {$t.nav.destinations}
      </button>
      <button class="nav-tab" class:active={page === 'offres'} onclick={() => navigate('offres')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        {$t.nav.offers}
      </button>
      <button class="nav-tab" class:active={page === 'details'} onclick={() => navigate('details')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        {$t.nav.details}
      </button>
      <button class="nav-tab" class:active={page === 'comparer'} onclick={() => navigate('comparer')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="10"/>
        </svg>
        {$t.nav.compare}
        {#if compareCount > 0}
          <span class="nav-badge">{compareCount}</span>
        {/if}
      </button>
    </nav>

    <div class="header-right">
      <!-- Language Switcher -->
      <div class="lang-switch">
        <button
          class="lang-btn"
          class:active={$currentLocale === 'en'}
          onclick={() => setLocale('en')}
        >
          🇬🇧 EN
        </button>
        <button
          class="lang-btn"
          class:active={$currentLocale === 'fr'}
          onclick={() => setLocale('fr')}
        >
          🇫🇷 FR
        </button>
      </div>

      <!-- Agent status -->
      <div class="agent-status">
        <span class="status-dot"
          class:thinking={$isThinking}
          class:speaking={$isSpeaking}
          class:connected={$agentState === 'connected' && !$isThinking && !$isSpeaking}
        ></span>
        <span class="status-label">
          {#if $isThinking}
            {$currentLocale === 'fr' ? 'Réfléchit…' : 'Thinking…'}
          {:else if $isSpeaking}
            {$currentLocale === 'fr' ? 'Répond…' : 'Speaking…'}
          {:else if $agentState === 'connected'}
            {$currentLocale === 'fr' ? 'Agent prêt' : 'Agent ready'}
          {:else if $agentState === 'connecting'}
            {$currentLocale === 'fr' ? 'Connexion…' : 'Connecting…'}
          {:else if $agentState === 'error'}
            {$currentLocale === 'fr' ? 'Erreur' : 'Error'}
          {:else if $agentState === 'disconnected'}
            {$currentLocale === 'fr' ? 'Déconnecté' : 'Disconnected'}
          {:else}
            {$currentLocale === 'fr' ? 'Connexion…' : 'Connecting…'}
          {/if}
        </span>
      </div>

      <!-- Panel toggle button -->
      {#if !USE_DEFAULT_WIDGET}
        <button
          class="panel-toggle"
          class:active={panelOpen}
          onclick={togglePanel}
          title={panelOpen ? ($currentLocale === 'fr' ? 'Fermer l\'assistant' : 'Close assistant') : ($currentLocale === 'fr' ? 'Ouvrir l\'assistant IA' : 'Open AI assistant')}
          aria-label="Assistant IA"
        >
          {#if panelOpen}
            <!-- X when open -->
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          {:else}
            <!-- Mic icon when closed -->
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
          {/if}
        </button>
      {/if}
    </div>

  </header>

  <!-- ── App body: [VoicePanel | Content] ────────────────────────────────── -->
  <div class="app-body">

    <!-- Side panel (handles its own width transition) -->
    {#if !USE_DEFAULT_WIDGET}
      <VoicePanel />
    {/if}

    <!-- Content area -->
    <div class="content-area">

      {#if page === 'destinations'}
        <div class="layout">
          <aside class="sidebar">
            <TripItinerary />
            <BudgetTracker />
          </aside>
          <main class="main">
            <DestinationGrid />
          </main>
        </div>

      {:else if page === 'offres'}
        <div class="fullpage">
          <OffresPage />
        </div>

      {:else if page === 'details'}
        <div class="fullpage">
          <DetailsPage />
        </div>

      {:else if page === 'comparer'}
        <div class="fullpage">
          <ComparePage />
        </div>
      {/if}

    </div>
  </div>

</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
    overflow: hidden;
  }

  /* ── Header ───────────────────────────────────────────────────────────── */
  .header {
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    border-bottom: 1px solid var(--border);
    background: rgba(13, 20, 36, 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
    gap: 12px;
    z-index: 50;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-shrink: 0;
  }
  .brand-icon {
    font-size: 18px;
    filter: drop-shadow(0 0 8px rgba(59,130,246,0.7));
  }
  .brand-name {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 300;
    color: var(--text);
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
  .brand-name em {
    font-style: italic;
    font-weight: 400;
    background: linear-gradient(90deg, #60a5fa, #c084fc);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* ── Nav tabs ─────────────────────────────────────────────────────────── */
  .nav-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    justify-content: center;
    min-width: 0;
  }
  .nav-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-dim);
    border: 1px solid transparent;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .nav-tab:hover {
    color: var(--text);
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.12);
  }
  .nav-tab.active {
    color: #ffffff;
    background: rgba(59,130,246,0.2);
    border-color: rgba(59,130,246,0.4);
    box-shadow: 0 0 14px rgba(59,130,246,0.2);
  }
  .nav-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    border-radius: 8px;
    background: var(--accent-v);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
  }

  /* ── Header right ─────────────────────────────────────────────────────── */
  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .lang-switch {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 2px;
    gap: 2px;
  }
  .lang-btn {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 7px;
    border-radius: 6px;
    color: var(--text-dim);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
  }
  .lang-btn:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }
  .lang-btn.active {
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  }
  .agent-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #475569;
    transition: background 0.4s;
    flex-shrink: 0;
  }
  .status-dot.connected { background: var(--success); }
  .status-dot.thinking  { background: #a855f7; animation: pulse-dot 1s infinite; }
  .status-dot.speaking  { background: var(--accent); animation: pulse-dot 0.8s infinite; }
  .status-label { font-size: 12px; color: var(--text-dim); font-weight: 500; }

  /* Panel toggle button */
  .panel-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--border);
    color: var(--text-dim);
    transition: all 0.2s;
  }
  .panel-toggle:hover {
    background: rgba(139,92,246,0.18);
    border-color: rgba(139,92,246,0.4);
    color: #ffffff;
  }
  .panel-toggle.active {
    background: rgba(139,92,246,0.22);
    border-color: rgba(139,92,246,0.5);
    color: #ffffff;
    box-shadow: 0 0 14px rgba(139,92,246,0.3);
  }

  /* ── App body ─────────────────────────────────────────────────────────── */
  .app-body {
    display: flex;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }

  /* Content area — compresses when panel opens */
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  /* ── Destinations layout ──────────────────────────────────────────────── */
  .layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .sidebar {
    width: var(--sidebar-width);
    flex-shrink: 0;
    background: rgba(13, 19, 32, 0.7);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .main {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    min-width: 0;
  }

  /* ── Full page layout ─────────────────────────────────────────────────── */
  .fullpage {
    flex: 1;
    overflow-y: auto;
    padding: 28px 32px;
    animation: page-slide 0.25s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  /* ── Responsive ───────────────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .layout  { flex-direction: column; overflow-y: auto; }
    .sidebar { width: 100%; flex-shrink: 0; border-right: none; border-bottom: 1px solid var(--border); }
    .fullpage { padding: 20px 16px; }
  }
  @media (max-width: 700px) {
    .nav-tabs    { gap: 0; }
    .nav-tab     { padding: 5px 8px; font-size: 11px; gap: 4px; }
    .brand-name  { display: none; }
    .status-label { display: none; }
    .header      { padding: 0 12px; }
    .fullpage    { padding: 16px 12px; }
  }
</style>
