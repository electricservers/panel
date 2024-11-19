import type { SteamProfile } from '$lib/steam/config';

declare global {
  namespace App {
    interface Locals {
      user: SteamProfile | null;
    }
  }
}

export {};
