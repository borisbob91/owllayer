/**
 * Types du domaine marketplace de petites annonces
 */

export type ListingCategory =
  | 'vehicules'
  | 'immobilier'
  | 'electronique'
  | 'sport'
  | 'maison'
  | 'divers';

export const LISTING_CATEGORIES: ListingCategory[] = [
  'vehicules',
  'immobilier',
  'electronique',
  'sport',
  'maison',
  'divers',
];

export interface ListingSummary {
  id: string;
  title: string;
  titleEn?: string;
  price: number;
  category: ListingCategory;
  location: string;
  locationEn?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ListingDetail extends ListingSummary {
  description: string;
  descriptionEn?: string;
  seller: string;
  sellerPhone?: string;
}

export interface ListingFilters {
  query?: string;
  category?: ListingCategory;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  category: ListingCategory;
  location: string;
  seller: string;
  sellerPhone?: string;
  imageUrl?: string;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {}
