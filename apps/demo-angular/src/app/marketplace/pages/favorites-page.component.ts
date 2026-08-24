import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { injectOwlLayer, registerContext } from '@owllayer/angular';
import { ListingsStoreService } from '../store/listings.store.js';
import { ListingCardComponent } from '../components/listing-card.component.js';

/**
 * Page favoris — Liste des annonces favorites.
 * Enregistre le contexte favoris pour l'agent LLM.
 */
@Component({
  standalone: true,
  selector: 'app-favorites-page',
  imports: [ListingCardComponent],
  template: `
    <div class="favorites-page">
      <header class="page-header">
        <button type="button" class="back-btn" (click)="goHome()">
          ← Retour à la liste
        </button>
        <h1>Mes favoris</h1>
        <p class="subtitle">{{ favoriteCount() }} annonce(s) favorite(s)</p>
      </header>

      @if (favoriteCount() === 0) {
        <div class="empty-state">
          <p>Vous n'avez pas encore ajouté de favoris.</p>
          <button type="button" (click)="goHome()">
            Parcourir les annonces
          </button>
        </div>
      } @else {
        <div class="favorites-grid">
          @for (listing of favorites(); track listing.id) {
            <app-listing-card
              [listing]="listing"
              [showFavoriteIndicator]="true"
              (cardClick)="onViewListing($event)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .favorites-page {
        padding: 24px;
      }

      .page-header {
        margin-bottom: 32px;
        text-align: center;
      }

      .back-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        color: #f6efe3;
        cursor: pointer;
        display: inline-block;
        font: inherit;
        margin-bottom: 16px;
        padding: 10px 16px;
      }

      .page-header h1 {
        font-size: clamp(2rem, 4vw, 3rem);
        margin: 0 0 8px;
      }

      .subtitle {
        color: #a9c0c7;
        font-size: 1.1rem;
        margin: 0;
      }

      .favorites-grid {
        display: grid;
        gap: 20px;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        margin: 0 auto;
        max-width: 1200px;
      }

      .empty-state {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        margin: 60px auto;
        max-width: 500px;
        padding: 60px 24px;
        text-align: center;
      }

      .empty-state p {
        color: #a9c0c7;
        font-size: 1.1rem;
        margin: 0 0 24px;
      }

      .empty-state button {
        background: #ffcf8b;
        border: none;
        border-radius: 8px;
        color: #1d1f1f;
        cursor: pointer;
        font: inherit;
        padding: 12px 24px;
      }
    `,
  ],
})
export class FavoritesPageComponent {
  private readonly router = inject(Router);
  private readonly owllayer = injectOwlLayer();
  private readonly store = inject(ListingsStoreService);

  readonly favorites = this.store.favorites;
  readonly favoriteCount = computed(() => this.store.favoriteIds().length);

  constructor() {
    registerContext(() => ({
      page: 'favorites',
      pageName: 'Mes favoris',
      favoritesCount: this.favoriteCount(),
      favoriteListings: this.favorites().map((l) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        category: l.category,
      })),
      topCategories: this.getTopCategories(this.favorites()),
    }));
  }

  onViewListing(id: string): void {
    void this.router.navigate(['/listing', id]);
  }

  goHome(): void {
    void this.router.navigate(['/']);
  }

  private getTopCategories(listings: any[]): string[] {
    const counts = new Map<string, number>();
    listings.forEach((l) => {
      counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
  }
}
