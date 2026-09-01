import { computed, Injectable, signal } from '@angular/core';

export type Locale = 'en' | 'fr';

export const translations = {
  en: {
    common: {
      appName: 'OwlLayer Marketplace',
      tagline: 'AI-Powered Classifieds & Listings',
      currency: 'EUR',
      currencySymbol: '€',
      reset: 'Reset',
      cancel: 'Cancel',
      confirm: 'Confirm',
      deny: 'Deny',
      save: 'Save Changes',
      delete: 'Delete',
      close: 'Close',
      send: 'Send',
      free: 'Free',
      items: 'listings',
      item: 'listing',
    },
    nav: {
      home: 'Listings',
      favorites: 'Favorites',
      create: 'Post an Ad',
      agentConnected: 'Agent Connected',
      agentDisconnected: 'Agent Offline',
      toggleLang: 'Français',
    },
    home: {
      title: 'Explore Classifieds',
      subtitle: 'Discover verified ads across vehicles, real estate, electronics, and home items with AI assistance.',
      searchPlaceholder: 'Search listings by keyword, description, seller...',
      resetFilters: 'Reset',
      filterAll: 'All',
      filterSport: 'Sports & Outdoors',
      filterHome: 'Home & Living',
      filterElectronics: 'Electronics',
      filterRealEstate: 'Real Estate',
      minPrice: 'Min Price',
      maxPrice: 'Max Price',
      allCategories: 'All Categories',
      noListingsFound: 'No listings found',
      tryAnotherSearch: 'Try adjusting your search criteria or price range.',
      viewAd: 'View Listing',
    },
    categories: {
      sport: 'Sports & Outdoors',
      maison: 'Home & Living',
      electronique: 'Electronics',
      immobilier: 'Real Estate',
      vehicules: 'Vehicles',
      divers: 'Miscellaneous',
    } as Record<string, string>,
    detail: {
      backToListings: '← Back to Listings',
      publishedOn: 'Published on',
      sellerContact: 'Contact Seller',
      description: 'Description',
      sellerInfo: 'Seller Information',
      sellerName: 'Name',
      phone: 'Phone',
      location: 'Location',
      category: 'Category',
      price: 'Price',
      addToFavorites: '☆ Add to Favorites',
      inFavorites: '⭐ In Favorites',
      editListing: 'Edit Ad',
      deleteListing: 'Delete Ad',
      deleteConfirm: 'Are you sure you want to delete this listing? This action requires approval.',
      notFound: 'Listing not found or has been removed.',
    },
    edit: {
      createTitle: 'Post a New Ad',
      editTitle: 'Edit Listing',
      titleLabel: 'Listing Title',
      titlePlaceholder: 'e.g. Vintage Restored Bicycle',
      descLabel: 'Full Description',
      descPlaceholder: 'Provide condition, dimensions, specifications...',
      priceLabel: 'Price (€)',
      categoryLabel: 'Category',
      locationLabel: 'City / Location',
      sellerLabel: 'Seller Name',
      phoneLabel: 'Phone Number',
      imageUrlLabel: 'Image URL',
      submitCreate: 'Publish Ad',
      submitEdit: 'Save Modifications',
      cancel: 'Cancel',
      deleteAd: 'Delete this listing',
    },
    favorites: {
      title: 'My Favorite Listings',
      subtitle: 'Your shortlisted ads saved across sessions.',
      emptyTitle: 'No favorites saved yet',
      emptySubtitle: 'Explore listings and click the star icon or ask the agent to add items here.',
      browseListings: 'Browse Listings',
      removeFromFavorites: 'Remove',
    },
    chat: {
      assistantName: 'OwlLayer Assistant',
      assistantSubtitle: 'Instant AI Response',
      online: 'Ready',
      offline: 'Agent Offline',
      connected: 'Agent Connected',
      listening: 'Listening…',
      thinking: 'Thinking…',
      speaking: 'Responding…',
      helloTitle: 'Hello!',
      helloMsg: 'I am your Marketplace AI Assistant. I can search ads, filter by price, save favorites, or help you post a new listing.',
      placeholder: 'Search a bike under 200€, filter by category...',
      voiceMode: 'Voice Mode',
    },
    hitl: {
      title: 'Action Approval Required',
      description: 'The AI agent is attempting to execute a sensitive operation:',
      toolName: 'Tool:',
      args: 'Parameters:',
      approve: 'Approve Action',
      deny: 'Deny Action',
    },
    tools: {
      searchDesc: 'Search marketplace listings by text query.',
      filterCatDesc: 'Filter marketplace listings by category.',
      setPriceRangeDesc: 'Set minimum and maximum price filter for listings.',
      addFavoriteDesc: 'Add a listing to user favorites by ID.',
      removeFavoriteDesc: 'Remove a listing from favorites by ID.',
      getDetailsDesc: 'Get full details of a listing by ID.',
      createListingDesc: 'Publish a new listing on the marketplace.',
      updateListingDesc: 'Update an existing listing. Requires approval.',
      deleteListingDesc: 'Delete a listing from the marketplace. Requires approval.',
      navigateDesc: 'Navigate to a page: home (/), favorites (/favorites), create (/create), or detail (/listing/:id).',
    },
  },
  fr: {
    common: {
      appName: 'Marketplace OwlLayer',
      tagline: 'Petites annonces avec agent IA',
      currency: 'EUR',
      currencySymbol: '€',
      reset: 'Réinitialiser',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      deny: 'Refuser',
      save: 'Enregistrer',
      delete: 'Supprimer',
      close: 'Fermer',
      send: 'Envoyer',
      free: 'Gratuit',
      items: 'annonces',
      item: 'annonce',
    },
    nav: {
      home: 'Annonces',
      favorites: 'Favoris',
      create: 'Déposer une annonce',
      agentConnected: 'Agent connecté',
      agentDisconnected: 'Agent hors ligne',
      toggleLang: 'English',
    },
    home: {
      title: 'Découvrez les Annonces',
      subtitle: 'Trouvez des annonces vérifiées en sport, immobilier, électronique et maison avec l\'aide de l\'IA.',
      searchPlaceholder: 'Rechercher par mot-clé, description, vendeur...',
      resetFilters: 'Réinitialiser',
      filterAll: 'Tous',
      filterSport: 'Sport & Loisirs',
      filterHome: 'Maison & Mobilier',
      filterElectronics: 'Électronique',
      filterRealEstate: 'Immobilier',
      minPrice: 'Prix min',
      maxPrice: 'Prix max',
      allCategories: 'Toutes catégories',
      noListingsFound: 'Aucune annonce trouvée',
      tryAnotherSearch: 'Essayez d\'ajuster vos critères de recherche ou votre budget.',
      viewAd: 'Voir l\'annonce',
    },
    categories: {
      sport: 'Sport & Loisirs',
      maison: 'Maison & Mobilier',
      electronique: 'Électronique',
      immobilier: 'Immobilier',
      vehicules: 'Véhicules',
      divers: 'Divers',
    } as Record<string, string>,
    detail: {
      backToListings: '← Retour aux annonces',
      publishedOn: 'Publié le',
      sellerContact: 'Contacter le vendeur',
      description: 'Description',
      sellerInfo: 'Informations vendeur',
      sellerName: 'Nom',
      phone: 'Téléphone',
      location: 'Localisation',
      category: 'Catégorie',
      price: 'Prix',
      addToFavorites: '☆ Ajouter aux favoris',
      inFavorites: '⭐ Retirer des favoris',
      editListing: 'Modifier l\'annonce',
      deleteListing: 'Supprimer l\'annonce',
      deleteConfirm: 'Voulez-vous vraiment supprimer cette annonce ? Cette action nécessite une confirmation.',
      notFound: 'Annonce introuvable ou supprimée.',
    },
    edit: {
      createTitle: 'Déposer une annonce',
      editTitle: 'Modifier l\'annonce',
      titleLabel: 'Titre de l\'annonce',
      titlePlaceholder: 'Ex: Vélo vintage restauré',
      descLabel: 'Description',
      descPlaceholder: 'Décrivez votre annonce en détail...',
      priceLabel: 'Prix (€)',
      categoryLabel: 'Catégorie',
      locationLabel: 'Ville / Localisation',
      sellerLabel: 'Nom du vendeur',
      phoneLabel: 'Numéro de téléphone',
      imageUrlLabel: 'URL de l\'image',
      submitCreate: 'Publier l\'annonce',
      submitEdit: 'Enregistrer les modifications',
      cancel: 'Annuler',
      deleteAd: 'Supprimer cette annonce',
    },
    favorites: {
      title: 'Mes Favoris',
      subtitle: 'Retrouvez toutes vos annonces sauvegardées.',
      emptyTitle: 'Aucun favori pour le moment',
      emptySubtitle: 'Explorez les annonces et cliquez sur l\'étoile ou demandez à l\'assistant d\'en ajouter.',
      browseListings: 'Parcourir les annonces',
      removeFromFavorites: 'Retirer',
    },
    chat: {
      assistantName: 'Assistant OwlLayer',
      assistantSubtitle: 'Réponse immédiate',
      online: 'Prêt',
      offline: 'Agent hors ligne',
      connected: 'Agent connecté',
      listening: 'En écoute…',
      thinking: 'Réflexion…',
      speaking: 'Répond…',
      helloTitle: 'Bonjour !',
      helloMsg: 'Je suis votre assistant IA Marketplace. Je peux chercher des annonces, filtrer par prix, sauvegarder vos favoris ou vous aider à publier.',
      placeholder: 'Cherche un vélo à moins de 200€, filtre par catégorie...',
      voiceMode: 'Mode vocal',
    },
    hitl: {
      title: 'Approbation requise',
      description: 'L\'agent IA s\'apprête à exécuter une action sensible :',
      toolName: 'Outil :',
      args: 'Paramètres :',
      approve: 'Approuver l\'action',
      deny: 'Refuser l\'action',
    },
    tools: {
      searchDesc: 'Rechercher des annonces marketplace par mot-clé.',
      filterCatDesc: 'Filtrer les annonces par catégorie.',
      setPriceRangeDesc: 'Définir une fourchette de prix min/max.',
      addFavoriteDesc: 'Ajouter une annonce aux favoris par son ID.',
      removeFavoriteDesc: 'Retirer une annonce des favoris par son ID.',
      getDetailsDesc: 'Obtenir les détails complets d\'une annonce par son ID.',
      createListingDesc: 'Créer une nouvelle annonce sur la marketplace.',
      updateListingDesc: 'Modifier une annonce existante. Nécessite confirmation.',
      deleteListingDesc: 'Supprimer une annonce de la marketplace. Nécessite confirmation.',
      navigateDesc: 'Naviguer vers une page : accueil (/), favoris (/favorites), création (/create), ou détail (/listing/:id).',
    },
  },
};

export type Translations = typeof translations.fr;

const getInitialLocale = (): Locale => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('owllayer_demo_lang_angular');
    if (saved === 'en' || saved === 'fr') return saved;
  }
  return 'fr';
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly localeSignal = signal<Locale>(getInitialLocale());

  readonly locale = this.localeSignal.asReadonly();

  readonly t = computed<Translations>(() => {
    return translations[this.localeSignal()] ?? translations.fr;
  });

  setLocale(locale: Locale): void {
    this.localeSignal.set(locale);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('owllayer_demo_lang_angular', locale);
    }
  }

  toggleLocale(): void {
    this.setLocale(this.localeSignal() === 'fr' ? 'en' : 'fr');
  }

  formatPrice(price: number): string {
    const isWhole = Number.isInteger(price);
    if (this.localeSignal() === 'en') {
      return `€${isWhole ? price : price.toFixed(2)}`;
    }
    return `${isWhole ? price : price.toFixed(2).replace('.', ',')} €`;
  }

  getCategoryLabel(catKey: string): string {
    const current = this.t();
    return current.categories[catKey] || catKey;
  }
}
