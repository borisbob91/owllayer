import { Injectable, signal } from '@angular/core';
import type { ListingCategory, ListingFilters } from '../models/listing.types.js';

/**
 * Service de gestion des filtres de recherche marketplace.
 * Centralise l'état des filtres pour éviter la duplication.
 */
@Injectable({ providedIn: 'root' })
export class ListingFiltersService {
  private readonly filtersSignal = signal<ListingFilters>({});

  readonly filters = this.filtersSignal.asReadonly();

  setQuery(query: string | null): void {
    this.filtersSignal.update((f) => ({
      ...f,
      query: query ?? undefined,
    }));
  }

  setCategory(category: ListingCategory | null): void {
    this.filtersSignal.update((f) => ({
      ...f,
      category: category ?? undefined,
    }));
  }

  setPriceRange(min?: number, max?: number): void {
    this.filtersSignal.update((f) => ({
      ...f,
      minPrice: min,
      maxPrice: max,
    }));
  }

  reset(): void {
    this.filtersSignal.set({});
  }
}
