import { writable } from 'svelte/store';
import type { PickupSite } from '$lib/pickup/pickupSites';

export const selectedSite = writable<PickupSite | null>(null);