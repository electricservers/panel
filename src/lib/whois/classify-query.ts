import { looksLikeSteamId } from '$lib/mge/steam-id';

export type WhoisQuery =
	| { kind: 'steamid'; value: string }
	| { kind: 'ip'; value: string }
	| { kind: 'vanity'; value: string }
	| { kind: 'invalid' };

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const PROFILE_URL_PATTERN = /steamcommunity\.com\/profiles\/(\d{17})/i;
const VANITY_URL_PATTERN = /steamcommunity\.com\/id\/([^/?#]+)/i;

function isIpv4(value: string): boolean {
	const match = IPV4_PATTERN.exec(value);
	if (!match) return false;
	return match.slice(1, 5).every((octet) => Number(octet) <= 255);
}

/** Classifies a free-text Whois search box value into a search mode. */
export function classifyWhoisQuery(input: string): WhoisQuery {
	const trimmed = input.trim();
	if (!trimmed) return { kind: 'invalid' };

	const profileUrlMatch = PROFILE_URL_PATTERN.exec(trimmed);
	if (profileUrlMatch) return { kind: 'steamid', value: profileUrlMatch[1] };

	if (looksLikeSteamId(trimmed)) return { kind: 'steamid', value: trimmed };

	if (isIpv4(trimmed)) return { kind: 'ip', value: trimmed };

	const vanityUrlMatch = VANITY_URL_PATTERN.exec(trimmed);
	if (vanityUrlMatch) return { kind: 'vanity', value: vanityUrlMatch[1] };

	return { kind: 'vanity', value: trimmed };
}
