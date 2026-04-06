import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { injectDomOS, registerContext } from '@domos/angular';
import { ListingsStoreService } from '../store/listings.store.js';
import { ListingFiltersService } from '../store/listing-filters.service.js';
import { ListingCardComponent } from '../components/listing-card.component.js';
import { SearchFiltersComponent } from '../components/search-filters.component.js';

/**
 * Page d'accueil marketplace — Liste des annonces avec filtres.
 * Enregistre le contexte riche pour l'agent LLM.
 */
@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [ListingCardComponent, SearchFiltersComponent],
  template: `
    <div class="home-page">
      <header class="page-header">
        <h1>Marketplace DomOS</h1>
        <p class="subtitle">Petites annonces entre particuliers</p>
      </header>

      <app-search-filters (filtersChange)="onFiltersChange()" />

      @if (filteredListings().length === 0) {
        <div class="empty-state">
          <p>Aucune annonce ne correspond à vos critères.</p>
        </div>
      } @else {
        <div class="listings-grid">
          @for (listing of filteredListings(); track listing.id) {
            <app-listing-card
              [listing]="listing"
              [showFavoriteIndicator]="store.isFavorite(listing.id)"
              (cardClick)="onViewListing($event)"
            />
          }
        </div>
      }

      <div class="stats">
        <p>{{ filteredListings().length }} annonce(s) affichée(s)</p>
        <p>{{ favoriteCount() }} favori(s)</p>
      </div>
    </div>
  `,
  styles: [
    `
      .home-page {
        padding: 24px;
      }

      .page-header {
        margin-bottom: 32px;
        text-align: center;
      }

      .page-header h1 {
        font-size: clamp(2rem, 4vw, 3.5rem);
        margin: 0 0 8px;
      }

      .subtitle {
        color: #a9c0c7;
        font-size: 1.1rem;
        margin: 0;
      }

      .listings-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        margin-bottom: 32px;
      }

      .empty-state {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        margin: 40px 0;
        padding: 60px 24px;
        text-align: center;
      }

      .empty-state p {
        color: #a9c0c7;
        font-size: 1.1rem;
        margin: 0;
      }

      .stats {
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        color: #a9c0c7;
        font-size: 0.95rem;
        padding-top: 16px;
        text-align: center;
      }

      .stats p {
        margin: 4px 0;
      }
    `,
  ],
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly domos = injectDomOS();
  readonly store = inject(ListingsStoreService);
  private readonly filtersService = inject(ListingFiltersService);

  readonly filters = this.filtersService.filters;
  readonly favoriteCount = computed(() => this.store.favoriteIds().length);

  readonly filteredListings = computed(() =>
    this.store.list(this.filters())
  );

  constructor() {
    // Enregistrer le contexte riche pour l'agent LLM
    effect(() => {
      const currentFilters = this.filters();
      const listings = this.filteredListings();
      const favCount = this.favoriteCount();

      registerContext({
        page: 'home',
        pageName: 'Liste des annonces',
        filters: {
          query: currentFilters.query ?? null,
          category: currentFilters.category ?? null,
          priceRange: {
            min: currentFilters.minPrice ?? null,
            max: currentFilters.maxPrice ?? null,
          },
        },
        listingsDisplayed: listings.length,
        totalListings: this.store.listings().length,
        favoritesCount: favCount,
        topCategories: this.getTopCategories(listings),
      });
    });
  }

  onFiltersChange(): void {
    // Le computed va automatiquement recalculer
  }

  onViewListing(id: string): void {
    void this.router.navigate(['/listing', id]);
  }

  private getTopCategories(listings: any[]): string[] {
    const counts = new Map<string, number>();
    listings.forEach((l) => {
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);
  }
}
