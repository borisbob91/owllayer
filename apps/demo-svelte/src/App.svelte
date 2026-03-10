<script lang="ts">
  import { z } from 'zod';
  import { agentToolResolver, agentContext, agentState, isThinking, isSpeaking } from '@domos/svelte';
  import { get } from 'svelte/store';
  import {
    tripStore, addToTrip, removeFromTrip, addActivity,
    setBudget, setSearchQuery, estimatedCost, COST_PER_DAY,
  } from './lib/tripStore';
  import { currentPage, navigate } from './lib/navStore';
  import { offersStore, selectOffer, OFFERS } from './lib/offersStore';
  import { isPanelOpen, togglePanel } from './lib/panelStore';

  import DestinationGrid  from './components/DestinationGrid.svelte';
  import TripItinerary    from './components/TripItinerary.svelte';
  import BudgetTracker    from './components/BudgetTracker.svelte';
  import VoicePanel       from './components/VoicePanel.svelte';
  import OffresPage       from './pages/OffresPage.svelte';
  import DetailsPage      from './pages/DetailsPage.svelte';
  import ComparePage      from './pages/ComparePage.svelte';

  const page         = $derived($currentPage);
  const compareCount = $derived($offersStore.compareList.length);
  const panelOpen    = $derived($isPanelOpen);

  // ── Live agent context (sent with every interaction) ────────────────────
  const contextData = $derived({
    role:        'assistant_voyage',
    description: "Tu est l'Assistant IA de planification de voyage DomOS Travel — aide à trouver des destinations, planifier un itinéraire et réserver des hébergements.",
    currentPage: $currentPage,

    // Voyage en cours
    itinerary: $tripStore.itinerary.map((i) => ({
      destinationId: i.destinationId,
      name:          $tripStore.destinations.find((d) => d.id === i.destinationId)?.name,
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
      name:          d.name,
      country:       d.country,
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
          description: `Rechercher des destinations de voyage. Catalogue complet (${$tripStore.destinations.length} destinations, ~${COST_PER_DAY}€/jour) : ${
            $tripStore.destinations.map((d) =>
              `${d.id}="${d.emoji}${d.name}" pays="${d.country}" durée-conseillée=${d.avgDays}j coût-estimé=~${d.avgDays * COST_PER_DAY}€`
            ).join(' | ')
          }.`,
          schema: z.object({ query: z.string().describe('Terme de recherche') }),
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
              destinations: results.map((d) => ({ id: d.id, name: d.name, country: d.country, avgDays: d.avgDays })),
            };
          },
        },

        add_to_trip: {
          description: `Ajouter une destination au voyage de l'utilisateur. Budget: ${$tripStore.budget}€, déjà dépensé: ~${$estimatedCost}€, reste: ~${$tripStore.budget - $estimatedCost}€. Destinations disponibles (pas encore dans le voyage) : ${
            $tripStore.destinations
              .filter((d) => !$tripStore.itinerary.some((i) => i.destinationId === d.id))
              .map((d) => `${d.id}(${d.emoji}${d.name}, ~${d.avgDays * COST_PER_DAY}€ pour ${d.avgDays}j)`)
              .join(', ') || 'Toutes ajoutées'
          }. Déjà dans le voyage : ${
            $tripStore.itinerary.length
              ? $tripStore.itinerary.map((i) => `${i.destinationId}(${i.days}j)`).join(', ')
              : 'Aucun'
          }.`,
          schema: z.object({
            destinationId: z.string().describe('ID de la destination'),
            days: z.number().min(1).max(30).describe('Nombre de jours'),
          }),
          risk: 'none' as const,
          handler: ({ destinationId, days }: { destinationId: string; days: number }) => {
            const s = get(tripStore);
            const dest = s.destinations.find((d) => d.id === destinationId);
            if (!dest) return { success: false, message: `Destination "${destinationId}" introuvable.` };
            if (s.itinerary.some((i) => i.destinationId === destinationId))
              return { success: false, message: `${dest.name} est déjà dans le voyage.` };
            addToTrip(destinationId, days);
            return { success: true, message: `${dest.emoji} ${dest.name} ajoutée (${days} jour${days > 1 ? 's' : ''}).` };
          },
        },

        add_activity: {
          description: `Ajouter une activité à une destination déjà dans le voyage. Destinations actuellement dans le voyage : ${
            $tripStore.itinerary.length
              ? $tripStore.itinerary.map((i) => {
                  const d = $tripStore.destinations.find((x) => x.id === i.destinationId);
                  return `${i.destinationId}(${d?.emoji}${d?.name}, ${i.days}j, activités: ${i.activities.join(', ') || 'aucune'})`;
                }).join(' | ')
              : 'Aucune destination — ajoutez-en d\'abord avec add_to_trip'
          }.`,
          schema: z.object({
            destinationId: z.string().describe('ID de la destination'),
            activity: z.string().describe('Activité à ajouter, ex: "Visite du Panthéon"'),
          }),
          risk: 'none' as const,
          handler: ({ destinationId, activity }: { destinationId: string; activity: string }) => {
            const s = get(tripStore);
            if (!s.itinerary.some((i) => i.destinationId === destinationId))
              return { success: false, message: "Cette destination n'est pas dans votre voyage." };
            addActivity(destinationId, activity);
            const dest = s.destinations.find((d) => d.id === destinationId);
            return { success: true, message: `Activité ajoutée à ${dest?.name ?? destinationId} : "${activity}".` };
          },
        },

        set_budget: {
          description: `Définir le budget total du voyage en euros. Budget actuel: ${$tripStore.budget}€, coût estimé actuel: ~${$estimatedCost}€ (${$tripStore.itinerary.reduce((s,i)=>s+i.days,0)} jours × ${COST_PER_DAY}€/j).`,
          schema: z.object({ amount: z.number().min(100).describe('Budget en €') }),
          risk: 'low' as const,
          handler: ({ amount }: { amount: number }) => {
            setBudget(amount);
            return { success: true, message: `Budget défini à ${amount} €.` };
          },
        },

        remove_destination: {
          description: `Retirer une destination du voyage. Destinations actuellement dans le voyage : ${
            $tripStore.itinerary.length
              ? $tripStore.itinerary.map((i) => `${i.destinationId}(${i.days}j, ~${i.days * COST_PER_DAY}€)`).join(', ')
              : 'Aucune'
          }.`,
          schema: z.object({ destinationId: z.string().describe('ID de la destination à retirer') }),
          risk: 'low' as const,
          handler: ({ destinationId }: { destinationId: string }) => {
            const s = get(tripStore);
            const dest = s.destinations.find((d) => d.id === destinationId);
            removeFromTrip(destinationId);
            return { success: true, message: `${dest?.emoji ?? ''} ${dest?.name ?? destinationId} retiré du voyage.` };
          },
        },

        book_trip: {
          description: 'Finaliser et réserver le voyage complet. Action irréversible — demande confirmation.',
          schema: z.object({ confirm: z.boolean().describe('Confirmer la réservation') }),
          risk: 'critical' as const,
          handler: ({ confirm }: { confirm: boolean }) => {
            if (!confirm) return { success: false, message: 'Réservation annulée.' };
            const s = get(tripStore);
            const n    = s.itinerary.length;
            const days = s.itinerary.reduce((d, i) => d + i.days, 0);
            return {
              success: true,
              message: `✅ Voyage réservé ! ${n} destination${n > 1 ? 's' : ''}, ${days} jours. Confirmation envoyée par email.`,
            };
          },
        },

        navigate_to: {
          description: `Naviguer vers une page de l'application. Page actuelle: "${$currentPage}". Pages disponibles : destinations (grille voyage, itinéraire, budget), offres (${OFFERS.length} hébergements France+Côte d'Ivoire), details (fiche d'un hébergement, offerId requis), comparer (comparatif côte-à-côte, ${$offersStore.compareList.length}/3 offres sélectionnées).`,
          schema: z.object({
            page: z.enum(['destinations', 'offres', 'details', 'comparer']).describe('Page cible'),
            offerId: z.string().optional().describe("ID offre à afficher en détail (si page=details)"),
          }),
          risk: 'none' as const,
          handler: ({ page: p, offerId }: { page: 'destinations' | 'offres' | 'details' | 'comparer'; offerId?: string }) => {
            if (offerId) selectOffer(offerId);
            navigate(p);
            return { success: true, message: `Navigation vers la page "${p}".` };
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
      <span class="brand-name">DomOS <em>Travel</em></span>
    </div>

    <!-- Navigation tabs -->
    <nav class="nav-tabs">
      <button class="nav-tab" class:active={page === 'destinations'} onclick={() => navigate('destinations')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
        </svg>
        Destinations
      </button>
      <button class="nav-tab" class:active={page === 'offres'} onclick={() => navigate('offres')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Hébergements
      </button>
      <button class="nav-tab" class:active={page === 'details'} onclick={() => navigate('details')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        Détails
      </button>
      <button class="nav-tab" class:active={page === 'comparer'} onclick={() => navigate('comparer')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="10"/>
        </svg>
        Comparer
        {#if compareCount > 0}
          <span class="nav-badge">{compareCount}</span>
        {/if}
      </button>
    </nav>

    <div class="header-right">
      <!-- Agent status -->
      <div class="agent-status">
        <span class="status-dot"
          class:thinking={$isThinking}
          class:speaking={$isSpeaking}
          class:connected={$agentState === 'connected' && !$isThinking && !$isSpeaking}
        ></span>
        <span class="status-label">
          {#if $isThinking}Réfléchit…
          {:else if $isSpeaking}Répond…
          {:else if $agentState === 'connected'}Agent prêt
          {:else}Connexion…
          {/if}
        </span>
      </div>

      <!-- Panel toggle button -->
      <button
        class="panel-toggle"
        class:active={panelOpen}
        onclick={togglePanel}
        title={panelOpen ? 'Fermer l\'assistant' : 'Ouvrir l\'assistant IA'}
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
    </div>

  </header>

  <!-- ── App body: [VoicePanel | Content] ────────────────────────────────── -->
  <div class="app-body">

    <!-- Side panel (handles its own width transition) -->
    <VoicePanel />

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
    background: rgba(9, 9, 11, 0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
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
    filter: drop-shadow(0 0 7px rgba(59,130,246,0.55));
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
    background: linear-gradient(90deg, var(--accent), var(--accent-v));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* ── Nav tabs ─────────────────────────────────────────────────────────── */
  .nav-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    justify-content: center;
    min-width: 0;
  }
  .nav-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 13px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-muted);
    border: 1px solid transparent;
    transition: all 0.18s;
    white-space: nowrap;
  }
  .nav-tab:hover   { color: var(--text-dim); background: rgba(255,255,255,0.04); }
  .nav-tab.active  { color: var(--text); background: rgba(255,255,255,0.06); border-color: var(--border); }
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
  .agent-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #374151;
    transition: background 0.4s;
    flex-shrink: 0;
  }
  .status-dot.connected { background: var(--success); }
  .status-dot.thinking  { background: #a855f7; animation: pulse-dot 1s infinite; }
  .status-dot.speaking  { background: var(--accent); animation: pulse-dot 0.8s infinite; }
  .status-label { font-size: 12px; color: var(--text-muted); }

  /* Panel toggle button */
  .panel-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border);
    color: var(--text-muted);
    transition: all 0.2s;
  }
  .panel-toggle:hover {
    background: rgba(139,92,246,0.12);
    border-color: rgba(139,92,246,0.3);
    color: #c4b5fd;
  }
  .panel-toggle.active {
    background: rgba(139,92,246,0.15);
    border-color: rgba(139,92,246,0.35);
    color: #c4b5fd;
    box-shadow: 0 0 12px rgba(139,92,246,0.2);
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
