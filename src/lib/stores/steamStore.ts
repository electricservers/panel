import type { SteamProfile } from "$lib/steam/config";
import { writable } from "svelte/store";

export const steamProfile = writable<SteamProfile>();