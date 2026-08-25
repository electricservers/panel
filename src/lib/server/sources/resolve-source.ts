import { error, type Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { listSources } from './registry';
import type { SourceId } from './types';

export const SOURCE_COOKIE = 'panel_source';

export const SOURCE_COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	secure: !dev,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 365
};

function enabledMgeSources() {
	return listSources({ capability: 'mgemod', enabled: true });
}

/** Last chosen enabled `mgemod` source, or the first enabled one. Null if none exist. */
export function peekMgeSourceId(cookies: Cookies): SourceId | null {
	const enabled = enabledMgeSources();
	if (enabled.length === 0) return null;
	const requested = cookies.get(SOURCE_COOKIE);
	if (requested && enabled.some((source) => source.id === requested)) {
		return requested;
	}
	return enabled[0].id;
}

/**
 * Resolves which source an MGE page should query from the `panel_source`
 * cookie. Synchronous and fast, per docs/modules/loading.md's "fast in load" rule.
 */
export function resolveMgeSourceId(cookies: Cookies): SourceId {
	const sourceId = peekMgeSourceId(cookies);
	if (!sourceId) {
		throw error(503, 'No mgemod source is configured.');
	}
	return sourceId;
}
