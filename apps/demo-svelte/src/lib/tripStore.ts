import { writable, derived } from 'svelte/store';

// ─────────────────────────────────── Types ───────────────────────────────────
export type Destination = {
  id: string;
  name: string;
  country: string;
  emoji: string;
  gradient: string;    // CSS gradient simulating a photo
  accentColor: string; // dominant hue for glow / accents
  description: string;
  avgDays: number;
};

export type TripDay = {
  destinationId: string;
  days: number;
  activities: string[];
};

export type TripState = {
  destinations: Destination[];
  itinerary: TripDay[];
  budget: number;
  searchQuery: string;
};

// ─────────────────────────────── Catalog ────────────────────────────────────
export const DESTINATIONS: Destination[] = [
  {
    id: 'lisbonne',
    name: 'Lisbonne',
    country: 'Portugal',
    emoji: '🇵🇹',
    gradient: 'linear-gradient(145deg, #f97316 0%, #dc2626 55%, #7f1d1d 100%)',
    accentColor: '#f97316',
    description: 'Tramways dorés, azulejos et pastéis de nata face à l\'Atlantique.',
    avgDays: 4,
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japon',
    emoji: '🇯🇵',
    gradient: 'linear-gradient(145deg, #f9a8d4 0%, #ec4899 35%, #1e1b4b 100%)',
    accentColor: '#ec4899',
    description: 'Néons frénétiques, temples silencieux, ramen à minuit.',
    avgDays: 7,
  },
  {
    id: 'bali',
    name: 'Bali',
    country: 'Indonésie',
    emoji: '🇮🇩',
    gradient: 'linear-gradient(145deg, #34d399 0%, #059669 50%, #064e3b 100%)',
    accentColor: '#34d399',
    description: 'Rizières en terrasses, temples balinais et surf au crépuscule.',
    avgDays: 8,
  },
  {
    id: 'newyork',
    name: 'New York',
    country: 'États-Unis',
    emoji: '🇺🇸',
    gradient: 'linear-gradient(145deg, #93c5fd 0%, #3b82f6 40%, #1e3a5f 100%)',
    accentColor: '#3b82f6',
    description: 'Skyline légendaire, Central Park, bagels au lever du soleil.',
    avgDays: 5,
  },
  {
    id: 'marrakech',
    name: 'Marrakech',
    country: 'Maroc',
    emoji: '🇲🇦',
    gradient: 'linear-gradient(145deg, #fbbf24 0%, #d97706 45%, #78350f 100%)',
    accentColor: '#fbbf24',
    description: 'Souks labyrinthiques, palais ocre et thé à la menthe.',
    avgDays: 4,
  },
  {
    id: 'santorini',
    name: 'Santorin',
    country: 'Grèce',
    emoji: '🇬🇷',
    gradient: 'linear-gradient(145deg, #7dd3fc 0%, #0ea5e9 45%, #0c4a6e 100%)',
    accentColor: '#7dd3fc',
    description: 'Coupoles bleues sur falaises blanches, Égée turquoise.',
    avgDays: 5,
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japon',
    emoji: '🇯🇵',
    gradient: 'linear-gradient(145deg, #c084fc 0%, #a855f7 40%, #3b0764 100%)',
    accentColor: '#c084fc',
    description: 'Geishas à Gion, bambouseraies et cerisiers en fleurs.',
    avgDays: 5,
  },
  {
    id: 'buenosaires',
    name: 'Buenos Aires',
    country: 'Argentine',
    emoji: '🇦🇷',
    gradient: 'linear-gradient(145deg, #fde68a 0%, #f59e0b 30%, #1d4ed8 100%)',
    accentColor: '#f59e0b',
    description: 'Tango dans les ruelles, steaks légendaires, architecture Art Déco.',
    avgDays: 6,
  },
];

export const COST_PER_DAY = 200; // €/day estimate

// ─────────────────────────────── Store ──────────────────────────────────────
const initialState: TripState = {
  destinations: DESTINATIONS,
  itinerary: [],
  budget: 3000,
  searchQuery: '',
};

export const tripStore = writable<TripState>(initialState);

// ─────────────────────────── Derived stores ──────────────────────────────────
export const totalDays = derived(
  tripStore,
  ($t) => $t.itinerary.reduce((sum, i) => sum + i.days, 0),
);

export const estimatedCost = derived(
  tripStore,
  ($t) => $t.itinerary.reduce((sum, i) => sum + i.days * COST_PER_DAY, 0),
);

export const filteredDestinations = derived(tripStore, ($t) => {
  const q = $t.searchQuery.toLowerCase().trim();
  if (!q) return $t.destinations;
  return $t.destinations.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q),
  );
});

// ─────────────────────────────── Actions ─────────────────────────────────────
export function addToTrip(destinationId: string, days: number) {
  tripStore.update((s) => {
    if (s.itinerary.some((i) => i.destinationId === destinationId)) return s;
    return { ...s, itinerary: [...s.itinerary, { destinationId, days, activities: [] }] };
  });
}

export function removeFromTrip(destinationId: string) {
  tripStore.update((s) => ({
    ...s,
    itinerary: s.itinerary.filter((i) => i.destinationId !== destinationId),
  }));
}

export function addActivity(destinationId: string, activity: string) {
  tripStore.update((s) => ({
    ...s,
    itinerary: s.itinerary.map((i) =>
      i.destinationId === destinationId
        ? { ...i, activities: [...i.activities, activity] }
        : i,
    ),
  }));
}

export function setBudget(amount: number) {
  tripStore.update((s) => ({ ...s, budget: amount }));
}

export function setSearchQuery(q: string) {
  tripStore.update((s) => ({ ...s, searchQuery: q }));
}

export function clearTrip() {
  tripStore.update((s) => ({ ...s, itinerary: [] }));
}
