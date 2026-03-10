import { writable, derived } from 'svelte/store';

export type OfferType      = 'hotel' | 'appartement';
export type CountryFilter  = 'all' | 'france' | 'cote-divoire';

export type Offer = {
  id:            string;
  name:          string;
  type:          OfferType;
  city:          string;
  country:       'France' | "Côte d'Ivoire";
  countryEmoji:  string;
  stars:         number;
  pricePerNight: number;
  description:   string;
  amenities:     string[];
  gradient:      string;
  accentColor:   string;
  rating:        number;
  reviewCount:   number;
  nearby:        string[];
};

export const OFFERS: Offer[] = [

  // ── France ─────────────────────────────────────────────────────────────────

  {
    id: 'paris-lutetia',
    name: 'Hôtel Lutetia',
    type: 'hotel',
    city: 'Paris',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 5,
    pricePerNight: 450,
    description: 'Palace mythique de Saint-Germain-des-Prés, rouvert après une rénovation majeure. Art déco sublime, spa exceptionnel et service blanc gants.',
    amenities: ['Spa & Wellness', 'Piscine intérieure', 'Restaurant gastronomique', 'Bar iconique', 'Concierge 24h', 'Salle de fitness', 'Wi-Fi Premium', 'Service de voiturier'],
    gradient: 'linear-gradient(135deg, #c9a96e 0%, #8b6914 45%, #3d2c0a 100%)',
    accentColor: '#c9a96e',
    rating: 4.9,
    reviewCount: 1842,
    nearby: ['Musée du Louvre', 'Tour Eiffel', 'Jardin du Luxembourg', 'Saint-Germain-des-Prés'],
  },

  {
    id: 'paris-montmartre',
    name: 'Appartement Montmartre Vintage',
    type: 'appartement',
    city: 'Paris',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 4,
    pricePerNight: 120,
    description: 'Charmant 2 pièces haussmannien avec vue directe sur le Sacré-Cœur. Parquet ancien, moulures d\'époque, cuisine entièrement équipée.',
    amenities: ['Cuisine équipée', 'Vue Sacré-Cœur', 'Wi-Fi', 'Machine à café Nespresso', 'Netflix', 'Lave-linge'],
    gradient: 'linear-gradient(135deg, #ec4899 0%, #9333ea 50%, #1e1b4b 100%)',
    accentColor: '#ec4899',
    rating: 4.7,
    reviewCount: 394,
    nearby: ['Sacré-Cœur', 'Place du Tertre', 'Moulin Rouge', 'Marché Saint-Pierre'],
  },

  {
    id: 'paris-marais',
    name: 'Loft Le Marais Design',
    type: 'appartement',
    city: 'Paris',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 4,
    pricePerNight: 180,
    description: 'Loft industriel-chic en plein cœur du Marais. Hauteur sous plafond, mobilier de créateur, accès direct aux galeries et boutiques tendance.',
    amenities: ['Wi-Fi Fibre', 'Cuisine ouverte', 'Terrasse privée', 'Smart TV', 'Lave-linge', 'Climatisation'],
    gradient: 'linear-gradient(135deg, #f97316 0%, #b45309 50%, #1c0a00 100%)',
    accentColor: '#f97316',
    rating: 4.8,
    reviewCount: 267,
    nearby: ['Centre Pompidou', 'Place des Vosges', 'Musée Picasso', 'Galerie Thaddaeus Ropac'],
  },

  {
    id: 'lyon-artistes',
    name: 'Hôtel des Artistes',
    type: 'hotel',
    city: 'Lyon',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 4,
    pricePerNight: 195,
    description: 'Au cœur de la Presqu\'île lyonnaise, entre Rhône et Saône. Décor contemporain inspiré des bouchons, restaurant gastronomique.',
    amenities: ['Restaurant bouchon', 'Bar à vins', 'Concierge', 'Wi-Fi', 'Parking sous-sol', 'Salle de réunion'],
    gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 50%, #450a0a 100%)',
    accentColor: '#ef4444',
    rating: 4.6,
    reviewCount: 721,
    nearby: ['Vieux-Lyon', 'Musée des Beaux-Arts', 'Place Bellecour', 'Halles Paul Bocuse'],
  },

  {
    id: 'lyon-presquile',
    name: "Appart'City Presqu'île",
    type: 'appartement',
    city: 'Lyon',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 3,
    pricePerNight: 85,
    description: 'Studio moderne en plein centre de Lyon, idéal pour un séjour professionnel ou touristique. Tout à pied.',
    amenities: ['Cuisine', 'Wi-Fi', 'Réception 24h', 'Parking payant', 'Laverie', 'Local vélos'],
    gradient: 'linear-gradient(135deg, #22d3ee 0%, #0284c7 50%, #0c1a2e 100%)',
    accentColor: '#22d3ee',
    rating: 4.2,
    reviewCount: 512,
    nearby: ["Opéra de Lyon", 'Place des Terreaux', 'Musée des Confluences', "Parc de la Tête d'Or"],
  },

  {
    id: 'nice-negresco',
    name: 'Hôtel Negresco',
    type: 'hotel',
    city: 'Nice',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 5,
    pricePerNight: 580,
    description: "L'emblème de la Côte d'Azur depuis 1913. Collection d'art privée unique, vue panoramique sur la Méditerranée, service de légende.",
    amenities: ['Restaurant étoilé Chantecler', 'Brasserie La Rotonde', 'Salon d\'édition', 'Spa Hôtel Negresco', 'Plage privée', 'Concierge', 'Voiturier'],
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 40%, #1d4ed8 100%)',
    accentColor: '#06b6d4',
    rating: 4.8,
    reviewCount: 2103,
    nearby: ['Promenade des Anglais', 'Vieux-Nice', 'Musée Matisse', 'Colline du Château'],
  },

  {
    id: 'nice-promenade',
    name: 'Studio Vue Mer Promenade',
    type: 'appartement',
    city: 'Nice',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 4,
    pricePerNight: 150,
    description: 'Studio rénové face à la mer, à deux pas de la Promenade des Anglais. Vue imprenable sur la Baie des Anges depuis le balcon.',
    amenities: ['Vue mer panoramique', 'Terrasse balcon', 'Climatisation réversible', 'Wi-Fi', 'Kitchenette', 'Parking en option'],
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 50%, #064e3b 100%)',
    accentColor: '#34d399',
    rating: 4.5,
    reviewCount: 278,
    nearby: ['Plage Publique', "Marché du Cours Saleya", 'Vieux-Nice', 'Promenade des Anglais'],
  },

  {
    id: 'marseille-vieux-port',
    name: 'Hôtel du Vieux-Port',
    type: 'hotel',
    city: 'Marseille',
    country: 'France',
    countryEmoji: '🇫🇷',
    stars: 4,
    pricePerNight: 220,
    description: 'Vue directe sur le Vieux-Port et Notre-Dame-de-la-Garde. Terrasse rooftop avec bar, petits-déjeuners sur le toit.',
    amenities: ['Rooftop bar', 'Terrasse vue port', 'Petit-déjeuner inclus', 'Wi-Fi', 'Parking', 'Navette port'],
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #1e1b4b 100%)',
    accentColor: '#a78bfa',
    rating: 4.4,
    reviewCount: 934,
    nearby: ['Vieux-Port', 'MuCEM', 'Notre-Dame-de-la-Garde', 'Calanques de Marseille'],
  },

  // ── Côte d'Ivoire ──────────────────────────────────────────────────────────

  {
    id: 'abidjan-sofitel',
    name: "Sofitel Abidjan Hôtel Ivoire",
    type: 'hotel',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    countryEmoji: '🇨🇮',
    stars: 5,
    pricePerNight: 280,
    description: "Icône architecturale dominant la lagune Ébrié depuis 1963. Piscine olympique, casino, cinéma, restaurants — une ville dans la ville.",
    amenities: ["Piscine olympique", 'Casino', 'Restaurant panoramique', 'Spa', "Centre d'affaires", 'Courts de tennis', 'Salle de sport', 'Marina'],
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #92400e 100%)',
    accentColor: '#f59e0b',
    rating: 4.7,
    reviewCount: 1567,
    nearby: ["Lagune Ébrié", 'Cathédrale Saint-Paul', 'Marché de Cocody', 'Musée des Civilisations'],
  },

  {
    id: 'abidjan-plateau',
    name: 'Résidence Plateau Executive',
    type: 'appartement',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    countryEmoji: '🇨🇮',
    stars: 4,
    pricePerNight: 95,
    description: "Appartement de standing au cœur du quartier des affaires du Plateau. Vue panoramique sur la lagune et les gratte-ciels.",
    amenities: ['Vue panoramique lagune', 'Climatisation', 'Cuisine équipée', 'Wi-Fi Fibre', 'Sécurité 24h', 'Parking souterrain'],
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 50%, #064e3b 100%)',
    accentColor: '#10b981',
    rating: 4.5,
    reviewCount: 342,
    nearby: ['Boulevard de la République', 'Palais de Justice', 'Immeuble Botreau-Roussel', 'Marché Plateau'],
  },

  {
    id: 'abidjan-cocody',
    name: 'Villa Cocody Garden',
    type: 'appartement',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    countryEmoji: '🇨🇮',
    stars: 4,
    pricePerNight: 110,
    description: "Villa contemporaine avec jardin tropical privé à Cocody, quartier résidentiel huppé d'Abidjan. Piscine, barbecue.",
    amenities: ['Piscine privée', 'Jardin tropical', 'Cuisine équipée', 'Wi-Fi', 'Gardien de nuit', 'Parking sécurisé', 'Barbecue'],
    gradient: 'linear-gradient(135deg, #84cc16 0%, #16a34a 50%, #14532d 100%)',
    accentColor: '#84cc16',
    rating: 4.6,
    reviewCount: 198,
    nearby: ['Université de Cocody', 'Marché de Cocody', 'Parc du Banco', 'Village de Bingerville'],
  },

  {
    id: 'abidjan-deux-plateaux',
    name: "Studio Les 2 Plateaux",
    type: 'appartement',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    countryEmoji: '🇨🇮',
    stars: 3,
    pricePerNight: 55,
    description: "Studio meublé dans le quartier dynamique des 2 Plateaux, proche restaurants et commerces. Idéal pour un séjour court ou long.",
    amenities: ['Wi-Fi', 'Climatisation', 'Cuisine équipée', 'Eau chaude', 'Sécurité', 'Proche transports'],
    gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 50%, #831843 100%)',
    accentColor: '#f472b6',
    rating: 4.1,
    reviewCount: 127,
    nearby: ['Carrefour Policlinique', 'Supermarché Hayat', 'Institut Français', 'Maquis locaux'],
  },

  {
    id: 'grand-bassam',
    name: 'Villa Balnéaire Grand-Bassam',
    type: 'hotel',
    city: 'Grand-Bassam',
    country: "Côte d'Ivoire",
    countryEmoji: '🇨🇮',
    stars: 3,
    pricePerNight: 60,
    description: "Face à l'Atlantique dans l'ancienne capitale coloniale classée UNESCO. Plage de sable blanc immaculée, cuisine ivoirienne authentique.",
    amenities: ['Plage privée', 'Restaurant ivoirien', 'Bar de plage', 'Wi-Fi', 'Pêche', 'Location de pirogues'],
    gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 40%, #881337 100%)',
    accentColor: '#fb7185',
    rating: 4.3,
    reviewCount: 456,
    nearby: ['Plage de Grand-Bassam', 'Quartier France colonial', 'Musée national du Costume', 'Musée du pays agni'],
  },

  {
    id: 'yamoussoukro-president',
    name: 'Hôtel Président Yamoussoukro',
    type: 'hotel',
    city: 'Yamoussoukro',
    country: "Côte d'Ivoire",
    countryEmoji: '🇨🇮',
    stars: 4,
    pricePerNight: 120,
    description: "Hôtel de la capitale politique, à deux pas de la Basilique Notre-Dame de la Paix. Architecture majestueuse, jardins tropicaux somptueux.",
    amenities: ['Piscine', 'Restaurant gastronomique', 'Salle de conférence', 'Wi-Fi', 'Navette basilique', 'Parking', 'Salon VIP'],
    gradient: 'linear-gradient(135deg, #e879f9 0%, #9333ea 50%, #3b0764 100%)',
    accentColor: '#e879f9',
    rating: 4.4,
    reviewCount: 623,
    nearby: ['Basilique Notre-Dame de la Paix', 'Lac aux crocodiles sacrés', 'Palais présidentiel', 'Fondation F. Houphouët-Boigny'],
  },
];

