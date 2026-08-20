import { error, redirect } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { listSources } from '$lib/server/sources/registry';
import { tryParseSteamId } from '$lib/mge/steam-id';
import { loadVersusData, VERSUS_PAGE_SIZE } from '$lib/server/versus-summary';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

function isMeAlias(value: string): boolean {
	return value.toLowerCase() === 'me';
}

function pairPath(a64: string, b64: string, search: string): string {
	if (BigInt(a64) > BigInt(b64)) return `/mge/players/${b64}/versus/${a64}${search}`;
	return `/mge/players/${a64}/versus/${b64}${search}`;
}

export const load: PageServerLoad = ({ params, url, locals }) => {
	requireModule('mgemod');

	if (isMeAlias(params.steamid) || isMeAlias(params.opponent)) {
		if (!locals.user) {
			const returnTo = encodeURIComponent(url.pathname + url.search);
			throw redirect(302, `/api/auth/login?returnTo=${returnTo}`);
		}
		const aRaw = isMeAlias(params.steamid) ? locals.user.steamId : params.steamid;
		const bRaw = isMeAlias(params.opponent) ? locals.user.steamId : params.opponent;
		const a = tryParseSteamId(aRaw);
		const b = tryParseSteamId(bRaw);
		if (!a || !b) {
			throw error(400, 'One of the SteamIDs is invalid.');
		}
		if (a.steam64 === b.steam64) {
			throw redirect(302, `/mge/players/${a.steam64}${url.search}`);
		}
		throw redirect(302, pairPath(a.steam64, b.steam64, url.search));
	}

	const a = tryParseSteamId(params.steamid);
	const b = tryParseSteamId(params.opponent);
	if (!a || !b) {
		throw error(400, 'One of the SteamIDs is invalid.');
	}

	if (BigInt(a.steam64) > BigInt(b.steam64)) {
		throw redirect(308, pairPath(a.steam64, b.steam64, url.search));
	}

	const sourceId = resolveMgeSourceId(url);
	const adapter = mgeFor(sourceId);
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const versus = loadVersusData(adapter, a, b, { page, pageSize: VERSUS_PAGE_SIZE });

	return {
		sourceId,
		sources: listSources({ capability: 'mgemod', enabled: true }),
		a: a.steam64,
		b: b.steam64,
		page,
		pageSize: VERSUS_PAGE_SIZE,
		versus
	};
};
