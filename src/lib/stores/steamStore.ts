import type { SteamProfile } from "$lib/steam/config";
import { writable } from "svelte/store";

export const steamStore = writable<SteamProfile | null>(null);