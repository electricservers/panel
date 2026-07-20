import SteamAuth from 'node-steam-openid';
import { getPanelEnv } from '$lib/server/env';

export function createSteamAuth() {
	const { STEAM_REALM, STEAM_RETURN_URL, STEAM_API_KEY } = getPanelEnv();
	return new SteamAuth({
		realm: STEAM_REALM,
		returnUrl: STEAM_RETURN_URL,
		apiKey: STEAM_API_KEY
	});
}

export function safeReturnTo(value: string | null | undefined): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return '/';
	}
	return value;
}
