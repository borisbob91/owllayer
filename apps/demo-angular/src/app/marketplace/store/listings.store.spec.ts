import { describe, it, expect, beforeEach } from 'vitest';
import { ListingsStoreService } from './listings.store.js';

describe('ListingsStoreService', () => {
  let store: ListingsStoreService;

  beforeEach(() => {
    store = new ListingsStoreService();
  });

  it('initializes with default listings having Unsplash images', () => {
    const listings = store.list();
    expect(listings.length).toBe(5);
    expect(listings[0].imageUrl).toContain('images.unsplash.com');
  });

  it('matches multilingual search queries (bike / velo)', () => {
    const resultsEn = store.list({ query: 'bike' });
    expect(resultsEn.length).toBeGreaterThan(0);
    expect(resultsEn[0].id).toBe('1');

    const resultsFr = store.list({ query: 'velo' });
    expect(resultsFr.length).toBeGreaterThan(0);
    expect(resultsFr[0].id).toBe('1');
  });

  it('matches category aliases (furniture / maison)', () => {
    const resultsAlias = store.list({ category: 'furniture' as any });
    expect(resultsAlias.length).toBeGreaterThan(0);
    expect(resultsAlias.some(r => r.category === 'maison')).toBe(true);
  });

  it('returns localized title, location and description based on locale', () => {
    const item = store.getById('1')!;
    expect(store.getListingTitle(item, 'en')).toBe('Vintage Restored Bicycle');
    expect(store.getListingTitle(item, 'fr')).toBe('Vélo vintage restauré');
    expect(store.getListingLocation(item, 'en')).toBe('Paris 11th');
    expect(store.getListingLocation(item, 'fr')).toBe('Paris 11ème');
    expect(store.getListingDescription(item, 'en')).toContain('1980s vintage bicycle');
    expect(store.getListingDescription(item, 'fr')).toContain('Magnifique vélo vintage');
  });
});
