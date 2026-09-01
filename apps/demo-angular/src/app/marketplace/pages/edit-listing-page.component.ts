import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectOwlLayer, registerContext } from '@owllayer/angular';
import { ListingsStoreService } from '../store/listings.store.js';
import {
  LISTING_CATEGORIES,
  type ListingCategory,
} from '../models/listing.types.js';
import { I18nService } from '../../core/i18n/i18n.service.js';

/**
 * Page création/édition d'annonce.
 * Enregistre le contexte mode création vs édition.
 */
@Component({
  standalone: true,
  selector: 'app-edit-listing-page',
  imports: [FormsModule],
  template: `
    <div class="edit-page">
      <div class="edit-container">
        <button type="button" class="back-btn" (click)="goBack()">
          ← {{ i18n.t().edit.cancel }}
        </button>

        <h1>{{ isEditMode() ? i18n.t().edit.editTitle : i18n.t().edit.createTitle }}</h1>

        <form class="edit-form" (submit)="onSubmit($event)">
          <div class="form-group">
            <label for="title">{{ i18n.t().edit.titleLabel }} *</label>
            <input
              id="title"
              type="text"
              [(ngModel)]="formData.title"
              name="title"
              required
              [placeholder]="i18n.t().edit.titlePlaceholder"
            />
          </div>

          <div class="form-group">
            <label for="description">{{ i18n.t().edit.descLabel }} *</label>
            <textarea
              id="description"
              [(ngModel)]="formData.description"
              name="description"
              rows="5"
              required
              [placeholder]="i18n.t().edit.descPlaceholder"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="price">{{ i18n.t().edit.priceLabel }} *</label>
              <input
                id="price"
                type="number"
                [(ngModel)]="formData.price"
                name="price"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div class="form-group">
              <label for="category">{{ i18n.t().edit.categoryLabel }} *</label>
              <select
                id="category"
                [(ngModel)]="formData.category"
                name="category"
                required
              >
                <option value="">{{ i18n.t().home.allCategories }}</option>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ i18n.getCategoryLabel(cat) }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="location">{{ i18n.t().edit.locationLabel }} *</label>
            <input
              id="location"
              type="text"
              [(ngModel)]="formData.location"
              name="location"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="seller">{{ i18n.t().edit.sellerLabel }} *</label>
              <input
                id="seller"
                type="text"
                [(ngModel)]="formData.seller"
                name="seller"
                required
              />
            </div>

            <div class="form-group">
              <label for="sellerPhone">{{ i18n.t().edit.phoneLabel }}</label>
              <input
                id="sellerPhone"
                type="tel"
                [(ngModel)]="formData.sellerPhone"
                name="sellerPhone"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="imageUrl">{{ i18n.t().edit.imageUrlLabel }}</label>
            <input
              id="imageUrl"
              type="url"
              [(ngModel)]="formData.imageUrl"
              name="imageUrl"
              placeholder="https://..."
            />
          </div>

          <div class="form-actions">
            <button type="submit" class="submit-btn">
              {{ isEditMode() ? i18n.t().edit.submitEdit : i18n.t().edit.submitCreate }}
            </button>
            <button type="button" class="cancel-btn" (click)="goBack()">
              {{ i18n.t().edit.cancel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .edit-page {
        padding: 24px;
      }

      .edit-container {
        margin: 0 auto;
        max-width: 700px;
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

      h1 {
        font-size: 2rem;
        margin-bottom: 32px;
      }

      .edit-form {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 32px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        color: #a9c0c7;
        display: block;
        font-size: 0.95rem;
        margin-bottom: 8px;
      }

      .form-group input,
      .form-group textarea,
      .form-group select {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #f6efe3;
        font: inherit;
        padding: 12px;
        width: 100%;
      }

      .form-group textarea {
        resize: vertical;
      }

      .form-group input::placeholder,
      .form-group textarea::placeholder {
        color: #a9c0c7;
      }

      .form-row {
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr 1fr;
      }

      @media (max-width: 600px) {
        .form-row {
          grid-template-columns: 1fr;
        }
      }

      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 32px;
      }

      .submit-btn {
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

      .cancel-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        color: #f6efe3;
        cursor: pointer;
        font: inherit;
        padding: 14px 24px;
      }
    `,
  ],
})
export class EditListingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly owllayer = injectOwlLayer();
  readonly i18n = inject(I18nService);
  readonly store = inject(ListingsStoreService);

  readonly categories = LISTING_CATEGORIES;
  readonly editId = signal<string | null>(null);
  readonly isEditMode = computed(() => this.editId() !== null);

  readonly formData = signal({
    title: '',
    description: '',
    price: 0,
    category: '' as ListingCategory | '',
    location: '',
    seller: '',
    sellerPhone: '',
    imageUrl: '',
  });

  constructor() {
    // Récupérer l'ID depuis la route
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.editId.set(id);

      if (id) {
        const existing = this.store.getById(id);
        if (existing) {
          this.formData.set({
            title: existing.title,
            description: existing.description,
            price: existing.price,
            category: existing.category,
            location: existing.location,
            seller: existing.seller,
            sellerPhone: existing.sellerPhone ?? '',
            imageUrl: existing.imageUrl ?? '',
          });
        }
      }
    });

    registerContext(() => ({
      page: this.isEditMode() ? 'edit-listing' : 'create-listing',
      pageName: this.isEditMode() ? 'Modification annonce' : 'Création annonce',
      mode: this.isEditMode() ? 'edit' : 'create',
      listingId: this.editId(),
      formState: {
        title: this.formData().title,
        category: this.formData().category || null,
        price: this.formData().price,
      },
    }));
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    const data = this.formData();
    if (!data.category) {
      alert('Veuillez choisir une catégorie');
      return;
    }

    const id = this.editId();
    if (id) {
      // Mode édition
      this.store.updateListing(id, {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category as ListingCategory,
        location: data.location,
        seller: data.seller,
        sellerPhone: data.sellerPhone || undefined,
        imageUrl: data.imageUrl || undefined,
      });
      void this.router.navigate(['/listing', id]);
    } else {
      // Mode création
      const created = this.store.createListing({
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category as ListingCategory,
        location: data.location,
        seller: data.seller,
        sellerPhone: data.sellerPhone || undefined,
        imageUrl: data.imageUrl || undefined,
      });
      void this.router.navigate(['/listing', created.id]);
    }
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
