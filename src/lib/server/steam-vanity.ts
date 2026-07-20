import { getPanelEnv } from '$lib/server/env';
import { nativeFetch } from '$lib/server/native-fetch';

function isPlaceholderApiKey(key: string): boolean {
	return (
		key.trim().length === 0 ||
		key.includes('replace') ||
		key.includes('changeme') ||
		key.includes('placeholder')
	);
}

/**
 * Resolves a Steam vanity URL slug to a Steam64 id via the Steam Web API.
 * Missing/placeholder `STEAM_API_KEY`, an unresolved vanity, or a failed
 * request all resolve to `null` rather than throwing.
 */
export async function resolveVanityToSteamId64(vanity: string): Promise<string | null> {
	let apiKey: string;
	try {
		apiKey = getPanelEnv().STEAM_API_KEY;
	} catch {
		return null;
	}
	if (isPlaceholderApiKey(apiKey)) return null;

	try {
		const url = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${encodeURIComponent(apiKey)}&vanityurl=${encodeURIComponent(vanity)}`;
		const response = await nativeFetch(url);
		if (!response.ok) return null;

		const data = (await response.json()) as {
			response?: { success?: number; steamid?: string };
		};
		if (data.response?.success !== 1) return null;
		return data.response.steamid ?? null;
	} catch {
		return null;
	}
}
