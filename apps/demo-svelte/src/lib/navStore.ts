import { writable } from 'svelte/store';

export type Page = 'destinations' | 'offres' | 'details' | 'comparer';

export const currentPage = writable<Page>('destinations');

export function navigate(page: Page) {
  currentPage.set(page);
}
