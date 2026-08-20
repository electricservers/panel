import { redirect } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { listSources } from '$lib/server/sources/registry';
import { tryParseSteamId } from '$lib/mge/steam-id';
import { loadVersusData, VERSUS_PAGE_SIZE } from '$lib/server/versus-summary';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, locals }) => {
	requireModule('mgemod');
	const sourceId = resolveMgeSourceId(url);
	const adapter = mgeFor(sourceId);

	const aRaw = url.searchParams.get('a')?.trim() || undefined;
	const bRaw = url.searchParams.get('b')?.trim() || undefined;
	const a = aRaw ? tryParseSteamId(aRaw) : null;
	const b = bRaw ? tryParseSteamId(bRaw) : null;
	const invalidInput = Boolean((aRaw && !a) || (bRaw && !b));
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

	if (a && b && BigInt(a.steam64) > BigInt(b.steam64)) {
		const params = new URLSearchParams(url.searchParams);
		params.set('a', b.steam64);
		params.set('b', a.steam64);
		throw redirect(308, `/mge/versus?${params.toString()}`);
	}

	const versus =
		a && b ? loadVersusData(adapter, a, b, { page, pageSize: VERSUS_PAGE_SIZE }) : null;

	return {
		sourceId,
		sources: listSources({ capability: 'mgemod', enabled: true }),
		aInput: aRaw ?? locals.user?.steamId ?? '',
		bInput: bRaw ?? '',
		invalidInput,
		page,
		pageSize: VERSUS_PAGE_SIZE,
		versus
	};
};
