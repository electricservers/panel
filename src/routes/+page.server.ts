import { listSources } from '$lib/server/sources/registry';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { getSteamProfiles } from '$lib/server/steam-profiles';
import { withDuelAvatars } from '$lib/server/duel-avatars';
import { toSteamId64 } from '$lib/mge/steam-id';
import type { PageServerLoad } from './$types';

const TRENDING_ARENAS_TAKE = 8;
const TRENDING_ARENAS_DEFAULT_DAYS = 7;
const SOURCE_ACTIVITY_DEFAULT_DAYS = 7;

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const { moduleToggles } = await parent();
	const mgeEnabled = moduleToggles.some(
		(toggle) => toggle.capability === 'mgemod' && toggle.enabled
	);

	const mgeSources = mgeEnabled ? listSources({ capability: 'mgemod', enabled: true }) : [];
	if (mgeSources.length === 0) {
		return {
			mgeEnabled,
			sourceId: null as string | null,
			leaderboard: null,
			recentGames: null,
			trendingArenas: null,
			sourceActivity: null
		};
	}

	const sourceId = resolveMgeSourceId(cookies);
	const adapter = mgeFor(sourceId);

	const leaderboard = adapter.getLeaderboard({ take: 5 }).then(async (result) => {
		const avatars = await getSteamProfiles(result.items.map((row) => toSteamId64(row.steamid)));
		return {
			...result,
			items: result.items.map((row) => ({
				...row,
				avatarUrl: avatars.get(toSteamId64(row.steamid))?.avatarmedium
			}))
		};
	});
	const recentGames = adapter.getGames({ take: 5 }).then(withDuelAvatars);
	const trendingArenas = adapter.getTrendingArenas({
		take: TRENDING_ARENAS_TAKE,
		from: new Date(Date.now() - TRENDING_ARENAS_DEFAULT_DAYS * 24 * 60 * 60 * 1000)
	});
	const sourceActivity = adapter.getSourceActivity({
		from: new Date(Date.now() - SOURCE_ACTIVITY_DEFAULT_DAYS * 24 * 60 * 60 * 1000)
	});

	return { mgeEnabled, sourceId, leaderboard, recentGames, trendingArenas, sourceActivity };
};
