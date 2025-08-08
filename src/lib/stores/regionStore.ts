import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Region = 'ar' | 'br';

const DEFAULT_REGION: Region = 'ar';

const region = writable<Region>(DEFAULT_REGION);

if (browser) {
  const saved = (localStorage.getItem('region') as Region | null) ?? null;
  if (saved === 'ar' || saved === 'br') {
    region.set(saved);
  }
  region.subscribe((value) => {
    try {
      localStorage.setItem('region', value);
    } catch {}
  });
}

export const regionStore = region;


