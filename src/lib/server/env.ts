import { env } from '$env/dynamic/private';

export type PanelEnv = {
	SESSION_SECRET: string;
	PANEL_DB_URL: string;
	STEAM_API_KEY: string;
	STEAM_REALM: string;
	STEAM_RETURN_URL: string;
};

const REQUIRED_KEYS = [
	'SESSION_SECRET',
	'PANEL_DB_URL',
	'STEAM_API_KEY',
	'STEAM_REALM',
	'STEAM_RETURN_URL'
] as const;

let cached: PanelEnv | null = null;

/**
 * Validates required panel env vars once and caches the result.
 * Fails loudly and early instead of leaving auth/DB half-configured.
 */
export function getPanelEnv(): PanelEnv {
	if (cached) return cached;

	const missing = REQUIRED_KEYS.filter((key) => !env[key] || env[key]!.trim() === '');
	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
		);
	}

	cached = {
		SESSION_SECRET: env.SESSION_SECRET!,
		PANEL_DB_URL: env.PANEL_DB_URL!,
		STEAM_API_KEY: env.STEAM_API_KEY!,
		STEAM_REALM: env.STEAM_REALM!,
		STEAM_RETURN_URL: env.STEAM_RETURN_URL!
	};
	return cached;
}
