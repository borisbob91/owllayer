import { computed, Injectable, signal } from '@angular/core';
import type {
  CreateListingInput,
  ListingDetail,
  ListingFilters,
  ListingSummary,
  UpdateListingInput,
} from '../models/listing.types.js';

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
      description:
        'Magnifique vélo vintage des années 80, entièrement restauré. Cadre en acier, peinture brillante rouge.',
      price: 150,
      category: 'sport',
      location: 'Paris 11ème',
      seller: 'Marie D.',
      sellerPhone: '06 12 34 56 78',
      imageUrl: 'https://picsum.photos/seed/velo/400/300',
      createdAt: new Date('2026-03-15').toISOString(),
    },
    {
      id: '2',
      title: 'Canapé 3 places gris',
      description:
        'Canapé confortable 3 places couleur gris clair. Excellent état, quelques mois d\'utilisation. Dimensions: 220x90x85cm.',
      price: 280,
      category: 'maison',
      location: 'Lyon 3ème',
      seller: 'Thomas L.',
      sellerPhone: '06 98 76 54 32',
      imageUrl: 'https://picsum.photos/seed/canape/400/300',
      createdAt: new Date('2026-03-20').toISOString(),
    },
    {
      id: '3',
      title: 'iPhone 14 Pro 256Go',
      description:
        'iPhone 14 Pro en parfait état, 256Go de stockage. Couleur space black. Vendu avec boîte et câble d\'origine.',
      price: 650,
      category: 'electronique',
      location: 'Marseille',
      seller: 'Alexandre R.',
      imageUrl: 'https://picsum.photos/seed/iphone/400/300',
      createdAt: new Date('2026-04-01').toISOString(),
    },
    {
      id: '4',
      title: 'Appartement T2 lumineux',
      description:
        'Joli T2 de 45m² au 4ème étage avec ascenseur. Cuisine équipée, salle de bain refaite à neuf. Vue dégagée.',
      price: 850,
      category: 'immobilier',
      location: 'Bordeaux Centre',
      seller: 'Agence Immo+',
      sellerPhone: '05 56 12 34 56',
      imageUrl: 'https://picsum.photos/seed/appart/400/300',
      createdAt: new Date('2026-03-10').toISOString(),
    },
    {
      id: '5',
      title: 'Trottinette électrique',
      description:
        'Trottinette électrique Xiaomi Mi 3, autonomie 30km. Comme neuve, très peu servie. Avec chargeur.',
      price: 220,
      category: 'sport',
      location: 'Toulouse',
      seller: 'Julie M.',
      imageUrl:
        'https://picsum.photos/seed/trott/400/300',
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

  list(filters?: ListingFilters): ListingSummary[] {
    let results = this.listingsSignal();

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.seller.toLowerCase().includes(q)
      );
    }

    if (filters?.category) {
      results = results.filter((l) => l.category === filters.category);
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
