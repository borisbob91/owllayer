import { writable, derived, get } from 'svelte/store';

export type Locale = 'en' | 'fr';

const initialLocale: Locale = (() => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('owllayer_svelte_lang');
    if (saved === 'en' || saved === 'fr') return saved;
  }
  const envLang = import.meta.env.VITE_APP_LANGUAGE;
  if (envLang === 'fr' || envLang === 'en') return envLang;
  return 'en';
})();

export const currentLocale = writable<Locale>(initialLocale);

export function setLocale(newLocale: Locale) {
  currentLocale.set(newLocale);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('owllayer_svelte_lang', newLocale);
  }
}

export function toggleLocale() {
  const current = get(currentLocale);
  setLocale(current === 'en' ? 'fr' : 'en');
}

export const translations = {
  en: {
    common: {
      appName: 'OwlLayer Travel',
      tagline: 'AI-Powered Trip Planner',
      currency: 'USD',
      currencySymbol: '$',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      close: 'Close',
      send: 'Send',
      days: 'days',
      day: 'day',
      night: 'night',
      perNight: '/ night',
      totalCost: 'Total Cost',
      estimated: 'est.',
      reviews: 'reviews',
      verifiedReviews: 'verified reviews',
      rating: 'Rating',
      category: 'Category',
      location: 'Location',
      about: 'About',
      amenitiesAndServices: 'Amenities & Services',
      nearby: 'Nearby Attractions',
      all: 'All',
      allTypes: 'All types',
      hotels: 'Hotels',
      hotel: 'Hotel',
      apartments: 'Apartments',
      apartment: 'Apartment',
      backToOffers: 'Back to accommodations',
      viewDetails: 'View Details',
      addToCompare: 'Compare',
      inCompare: 'In Comparison',
      compared: 'Compared',
      compareAction: 'Compare',
      maxCompareHint: '3 offers max in comparison',
      emptyCompareTitle: 'No accommodations selected for comparison',
      emptyCompareDesc: 'Select up to 3 hotels or apartments to view a side-by-side comparison.',
      clearCompareBtn: 'Clear Comparison',
      bookOfferBtn: 'Book this accommodation',
    },
    countries: {
      'France': 'France',
      "Côte d'Ivoire": 'Ivory Coast',
      'Ivory Coast': 'Ivory Coast',
      'Portugal': 'Portugal',
      'Japan': 'Japan',
      'Japon': 'Japan',
      'Indonesia': 'Indonesia',
      'Indonésie': 'Indonesia',
      'United States': 'United States',
      'États-Unis': 'United States',
      'Morocco': 'Morocco',
      'Maroc': 'Morocco',
      'Greece': 'Greece',
      'Grèce': 'Greece',
      'Argentina': 'Argentina',
      'Argentine': 'Argentina',
    } as Record<string, string>,
    cities: {
      'Paris': 'Paris',
      'Lyon': 'Lyon',
      'Nice': 'Nice',
      'Marseille': 'Marseille',
      'Abidjan': 'Abidjan',
      'Grand-Bassam': 'Grand-Bassam',
      'Yamoussoukro': 'Yamoussoukro',
      'Lisbonne': 'Lisbon',
      'Lisbon': 'Lisbon',
      'Tokyo': 'Tokyo',
      'Bali': 'Bali',
      'New York': 'New York',
      'Marrakech': 'Marrakech',
      'Santorin': 'Santorini',
      'Santorini': 'Santorini',
      'Kyoto': 'Kyoto',
      'Buenos Aires': 'Buenos Aires',
    } as Record<string, string>,
    nav: {
      destinations: 'Destinations',
      offers: 'Accommodations',
      compare: 'Compare',
      details: 'Details',
      itinerary: 'My Trip',
      budget: 'Budget',
      routesDescription: "Navigate between app pages: 'destinations' (destinations & itinerary), 'offres' (hotel & apartment deals), 'details' (accommodation details, requires offerId), 'comparer' (side-by-side comparison).",
    },
    destinations: {
      title: 'Explore Destinations',
      subtitle: 'Select dream locations or ask the AI agent to plan your custom route.',
      searchPlaceholder: 'Search a destination, country, vibe...',
      addToTripBtn: 'Add to Trip',
      inTripBadge: 'In Trip',
      avgDuration: 'Suggested: {days} days',
      costEst: '~{cost} est.',
    },
    itinerary: {
      title: 'Your Itinerary',
      emptyTitle: 'No destinations yet',
      emptyDesc: 'Search or ask your assistant to add cities and activities.',
      removeBtn: 'Remove',
      addActivityPlaceholder: 'Add an activity (e.g. Visit Louvre)...',
      addActivityBtn: 'Add',
      bookTripBtn: 'Book Trip Now',
      bookingSuccess: 'Trip successfully booked! Confirmation sent.',
    },
    budget: {
      title: 'Trip Budget',
      totalBudget: 'Total Budget',
      spent: 'Estimated Cost',
      remaining: 'Remaining',
      overBudget: 'Over budget by {amount}',
      setBudgetPrompt: 'Edit budget',
    },
    offers: {
      title: 'Accommodations & Deals',
      subtitle: 'Verified hotels and luxury apartments in France and Ivory Coast.',
      availableOffers: '{count} offers available · France & Ivory Coast',
      filterCountry: 'Country',
      filterType: 'Type',
      filterAll: 'All',
      filterFrance: 'France 🇫🇷',
      filterCI: 'Ivory Coast 🇨🇮',
      filterHotel: '🏨 Hotels',
      filterApartment: '🏠 Apartments',
      addToCompare: 'Compare',
      inCompare: 'In comparison',
      viewDetails: 'View Details',
    },
    agent: {
      welcomeMsg: 'Hello! I am your OwlLayer Travel AI assistant. Try saying: "Plan a 2-week trip to Asia", "Add Tokyo for 7 days", or "What is my remaining budget?".',
      inputPlaceholder: 'Type your message...',
      roleDescription: 'You are the OwlLayer Travel trip planning assistant — helping users discover destinations, organize itineraries, manage budgets, and book accommodations.',
      searchDestDesc: 'Search travel destinations from the catalog by keyword, vibe, or country.',
      addToTripDesc: 'Add a destination to the user trip itinerary with duration in days.',
      addActivityDesc: 'Add an activity to a planned destination in the itinerary.',
      setBudgetDesc: 'Set total trip budget in dollars/euros.',
      removeDestDesc: 'Remove a destination from the user itinerary.',
      bookTripDesc: 'Finalize and book the complete trip itinerary (irreversible action requiring user approval).',
      navDesc: 'Navigate between app pages (destinations, offres, details, comparer).',
      approvalBookTitle: 'Trip Booking Confirmation',
      approvalBookDesc: 'Are you sure you want to book this trip and confirm all reservations?',
      voiceHint: 'Voice & text active. Click the microphone or speak.',
    },
    destItems: {
      lisbonne: { name: 'Lisbon', country: 'Portugal', description: 'Golden trams, azulejos tiles, and fresh pastéis de nata facing the Atlantic.' },
      tokyo: { name: 'Tokyo', country: 'Japan', description: 'Neon skylines, ancient serene shrines, and midnight ramen bars.' },
      bali: { name: 'Bali', country: 'Indonesia', description: 'Terraced rice fields, sacred water temples, and sunset surf breaks.' },
      newyork: { name: 'New York', country: 'United States', description: 'Iconic skyscrapers, Broadway shows, and Central Park strolls.' },
      marrakech: { name: 'Marrakech', country: 'Morocco', description: 'Vibrant souks, peaceful riads, and the aromas of spice markets.' },
      santorini: { name: 'Santorini', country: 'Greece', description: 'Blue-domed whitewashed villages over the turquoise Aegean sea.' },
      kyoto: { name: 'Kyoto', country: 'Japan', description: 'Bamboo groves, golden pavilions, and traditional tea ceremonies.' },
      buenosaires: { name: 'Buenos Aires', country: 'Argentina', description: 'Tango in historic alleys, world-class steaks, and Art Deco charm.' },
      abidjan: { name: 'Abidjan', country: 'Ivory Coast', description: 'The pearl of West African lagoons, vibrant nightlife, and rich culture.' },
      rome: { name: 'Rome', country: 'Italy', description: 'Timeless Colosseum, baroque piazzas, and authentic trattorias.' },
    } as Record<string, { name: string; country: string; description: string }>,
    offerItems: {
      'paris-lutetia': {
        name: 'Hotel Lutetia',
        city: 'Paris',
        country: 'France',
        description: 'Legendary palace of Saint-Germain-des-Prés, reopened after a major renovation. Sublime Art Deco, exceptional spa, and white-glove service.',
      },
      'paris-montmartre': {
        name: 'Vintage Montmartre Apartment',
        city: 'Paris',
        country: 'France',
        description: 'Charming 2-room Haussmannian apartment with direct views of the Sacré-Cœur. Vintage hardwood, period moldings, fully equipped kitchen.',
      },
      'paris-marais': {
        name: 'Le Marais Design Loft',
        city: 'Paris',
        country: 'France',
        description: 'Industrial-chic loft in the heart of Le Marais. High ceilings, designer furniture, direct access to art galleries and trendy boutiques.',
      },
      'lyon-artistes': {
        name: 'Artists Hotel',
        city: 'Lyon',
        country: 'France',
        description: "In the heart of Lyon's Presqu'île, between the Rhône and Saône rivers. Contemporary bouchon-inspired decor, gourmet restaurant.",
      },
      'lyon-presquile': {
        name: "Appart'City Presqu'île",
        city: 'Lyon',
        country: 'France',
        description: 'Modern downtown studio in central Lyon, ideal for business or leisure. Everything within walking distance.',
      },
      'nice-negresco': {
        name: 'Hotel Negresco',
        city: 'Nice',
        country: 'France',
        description: 'The emblem of the French Riviera since 1913. Unique private art collection, panoramic views of the Mediterranean, legendary service.',
      },
      'nice-promenade': {
        name: 'Sea View Promenade Studio',
        city: 'Nice',
        country: 'France',
        description: 'Renovated beachfront studio steps from the Promenade des Anglais. Breathtaking views of the Baie des Anges from the balcony.',
      },
      'marseille-vieux-port': {
        name: 'Old Port Hotel',
        city: 'Marseille',
        country: 'France',
        description: 'Direct view of the Old Port and Notre-Dame-de-la-Garde. Rooftop terrace with bar, rooftop breakfasts.',
      },
      'abidjan-sofitel': {
        name: 'Sofitel Abidjan Hotel Ivoire',
        city: 'Abidjan',
        country: 'Ivory Coast',
        description: 'Architectural icon overlooking the Ébrié lagoon since 1963. Olympic pool, casino, cinema, restaurants — a city within the city.',
      },
      'abidjan-plateau': {
        name: 'Plateau Executive Residence',
        city: 'Abidjan',
        country: 'Ivory Coast',
        description: 'High-end apartment in the Plateau central business district. Panoramic views of the lagoon and skyline.',
      },
      'abidjan-cocody': {
        name: 'Cocody Garden Villa',
        city: 'Abidjan',
        country: 'Ivory Coast',
        description: "Contemporary villa with private tropical garden in Cocody, Abidjan's premier residential district. Pool, barbecue.",
      },
      'abidjan-deux-plateaux': {
        name: 'Les 2 Plateaux Studio',
        city: 'Abidjan',
        country: 'Ivory Coast',
        description: 'Furnished studio in the vibrant 2 Plateaux neighborhood, close to restaurants and shops. Ideal for short or extended stays.',
      },
      'grand-bassam': {
        name: 'Grand-Bassam Beach Villa',
        city: 'Grand-Bassam',
        country: 'Ivory Coast',
        description: 'Facing the Atlantic in the UNESCO-listed former colonial capital. Pristine white sand beach, authentic Ivorian cuisine.',
      },
      'yamoussoukro-president': {
        name: 'President Hotel Yamoussoukro',
        city: 'Yamoussoukro',
        country: 'Ivory Coast',
        description: 'Hotel in the political capital, steps from the Basilica of Our Lady of Peace. Majestic architecture, lush tropical gardens.',
      },
    } as Record<string, { name: string; city: string; country: string; description: string }>,
  },

  fr: {
    common: {
      appName: 'OwlLayer Travel',
      tagline: 'Planificateur de voyage IA',
      currency: 'EUR',
      currencySymbol: '€',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      delete: 'Supprimer',
      close: 'Fermer',
      send: 'Envoyer',
      days: 'jours',
      day: 'jour',
      night: 'nuit',
      perNight: '/ nuit',
      totalCost: 'Coût total',
      estimated: 'est.',
      reviews: 'avis',
      verifiedReviews: 'avis vérifiés',
      rating: 'Note',
      category: 'Catégorie',
      location: 'Localisation',
      about: 'À propos',
      amenitiesAndServices: 'Équipements & services',
      nearby: 'À proximité',
      all: 'Tous',
      allTypes: 'Tous types',
      hotels: 'Hôtels',
      hotel: 'Hôtel',
      apartments: 'Appartements',
      apartment: 'Appartement',
      backToOffers: 'Retour aux offres',
      viewDetails: 'Voir la fiche',
      addToCompare: 'Comparer',
      inCompare: 'Dans le comparateur',
      compared: 'Comparé',
      compareAction: 'Comparer',
      maxCompareHint: '3 offres max en comparaison',
      emptyCompareTitle: 'Aucune offre sélectionnée pour la comparaison',
      emptyCompareDesc: 'Sélectionnez jusqu\'à 3 hôtels ou appartements pour afficher un comparatif côte-à-côte.',
      clearCompareBtn: 'Vider le comparateur',
      bookOfferBtn: 'Réserver cet hébergement',
    },
    countries: {
      'France': 'France',
      "Côte d'Ivoire": "Côte d'Ivoire",
      'Ivory Coast': "Côte d'Ivoire",
      'Portugal': 'Portugal',
      'Japan': 'Japon',
      'Japon': 'Japon',
      'Indonesia': 'Indonésie',
      'Indonésie': 'Indonésie',
      'United States': 'États-Unis',
      'États-Unis': 'États-Unis',
      'Morocco': 'Maroc',
      'Maroc': 'Maroc',
      'Greece': 'Grèce',
      'Grèce': 'Grèce',
      'Argentina': 'Argentine',
      'Argentine': 'Argentine',
    } as Record<string, string>,
    cities: {
      'Paris': 'Paris',
      'Lyon': 'Lyon',
      'Nice': 'Nice',
      'Marseille': 'Marseille',
      'Abidjan': 'Abidjan',
      'Grand-Bassam': 'Grand-Bassam',
      'Yamoussoukro': 'Yamoussoukro',
      'Lisbonne': 'Lisbonne',
      'Lisbon': 'Lisbonne',
      'Tokyo': 'Tokyo',
      'Bali': 'Bali',
      'New York': 'New York',
      'Marrakech': 'Marrakech',
      'Santorin': 'Santorin',
      'Santorini': 'Santorin',
      'Kyoto': 'Kyoto',
      'Buenos Aires': 'Buenos Aires',
    } as Record<string, string>,
    nav: {
      destinations: 'Destinations',
      offers: 'Hébergements',
      compare: 'Comparer',
      details: 'Détails',
      itinerary: 'Mon Voyage',
      budget: 'Budget',
      routesDescription: "Naviguer entre les pages : 'destinations' (destinations et itinéraire), 'offres' (catalogue hébergements), 'details' (fiche hébergement avec offerId), 'comparer' (comparateur côte-à-côte).",
    },
    destinations: {
      title: 'Explorer les destinations',
      subtitle: 'Sélectionnez vos étapes de rêve ou demandez à l\'IA de concevoir votre itinéraire sur mesure.',
      searchPlaceholder: 'Rechercher une destination, un pays, une ambiance...',
      addToTripBtn: 'Ajouter au voyage',
      inTripBadge: 'Dans le voyage',
      avgDuration: 'Conseillé : {days} jours',
      costEst: '~{cost} est.',
    },
    itinerary: {
      title: 'Votre Itinéraire',
      emptyTitle: 'Aucune destination pour l\'instant',
      emptyDesc: 'Recherchez ou demandez à l\'assistant d\'ajouter des villes et des activités.',
      removeBtn: 'Retirer',
      addActivityPlaceholder: 'Ajouter une activité (ex : Visiter le Louvre)...',
      addActivityBtn: 'Ajouter',
      bookTripBtn: 'Réserver le voyage',
      bookingSuccess: 'Voyage réservé avec succès ! Confirmation envoyée.',
    },
    budget: {
      title: 'Budget Voyage',
      totalBudget: 'Budget Total',
      spent: 'Coût Estimé',
      remaining: 'Reste disponible',
      overBudget: 'Dépassement de {amount}',
      setBudgetPrompt: 'Modifier le budget',
    },
    offers: {
      title: 'Hébergements & Offres',
      subtitle: 'Hôtels vérifiés et appartements d\'exception en France et en Côte d\'Ivoire.',
      availableOffers: '{count} offres disponibles · France & Côte d\'Ivoire',
      filterCountry: 'Pays',
      filterType: 'Type',
      filterAll: 'Tous',
      filterFrance: '🇫🇷 France',
      filterCI: '🇨🇮 Côte d\'Ivoire',
      filterHotel: '🏨 Hôtels',
      filterApartment: '🏠 Appartements',
      addToCompare: 'Comparer',
      inCompare: 'Dans le comparateur',
      viewDetails: 'Voir la fiche',
    },
    agent: {
      welcomeMsg: 'Bonjour ! Je planifie votre voyage idéal. Essayez : "Planifie un voyage en Asie de 2 semaines", "Ajoute Tokyo pour 7 jours", ou "Quel est mon budget restant ?".',
      inputPlaceholder: 'Tapez votre message…',
      roleDescription: 'Tu es l\'assistant de planification de voyage OwlLayer Travel — aide à trouver des destinations, planifier un itinéraire, gérer le budget et réserver des hébergements.',
      searchDestDesc: 'Rechercher des destinations de voyage dans le catalogue par mot-clé, pays ou ambiance.',
      addToTripDesc: 'Ajouter une destination au voyage avec une durée en jours.',
      addActivityDesc: 'Ajouter une activité à une destination prévue dans le voyage.',
      setBudgetDesc: 'Définir le budget total du voyage en euros/dollars.',
      removeDestDesc: 'Retirer une destination de l\'itinéraire.',
      bookTripDesc: 'Finaliser et réserver le voyage complet (action irréversible avec confirmation requise).',
      navDesc: 'Naviguer vers une page de l\'application (destinations, offres, details, comparer).',
      approvalBookTitle: 'Confirmation de réservation',
      approvalBookDesc: 'Êtes-vous sûr de vouloir finaliser et réserver ce voyage complet ?',
      voiceHint: 'Mode vocal & texte actif. Cliquez sur le micro ou parlez.',
    },
    destItems: {
      lisbonne: { name: 'Lisbonne', country: 'Portugal', description: 'Tramways dorés, azulejos et pastéis de nata face à l\'Atlantique.' },
      tokyo: { name: 'Tokyo', country: 'Japon', description: 'Néons frénétiques, temples silencieux, ramen à minuit.' },
      bali: { name: 'Bali', country: 'Indonésie', description: 'Rizières en terrasses, temples balinais et surf au crépuscule.' },
      newyork: { name: 'New York', country: 'États-Unis', description: 'Gratte-ciel vertigineux, lumières de Broadway et Central Park.' },
      marrakech: { name: 'Marrakech', country: 'Maroc', description: 'Souks vibrants, riads secrets et senteurs d\'épices.' },
      santorini: { name: 'Santorin', country: 'Grèce', description: 'Coupoles bleues sur falaises blanches, Égée turquoise.' },
      kyoto: { name: 'Kyoto', country: 'Japon', description: 'Forêts de bambous, pavillons dorés et cérémonies du thé.' },
      buenosaires: { name: 'Buenos Aires', country: 'Argentine', description: 'Tango dans les ruelles, steaks légendaires, architecture Art Déco.' },
      abidjan: { name: 'Abidjan', country: 'Côte d\'Ivoire', description: 'Perle des lagunes ouest-africaines, nightlife trépidante et culture riche.' },
      rome: { name: 'Rome', country: 'Italie', description: 'Colisée millénaire, ruelles baroques et trattorias parfumées.' },
    } as Record<string, { name: string; country: string; description: string }>,
    offerItems: {
      'paris-lutetia': {
        name: 'Hôtel Lutetia',
        city: 'Paris',
        country: 'France',
        description: 'Palace mythique de Saint-Germain-des-Prés, rouvert après une rénovation majeure. Art déco sublime, spa exceptionnel et service blanc gants.',
      },
      'paris-montmartre': {
        name: 'Appartement Montmartre Vintage',
        city: 'Paris',
        country: 'France',
        description: 'Charmant 2 pièces haussmannien avec vue directe sur le Sacré-Cœur. Parquet ancien, moulures d\'époque, cuisine entièrement équipée.',
      },
      'paris-marais': {
        name: 'Loft Le Marais Design',
        city: 'Paris',
        country: 'France',
        description: 'Loft industriel-chic en plein cœur du Marais. Hauteur sous plafond, mobilier de créateur, accès direct aux galeries et boutiques tendance.',
      },
      'lyon-artistes': {
        name: 'Hôtel des Artistes',
        city: 'Lyon',
        country: 'France',
        description: 'Au cœur de la Presqu\'île lyonnaise, entre Rhône et Saône. Décor contemporain inspiré des bouchons, restaurant gastronomique.',
      },
      'lyon-presquile': {
        name: "Appart'City Presqu'île",
        city: 'Lyon',
        country: 'France',
        description: 'Studio moderne en plein centre de Lyon, idéal pour un séjour professionnel ou touristique. Tout à pied.',
      },
      'nice-negresco': {
        name: 'Hôtel Negresco',
        city: 'Nice',
        country: 'France',
        description: "L'emblème de la Côte d'Azur depuis 1913. Collection d'art privée unique, vue panoramique sur la Méditerranée, service de légende.",
      },
      'nice-promenade': {
        name: 'Studio Vue Mer Promenade',
        city: 'Nice',
        country: 'France',
        description: 'Studio rénové face à la mer, à deux pas de la Promenade des Anglais. Vue imprenable sur la Baie des Anges depuis le balcon.',
      },
      'marseille-vieux-port': {
        name: 'Hôtel du Vieux-Port',
        city: 'Marseille',
        country: 'France',
        description: 'Vue directe sur le Vieux-Port et Notre-Dame-de-la-Garde. Terrasse rooftop avec bar, petits-déjeuners sur le toit.',
      },
      'abidjan-sofitel': {
        name: 'Sofitel Abidjan Hôtel Ivoire',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        description: 'Icône architecturale dominant la lagune Ébrié depuis 1963. Piscine olympique, casino, cinéma, restaurants — une ville dans la ville.',
      },
      'abidjan-plateau': {
        name: 'Résidence Plateau Executive',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        description: "Appartement de standing au cœur du quartier des affaires du Plateau. Vue panoramique sur la lagune et les gratte-ciels.",
      },
      'abidjan-cocody': {
        name: 'Villa Cocody Garden',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        description: "Villa contemporaine avec jardin tropical privé à Cocody, quartier résidentiel huppé d'Abidjan. Piscine, barbecue.",
      },
      'abidjan-deux-plateaux': {
        name: 'Studio Les 2 Plateaux',
        city: 'Abidjan',
        country: "Côte d'Ivoire",
        description: "Studio meublé dans le quartier dynamique des 2 Plateaux, proche restaurants et commerces. Idéal pour un séjour court ou long.",
      },
      'grand-bassam': {
        name: 'Villa Balnéaire Grand-Bassam',
        city: 'Grand-Bassam',
        country: "Côte d'Ivoire",
        description: "Face à l'Atlantique dans l'ancienne capitale coloniale classée UNESCO. Plage de sable blanc immaculée, cuisine ivoirienne authentique.",
      },
      'yamoussoukro-president': {
        name: 'Hôtel Président Yamoussoukro',
        city: 'Yamoussoukro',
        country: "Côte d'Ivoire",
        description: "Hôtel de la capitale politique, à deux pas de la Basilique Notre-Dame de la Paix. Architecture majestueuse, jardins tropicaux somptueux.",
      },
    } as Record<string, { name: string; city: string; country: string; description: string }>,
  },
};

