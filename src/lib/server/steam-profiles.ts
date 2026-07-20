import { getPanelEnv } from '$lib/server/env';
import { nativeFetch } from '$lib/server/native-fetch';

export type SteamProfile = {
	steamid: string;
	personaname?: string;
	avatar?: string;
	avatarmedium?: string;
	avatarfull?: string;
};

type CacheEntry = { profile: SteamProfile; expiresAt: number };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function isPlaceholderApiKey(key: string): boolean {
	return (
		key.trim().length === 0 ||
		key.includes('replace') ||
		key.includes('changeme') ||
		key.includes('placeholder')
	);
}

/**
 * Batch-fetches Steam profiles (avatar, persona name) for up to 100 Steam64
 * ids. Missing/placeholder `STEAM_API_KEY` or a failed request never throws;
 * callers get an empty map and fall back to initials/no-avatar UI.
 */
export async function getSteamProfiles(steam64Ids: string[]): Promise<Map<string, SteamProfile>> {
	const result = new Map<string, SteamProfile>();
	const ids = Array.from(new Set(steam64Ids.filter(Boolean)));
	if (ids.length === 0) return result;

	const now = Date.now();
	const uncached: string[] = [];
	for (const id of ids) {
		const cached = cache.get(id);
		if (cached && cached.expiresAt > now) {
			result.set(id, cached.profile);
		} else {
			uncached.push(id);
		}
	}
	if (uncached.length === 0) return result;

	let apiKey: string;
	try {
		apiKey = getPanelEnv().STEAM_API_KEY;
	} catch {
		return result;
	}
	if (isPlaceholderApiKey(apiKey)) return result;

	try {
		const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(apiKey)}&steamids=${encodeURIComponent(uncached.slice(0, 100).join(','))}`;
		const response = await nativeFetch(url);
		if (!response.ok) return result;

		const data = (await response.json()) as { response?: { players?: SteamProfile[] } };
		for (const player of data.response?.players ?? []) {
			if (!player.steamid) continue;
			result.set(player.steamid, player);
			cache.set(player.steamid, { profile: player, expiresAt: now + CACHE_TTL_MS });
		}
	} catch {
		// Swallow: avatar enrichment is a nice-to-have, never blocks the page.
	}
	return result;
}
