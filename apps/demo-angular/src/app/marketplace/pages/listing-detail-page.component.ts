import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { injectDomOS, registerContext, DomOSToolButtonComponent } from '@domos/angular';
import { ListingsStoreService } from '../store/listings.store.js';

/**
 * Page détail d'une annonce.
 * Démontre l'utilisation de DomOSToolButtonComponent et contexte riche.
 */
@Component({
  standalone: true,
  selector: 'app-listing-detail-page',
  imports: [CurrencyPipe, DatePipe, DomOSToolButtonComponent],
  template: `
    <div class="detail-page">
      @if (listing(); as listing) {
        <div class="detail-container">
          <button type="button" class="back-btn" (click)="goBack()">
            ← Retour à la liste
          </button>

          @if (listing.imageUrl) {
            <div
              class="main-image"
              [style.background-image]="'url(' + listing.imageUrl + ')'"
            ></div>
          }

          <div class="detail-content">
            <div class="header">
              <div>
                <h1>{{ listing.title }}</h1>
                <p class="price">{{ listing.price | currency: 'EUR' }}</p>
              </div>
              <button
                type="button"
                class="favorite-btn"
                [class.is-favorite]="isFavorite()"
                (click)="toggleFavorite()"
              >
                {{ isFavorite() ? '⭐ Retirer des favoris' : '☆ Ajouter aux favoris' }}
              </button>
            </div>

            <div class="meta">
              <span class="category">{{ listing.category }}</span>
              <span class="location">📍 {{ listing.location }}</span>
              <span class="date">Publié le {{ listing.createdAt | date: 'dd/MM/yyyy' }}</span>
            </div>

            <div class="description">
              <h2>Description</h2>
              <p>{{ listing.description }}</p>
            </div>

            <div class="seller-info">
              <h2>Informations vendeur</h2>
              <p><strong>Nom :</strong> {{ listing.seller }}</p>
              @if (listing.sellerPhone) {
                <p><strong>Téléphone :</strong> {{ listing.sellerPhone }}</p>
              }
            </div>

            <div class="actions">
              <!-- Démonstration de DomOSToolButtonComponent -->
              <domos-tool-button
                toolName="contact_seller"
                [toolArgs]="{ listingId: listing.id, seller: listing.seller }"
                buttonClass="contact-btn"
              >
                Contacter le vendeur
              </domos-tool-button>

              <button type="button" class="edit-btn" (click)="editListing()">
                Modifier l'annonce
              </button>
            </div>
          </div>
        </div>
      } @else {
        <div class="error-state">
          <h2>Annonce introuvable</h2>
          <button type="button" (click)="goBack()">Retour à la liste</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .detail-page {
        padding: 24px;
      }

      .detail-container {
        margin: 0 auto;
        max-width: 900px;
      }

      .back-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        color: #f6efe3;
        cursor: pointer;
        font: inherit;
        margin-bottom: 24px;
        padding: 10px 16px;
      }

      .back-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .main-image {
        background-position: center;
        background-size: cover;
        border-radius: 16px;
        height: 400px;
        margin-bottom: 24px;
        width: 100%;
      }

      .detail-content {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 32px;
      }

      .header {
        align-items: flex-start;
        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        display: flex;
        gap: 24px;
        justify-content: space-between;
        margin-bottom: 24px;
        padding-bottom: 24px;
      }

      .header h1 {
        font-size: 2rem;
        margin: 0 0 8px;
      }

      .price {
        color: #ffcf8b;
        font-size: 1.8rem;
        font-weight: 600;
        margin: 0;
      }

      .favorite-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        color: #f6efe3;
        cursor: pointer;
        font: inherit;
        padding: 12px 20px;
        white-space: nowrap;
      }

      .favorite-btn.is-favorite {
        background: rgba(255, 207, 139, 0.2);
        border-color: #ffcf8b;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 24px;
      }

      .meta > span {
        color: #a9c0c7;
        font-size: 0.95rem;
      }

      .category {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 4px 12px;
        text-transform: capitalize;
      }

      .description {
        margin-bottom: 24px;
      }

      .description h2 {
        font-size: 1.3rem;
        margin: 0 0 12px;
      }

      .description p {
        color: #dfd2c0;
        line-height: 1.6;
        margin: 0;
      }

      .seller-info {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        margin-bottom: 24px;
        padding: 20px;
      }

      .seller-info h2 {
        font-size: 1.2rem;
        margin: 0 0 12px;
      }

      .seller-info p {
        color: #dfd2c0;
        margin: 8px 0;
      }

      .actions {
        display: flex;
        gap: 12px;
      }

      .contact-btn,
      .edit-btn {
        background: #ffcf8b;
        border: none;
        border-radius: 8px;
        color: #1d1f1f;
        cursor: pointer;
        flex: 1;
        font: inherit;
        font-weight: 600;
        padding: 14px 24px;
      }

      .edit-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #f6efe3;
      }

      .error-state {
        padding: 80px 24px;
        text-align: center;
      }

      .error-state h2 {
        margin-bottom: 24px;
      }

      .error-state button {
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
export class ListingDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly domos = injectDomOS();
  private readonly store = inject(ListingsStoreService);

  readonly listingId = signal<string | null>(null);
  readonly listing = computed(() => {
    const id = this.listingId();
    return id ? this.store.getById(id) : null;
  });

  readonly isFavorite = computed(() => {
    const id = this.listingId();
    return id ? this.store.isFavorite(id) : false;
  });

  constructor() {
    // Récupérer l'ID depuis la route
    this.route.paramMap.subscribe((params) => {
      this.listingId.set(params.get('id'));
    });

    // Enregistrer contexte riche pour l'agent LLM
    effect(() => {
      const current = this.listing();
      if (current) {
        registerContext({
          page: 'listing-detail',
          pageName: 'Détail annonce',
          listing: {
            id: current.id,
            title: current.title,
            price: current.price,
            category: current.category,
            seller: current.seller,
            location: current.location,
            description: current.description,
          },
          isFavorite: this.isFavorite(),
          favoritesCount: this.store.favoriteIds().length,
        });
      }
    });
  }

  toggleFavorite(): void {
    const id = this.listingId();
    if (id) {
      this.store.toggleFavorite(id);
    }
  }

  editListing(): void {
    const id = this.listingId();
    if (id) {
      void this.router.navigate(['/edit', id]);
    }
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