export const t = derived(currentLocale, ($locale) => translations[$locale]);

export function format(template: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return template;
  let res = template;
  for (const [key, value] of Object.entries(params)) {
    res = res.replace(new RegExp(`\\{${key}\\}`, 'g'), value !== undefined ? String(value) : '');
  }
  return res;
}

export function formatCurrency(amount: number, locale?: Locale): string {
  const loc = locale ?? get(currentLocale);
  if (loc === 'fr') {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function getCountryName(country: string): string {
  const loc = get(currentLocale);
  return translations[loc].countries[country] ?? country;
}

export function getCityName(city: string): string {
  const loc = get(currentLocale);
  return translations[loc].cities[city] ?? city;
}

export function getDestinationName(id: string, fallbackName: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].destItems as any)?.[id];
  return item?.name ?? fallbackName;
}

export function getDestinationCountry(id: string, fallbackCountry: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].destItems as any)?.[id];
  return item?.country ?? getCountryName(fallbackCountry);
}

export function getDestinationDesc(id: string, fallbackDesc: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].destItems as any)?.[id];
  return item?.description ?? fallbackDesc;
}

export function getOfferName(id: string, fallbackName: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].offerItems as any)?.[id];
  return item?.name ?? fallbackName;
}

export function getOfferCity(id: string, fallbackCity: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].offerItems as any)?.[id];
  return item?.city ?? getCityName(fallbackCity);
}

export function getOfferCountry(id: string, fallbackCountry: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].offerItems as any)?.[id];
  return item?.country ?? getCountryName(fallbackCountry);
}

export function getOfferDesc(id: string, fallbackDesc: string): string {
  const loc = get(currentLocale);
  const item = (translations[loc].offerItems as any)?.[id];
  return item?.description ?? fallbackDesc;
}
