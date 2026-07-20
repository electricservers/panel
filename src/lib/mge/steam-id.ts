import { ID } from '@node-steam/id';

/** A SteamID in any of Steam2, Steam3, or Steam64 string form. */
export type SteamId = string;

const STEAM64_PATTERN = /^\d{17}$/;
const STEAM2_PATTERN = /^STEAM_\d+:\d+:\d+$/;

/**
 * Converts any SteamID form to Steam2 (`STEAM_0:X:Y`), the format stored in
 * mgemod tables. Throws if the input is not a parseable SteamID.
 */
export function toSteamId2(input: SteamId): string {
	return new ID(input).getSteamID2();
}

/**
 * Converts any SteamID form to Steam64, the format used in URLs and the
 * Steam Web API.
 */
export function toSteamId64(input: SteamId): string {
	return new ID(input).getSteamID64();
}

/**
 * Steam Community profile URL for any parseable SteamID form, or `null`
 * if the input cannot be converted.
 */
export function steamProfileUrl(input: SteamId): string | null {
	try {
		return `https://steamcommunity.com/profiles/${toSteamId64(input)}`;
	} catch {
		return null;
	}
}

/**
 * Pulls a bare SteamID (Steam2, Steam3, or Steam64) out of a Steam profile
 * URL like `steamcommunity.com/profiles/7656...`, or returns the trimmed
 * input unchanged if it isn't a profile URL.
 */
function extractFromProfileUrl(input: string): string {
	const trimmed = input.trim();
	const idMatch = trimmed.match(/\b(7656\d{13})\b/);
	if (idMatch) return idMatch[1];

	try {
		const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
		const parts = url.pathname.split('/').filter(Boolean);
		if (parts[0] === 'profiles' && parts[1]) return parts[1];
	} catch {
		// Not a URL; fall through and let the caller try to parse it as-is.
	}
	return trimmed;
}

/**
 * Returns the Steam2/Steam64 form if `input` parses as a SteamID (Steam2,
 * Steam3, Steam64, or a `steamcommunity.com/profiles/...` URL), else null.
 */
export function tryParseSteamId(input: string): { steam2: string; steam64: string } | null {
	try {
		const id = new ID(extractFromProfileUrl(input));
		return { steam2: id.getSteamID2(), steam64: id.getSteamID64() };
	} catch {
		return null;
	}
}

/** True when `input` looks like a Steam2 or Steam64 identifier (not a name search). */
export function looksLikeSteamId(input: string): boolean {
	return STEAM64_PATTERN.test(input) || STEAM2_PATTERN.test(input);
}