// ── Store ────────────────────────────────────────────────────────────────────

type OffersState = {
  filter:          CountryFilter;
  typeFilter:      'all' | OfferType;
  compareList:     string[];
  selectedOfferId: string | null;
};

export const offersStore = writable<OffersState>({
  filter:          'all',
  typeFilter:      'all',
  compareList:     [],
  selectedOfferId: null,
});

export const filteredOffers = derived(offersStore, ($s) =>
  OFFERS.filter((o) => {
    if ($s.filter === 'france'       && o.country !== 'France')          return false;
    if ($s.filter === 'cote-divoire' && o.country !== "Côte d'Ivoire")   return false;
    if ($s.typeFilter !== 'all'      && o.type !== $s.typeFilter)         return false;
    return true;
  })
);

export const compareOffers = derived(offersStore, ($s) =>
  $s.compareList.map((id) => OFFERS.find((o) => o.id === id)!).filter(Boolean)
);

export const selectedOffer = derived(offersStore, ($s) =>
  $s.selectedOfferId ? (OFFERS.find((o) => o.id === $s.selectedOfferId) ?? null) : null
);

// ── Actions ──────────────────────────────────────────────────────────────────

export function setCountryFilter(f: CountryFilter) {
  offersStore.update((s) => ({ ...s, filter: f }));
}

export function setTypeFilter(t: 'all' | OfferType) {
  offersStore.update((s) => ({ ...s, typeFilter: t }));
}

export function toggleCompare(id: string) {
  offersStore.update((s) => {
    const inList = s.compareList.includes(id);
    const list = inList
      ? s.compareList.filter((i) => i !== id)
      : s.compareList.length < 3
        ? [...s.compareList, id]
        : s.compareList;
    return { ...s, compareList: list };
  });
}

export function clearCompare() {
  offersStore.update((s) => ({ ...s, compareList: [] }));
}

export function selectOffer(id: string | null) {
  offersStore.update((s) => ({ ...s, selectedOfferId: id }));
}
