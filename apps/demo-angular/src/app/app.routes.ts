import type { Routes } from '@angular/router';
import { HomePageComponent } from './marketplace/pages/home-page.component.js';
import { ListingDetailPageComponent } from './marketplace/pages/listing-detail-page.component.js';
import { EditListingPageComponent } from './marketplace/pages/edit-listing-page.component.js';
import { FavoritesPageComponent } from './marketplace/pages/favorites-page.component.js';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
  },
  {
    path: 'listing/:id',
    component: ListingDetailPageComponent,
  },
  {
    path: 'edit',
    component: EditListingPageComponent,
  },
  {
    path: 'edit/:id',
    component: EditListingPageComponent,
  },
  {
    path: 'favorites',
    component: FavoritesPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
