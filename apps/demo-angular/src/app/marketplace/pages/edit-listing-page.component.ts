import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { injectDomOS, registerContext } from '@domos/angular';
import { ListingsStoreService } from '../store/listings.store.js';
import {
  LISTING_CATEGORIES,
  type ListingCategory,
} from '../models/listing.types.js';

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
          ← Retour
        </button>

        <h1>{{ isEditMode() ? 'Modifier l\'annonce' : 'Déposer une annonce' }}</h1>

        <form class="edit-form" (submit)="onSubmit($event)">
          <div class="form-group">
            <label for="title">Titre de l'annonce *</label>
            <input
              id="title"
              type="text"
              [(ngModel)]="formData.title"
              name="title"
              required
              placeholder="Ex: Vélo vintage restauré"
            />
          </div>

          <div class="form-group">
            <label for="description">Description *</label>
            <textarea
              id="description"
              [(ngModel)]="formData.description"
              name="description"
              rows="5"
              required
              placeholder="Décrivez votre annonce en détail..."
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="price">Prix (€) *</label>
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
              <label for="category">Catégorie *</label>
              <select
                id="category"
                [(ngModel)]="formData.category"
                name="category"
                required
              >
                <option value="">Choisir...</option>
                @for (cat of categories; track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="location">Localisation *</label>
            <input
              id="location"
              type="text"
              [(ngModel)]="formData.location"
              name="location"
              required
              placeholder="Ex: Paris 11ème"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="seller">Nom du vendeur *</label>
              <input
                id="seller"
                type="text"
                [(ngModel)]="formData.seller"
                name="seller"
                required
                placeholder="Ex: Marie D."
              />
            </div>

            <div class="form-group">
              <label for="sellerPhone">Téléphone</label>
              <input
                id="sellerPhone"
                type="tel"
                [(ngModel)]="formData.sellerPhone"
                name="sellerPhone"
                placeholder="Ex: 06 12 34 56 78"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="imageUrl">URL de l'image</label>
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
              {{ isEditMode() ? 'Enregistrer les modifications' : 'Publier l\'annonce' }}
            </button>
            <button type="button" class="cancel-btn" (click)="goBack()">
              Annuler
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
  private readonly domos = injectDomOS();
  private readonly store = inject(ListingsStoreService);

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

    // Enregistrer contexte riche
    effect(() => {
      const mode = this.isEditMode();
      const id = this.editId();
      const data = this.formData();

      registerContext({
        page: mode ? 'edit-listing' : 'create-listing',
        pageName: mode ? 'Modification annonce' : 'Création annonce',
        mode: mode ? 'edit' : 'create',
        listingId: id,
        formState: {
          title: data.title,
          category: data.category || null,
          price: data.price,
        },
      });
    });
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
