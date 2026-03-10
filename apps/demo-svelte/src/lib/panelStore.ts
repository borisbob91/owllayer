import { writable } from 'svelte/store';

export const isPanelOpen = writable(false);

export function togglePanel() { isPanelOpen.update((v) => !v); }
export function openPanel()   { isPanelOpen.set(true);  }
export function closePanel()  { isPanelOpen.set(false); }
