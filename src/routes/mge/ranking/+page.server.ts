import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { listSources } from '$lib/server/sources/registry';
import { getSteamProfiles } from '$lib/server/steam-profiles';
import { toSteamId64 } from '$lib/mge/steam-id';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;
const SORT_KEYS = ['rating', 'wins', 'losses', 'games', 'rd'] as const;

export const load: PageServerLoad = ({ url, cookies }) => {
	requireModule('mgemod');
	const sourceId = resolveMgeSourceId(cookies);
	const adapter = mgeFor(sourceId);

	const q = url.searchParams.get('q')?.trim() || undefined;
	const sortKeyParam = url.searchParams.get('sortKey');
	const sortKey = SORT_KEYS.includes(sortKeyParam as never)
		? (sortKeyParam as (typeof SORT_KEYS)[number])
		: 'rating';
	const sortDir = url.searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
	const scope = url.searchParams.get('scope') === 'all' ? 'all' : 'ranked';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

	const leaderboard = adapter
		.getLeaderboard({
			q,
			sortKey,
			sortDir,
			scope,
			take: PAGE_SIZE,
			skip: (page - 1) * PAGE_SIZE
		})
		.then(async (result) => {
			const avatars = await getSteamProfiles(result.items.map((row) => toSteamId64(row.steamid)));
			return {
				...result,
				items: result.items.map((row) => ({
					...row,
					avatarUrl: avatars.get(toSteamId64(row.steamid))?.avatarmedium
				}))
			};
		});

	return {
		sourceId,
		sources: listSources({ capability: 'mgemod', enabled: true }),
		leaderboard,
		filters: { q, sortKey, sortDir, scope, page, pageSize: PAGE_SIZE }
	};
};
