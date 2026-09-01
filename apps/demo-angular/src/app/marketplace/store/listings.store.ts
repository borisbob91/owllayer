import { computed, Injectable, signal } from '@angular/core';
import type {
  CreateListingInput,
  ListingDetail,
  ListingFilters,
  ListingSummary,
  UpdateListingInput,
} from '../models/listing.types.js';

const LISTING_KEYWORDS: Record<string, string[]> = {
  '1': ['velo', 'bike', 'bicycle', 'vintage', 'cyclisme', 'cadre', 'rouge', 'sport', 'bicyclette'],
  '2': ['canape', 'sofa', 'couch', 'salon', 'meuble', 'furniture', 'gris', 'fauteuil', 'maison', 'living room'],
  '3': ['iphone', 'smartphone', 'phone', 'telephone', 'apple', 'mobile', 'cellphone', 'electronique', 'electronics', 'ios'],
  '4': ['appartement', 'apartment', 'flat', 'logement', 't2', 'immobilier', 'real estate', 'housing', 'location', 'rent', 'home'],
  '5': ['trottinette', 'scooter', 'electric', 'electrique', 'xiaomi', 'transport', 'mobilite', 'sport'],
};

const CATEGORY_ALIASES: Record<string, string> = {
  'sports': 'sport',
  'home': 'maison',
  'furniture': 'maison',
  'house': 'maison',
  'electronics': 'electronique',
  'electronic': 'electronique',
  'tech': 'electronique',
  'realestate': 'immobilier',
  'housing': 'immobilier',
  'vehicles': 'vehicules',
  'vehicle': 'vehicules',
  'other': 'divers',
  'others': 'divers',
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Store local marketplace — Source de vérité pour annonces et favoris.
 * Utilise Angular signals pour réactivité.
 */
@Injectable({ providedIn: 'root' })
export class ListingsStoreService {
  private readonly listingsSignal = signal<ListingDetail[]>([
    {
      id: '1',
      title: 'Vélo vintage restauré',
      titleEn: 'Vintage Restored Bicycle',
      description:
        'Magnifique vélo vintage des années 80, entièrement restauré. Cadre en acier, peinture brillante rouge.',
      descriptionEn:
        'Beautiful 1980s vintage bicycle, fully restored. Classic steel frame, glossy red finish.',
      price: 150,
      category: 'sport',
      location: 'Paris 11ème',
      locationEn: 'Paris 11th',
      seller: 'Marie D.',
      sellerPhone: '06 12 34 56 78',
      imageUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
      createdAt: new Date('2026-03-15').toISOString(),
    },
    {
      id: '2',
      title: 'Canapé 3 places gris',
      titleEn: 'Grey 3-Seater Sofa',
      description:
        'Canapé confortable 3 places couleur gris clair. Excellent état, quelques mois d\'utilisation. Dimensions: 220x90x85cm.',
      descriptionEn:
        'Comfortable 3-seater sofa in light grey. Mint condition, only used for a few months. Size: 220x90x85cm.',
      price: 280,
      category: 'maison',
      location: 'Lyon 3ème',
      locationEn: 'Lyon 3rd',
      seller: 'Thomas L.',
      sellerPhone: '06 98 76 54 32',
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
      createdAt: new Date('2026-03-20').toISOString(),
    },
    {
      id: '3',
      title: 'iPhone 14 Pro 256Go',
      titleEn: 'iPhone 14 Pro 256GB',
      description:
        'iPhone 14 Pro en parfait état, 256Go de stockage. Couleur space black. Vendu avec boîte et câble d\'origine.',
      descriptionEn:
        'iPhone 14 Pro in pristine condition, 256GB storage. Space Black. Comes with original box and cable.',
      price: 650,
      category: 'electronique',
      location: 'Marseille',
      locationEn: 'Marseille',
      seller: 'Alexandre R.',
      imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
      createdAt: new Date('2026-04-01').toISOString(),
    },
    {
      id: '4',
      title: 'Appartement T2 lumineux',
      titleEn: 'Sunny 1-Bedroom Apartment',
      description:
        'Joli T2 de 45m² au 4ème étage avec ascenseur. Cuisine équipée, salle de bain refaite à neuf. Vue dégagée.',
      descriptionEn:
        'Charming 45m² 1-bedroom flat on the 4th floor with elevator. Fitted kitchen, newly renovated bathroom. Open view.',
      price: 850,
      category: 'immobilier',
      location: 'Bordeaux Centre',
      locationEn: 'Bordeaux Downtown',
      seller: 'Agence Immo+',
      sellerPhone: '05 56 12 34 56',
      imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80',
      createdAt: new Date('2026-03-10').toISOString(),
    },
    {
      id: '5',
      title: 'Trottinette électrique',
      titleEn: 'Electric Scooter Pro',
      description:
        'Trottinette électrique Xiaomi Mi 3, autonomie 30km. Comme neuve, très peu servie. Avec chargeur.',
      descriptionEn:
        'Xiaomi Mi 3 electric scooter, 30km range. Like new condition, rarely used. Charger included.',
      price: 220,
      category: 'sport',
      location: 'Toulouse',
      locationEn: 'Toulouse',
      seller: 'Julie M.',
      imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
      createdAt: new Date('2026-04-02').toISOString(),
    },
  ]);

  private readonly favoriteIdsSignal = signal<string[]>([]);

  readonly listings = this.listingsSignal.asReadonly();
  readonly favoriteIds = this.favoriteIdsSignal.asReadonly();

  readonly favorites = computed(() => {
    const favIds = this.favoriteIdsSignal();
    return this.listingsSignal().filter((l) => favIds.includes(l.id));
  });

  getListingTitle(listing: ListingSummary, locale: 'en' | 'fr' = 'fr'): string {
    if (locale === 'en' && listing.titleEn) {
      return listing.titleEn;
    }
    return listing.title;
  }

  getListingDescription(listing: ListingDetail, locale: 'en' | 'fr' = 'fr'): string {
    if (locale === 'en' && listing.descriptionEn) {
      return listing.descriptionEn;
    }
    return listing.description;
  }

  getListingLocation(listing: ListingSummary, locale: 'en' | 'fr' = 'fr'): string {
    if (locale === 'en' && listing.locationEn) {
      return listing.locationEn;
    }
    return listing.location;
  }

  list(filters?: ListingFilters): ListingSummary[] {
    let results = this.listingsSignal();

    if (filters?.query) {
      const q = normalizeText(filters.query);
      results = results.filter((l) => {
        const titleNorm = normalizeText(l.title);
        const titleEnNorm = normalizeText(l.titleEn || '');
        const descNorm = normalizeText(l.description);
        const descEnNorm = normalizeText(l.descriptionEn || '');
        const locationNorm = normalizeText(l.location);
        const locationEnNorm = normalizeText(l.locationEn || '');
        const sellerNorm = normalizeText(l.seller);
        const catNorm = normalizeText(l.category);

        if (
          titleNorm.includes(q) ||
          titleEnNorm.includes(q) ||
          descNorm.includes(q) ||
          descEnNorm.includes(q) ||
          locationNorm.includes(q) ||
          locationEnNorm.includes(q) ||
          sellerNorm.includes(q) ||
          catNorm.includes(q)
        ) {
          return true;
        }

        const keywords = LISTING_KEYWORDS[l.id] || [];
        return keywords.some((k) => {
          const kNorm = normalizeText(k);
          return kNorm.includes(q) || q.includes(kNorm);
        });
      });
    }

    if (filters?.category) {
      const catKey = normalizeText(filters.category);
      const normalizedCat = CATEGORY_ALIASES[catKey] || filters.category;
      results = results.filter((l) => l.category === normalizedCat || l.category === filters.category);
    }

    if (filters?.minPrice !== undefined) {
      results = results.filter((l) => l.price >= filters.minPrice!);
    }

    if (filters?.maxPrice !== undefined) {
      results = results.filter((l) => l.price <= filters.maxPrice!);
    }

    return results;
  }

  getById(id: string): ListingDetail | null {
    return this.listingsSignal().find((l) => l.id === id) ?? null;
  }

  createListing(input: CreateListingInput): ListingDetail {
    const newListing: ListingDetail = {
      id: `${Date.now()}`,
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      location: input.location,
      seller: input.seller,
      sellerPhone: input.sellerPhone,
      imageUrl: input.imageUrl,
      createdAt: new Date().toISOString(),
    };

    this.listingsSignal.update((listings) => [newListing, ...listings]);
    return newListing;
  }

  updateListing(id: string, input: UpdateListingInput): ListingDetail | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated: ListingDetail = {
      ...existing,
      ...input,
    };

    this.listingsSignal.update((listings) =>
      listings.map((l) => (l.id === id ? updated : l))
    );

    return updated;
  }

  deleteListing(id: string): boolean {
    const before = this.listingsSignal().length;
    this.listingsSignal.update((listings) => listings.filter((l) => l.id !== id));
    return this.listingsSignal().length < before;
  }

  toggleFavorite(id: string): boolean {
    const isFavorite = this.favoriteIdsSignal().includes(id);
    if (isFavorite) {
      this.favoriteIdsSignal.update((ids) => ids.filter((fid) => fid !== id));
      return false;
    } else {
      this.favoriteIdsSignal.update((ids) => [...ids, id]);
      return true;
    }
  }

  isFavorite(id: string): boolean {
    return this.favoriteIdsSignal().includes(id);
  }
}
