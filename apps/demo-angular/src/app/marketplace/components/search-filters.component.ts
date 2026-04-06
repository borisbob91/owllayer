import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ListingFiltersService } from '../store/listing-filters.service.js';
import { LISTING_CATEGORIES } from '../models/listing.types.js';

/**
 * Composant de recherche et filtres marketplace.
 * Synchronise l'état avec ListingFiltersService.
 */
@Component({
  standalone: true,
  selector: 'app-search-filters',
  imports: [FormsModule],
  template: `
    <div class="search-filters">
      <div class="search-box">
        <input
          type="text"
          placeholder="Rechercher dans les annonces..."
          [value]="filters().query ?? ''"
          (input)="onQueryChange($event)"
        />
      </div>

      <div class="filters-row">
        <select
          [value]="filters().category ?? ''"
          (change)="onCategoryChange($event)"
        >
          <option value="">Toutes catégories</option>
          @for (cat of categories; track cat) {
            <option [value]="cat">{{ cat }}</option>
          }
        </select>

        <input
          type="number"
          placeholder="Prix min"
          [value]="filters().minPrice ?? ''"
          (input)="onMinPriceChange($event)"
        />

        <input
          type="number"
          placeholder="Prix max"
          [value]="filters().maxPrice ?? ''"
          (input)="onMaxPriceChange($event)"
        />

        <button type="button" class="reset-btn" (click)="onReset()">
          Réinitialiser
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .search-filters {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        margin-bottom: 24px;
        padding: 20px;
      }

      .search-box {
        margin-bottom: 16px;
      }

      .search-box input {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        color: #f6efe3;
        font: inherit;
        padding: 12px 16px;
        width: 100%;
      }

      .search-box input::placeholder {
        color: #a9c0c7;
      }

      .filters-row {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .filters-row select,
      .filters-row input {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        color: #f6efe3;
        flex: 1;
        font: inherit;
        min-width: 140px;
        padding: 10px 12px;
      }

      .filters-row select option {
        background: #173845;
        color: #f6efe3;
      }

      .filters-row input::placeholder {
        color: #a9c0c7;
      }

      .reset-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        color: #f6efe3;
        cursor: pointer;
        font: inherit;
        padding: 10px 16px;
        white-space: nowrap;
      }

      .reset-btn:hover {
        background: rgba(255, 255, 255, 0.08);
      }
    `,
  ],
})
export class SearchFiltersComponent {
  private readonly filtersService = inject(ListingFiltersService);

  readonly categories = LISTING_CATEGORIES;
  readonly filters = this.filtersService.filters;
  readonly filtersChange = output<void>();

  onQueryChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.filtersService.setQuery(value || null);
    this.filtersChange.emit();
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filtersService.setCategory(
      value ? (value as any) : null
    );
    this.filtersChange.emit();
  }

  onMinPriceChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.filters();
    this.filtersService.setPriceRange(
      value ? parseFloat(value) : undefined,
      current.maxPrice
    );
    this.filtersChange.emit();
  }

  onMaxPriceChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const current = this.filters();
    this.filtersService.setPriceRange(
      current.minPrice,
      value ? parseFloat(value) : undefined
    );
    this.filtersChange.emit();
  }

  onReset(): void {
    this.filtersService.reset();
    this.filtersChange.emit();
  }
}
