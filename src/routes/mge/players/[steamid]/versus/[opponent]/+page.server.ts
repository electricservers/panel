import { error, redirect } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { listSources } from '$lib/server/sources/registry';
import { tryParseSteamId } from '$lib/mge/steam-id';
import { loadVersusData, VERSUS_PAGE_SIZE } from '$lib/server/versus-summary';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	requireModule('mgemod');
	const a = tryParseSteamId(params.steamid);
	const b = tryParseSteamId(params.opponent);
	if (!a || !b) {
		throw error(400, 'One of the SteamIDs is invalid.');
	}

	if (BigInt(a.steam64) > BigInt(b.steam64)) {
		const query = url.search;
		throw redirect(308, `/mge/players/${b.steam64}/versus/${a.steam64}${query}`);
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
