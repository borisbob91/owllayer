import { Component, input, output } from '@angular/core';
import type { ListingSummary } from '../models/listing.types.js';
import { CurrencyPipe, DatePipe } from '@angular/common';

/**
 * Composant carte réutilisable pour afficher une annonce.
 * Utilisé dans la liste et les favoris.
 */
@Component({
  standalone: true,
  selector: 'app-listing-card',
  imports: [CurrencyPipe, DatePipe],
  template: `
    <article class="listing-card" (click)="cardClick.emit(listing().id)">
      @if (listing().imageUrl) {
        <div class="image" [style.background-image]="'url(' + listing().imageUrl + ')'"></div>
      }
      <div class="content">
        <div class="header">
          <h3 class="title">{{ listing().title }}</h3>
          <span class="price">{{ listing().price | currency: 'EUR' }}</span>
        </div>
        <p class="category">{{ listing().category }}</p>
        <p class="location">📍 {{ listing().location }}</p>
        <p class="date">{{ listing().createdAt | date: 'dd/MM/yyyy' }}</p>
      </div>
      @if (showFavoriteIndicator()) {
        <div class="favorite-badge">⭐</div>
      }
    </article>
  `,
  styles: [
    `
      .listing-card {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        cursor: pointer;
        overflow: hidden;
        position: relative;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .listing-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }

      .image {
        background-position: center;
        background-size: cover;
        height: 180px;
        width: 100%;
      }

      .content {
        padding: 16px;
      }

      .header {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .title {
        flex: 1;
        font-size: 1.1rem;
        margin: 0;
      }

      .price {
        background: #ffcf8b;
        border-radius: 8px;
        color: #1d1f1f;
        font-size: 1rem;
        font-weight: 600;
        padding: 4px 10px;
        white-space: nowrap;
      }

      .category {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #a9c0c7;
        display: inline-block;
        font-size: 0.85rem;
        margin: 0 0 8px;
        padding: 4px 8px;
        text-transform: capitalize;
      }

      .location,
      .date {
        color: #dfd2c0;
        font-size: 0.9rem;
        margin: 4px 0;
      }

      .favorite-badge {
        background: rgba(255, 207, 139, 0.2);
        border-radius: 50%;
        font-size: 1.5rem;
        height: 40px;
        line-height: 40px;
        position: absolute;
        right: 12px;
        text-align: center;
        top: 12px;
        width: 40px;
      }
    `,
  ],
})
export class ListingCardComponent {
  readonly listing = input.required<ListingSummary>();
  readonly showFavoriteIndicator = input<boolean>(false);
  readonly cardClick = output<string>();
}
