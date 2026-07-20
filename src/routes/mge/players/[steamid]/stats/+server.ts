import { error, json } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { getSteamProfiles } from '$lib/server/steam-profiles';
import { toSteamId64, tryParseSteamId } from '$lib/mge/steam-id';
import { parseDateRange } from '$lib/mge/date-range';
import { requireModule } from '$lib/server/require-module';
import type { RequestHandler } from './$types';

const TOP_FOES_TAKE = 5;
const ARENAS_TAKE = 5;

/**
 * Backs the profile's day-preset chips: re-fetches only the stats cluster
 * (top foes, activity, most-played arenas) for a window, so the player
 * header and recent games stay mounted while this section re-skeletons.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	requireModule('mgemod');
	const parsed = tryParseSteamId(params.steamid);
	if (!parsed) {
		error(400, `"${params.steamid}" is not a valid SteamID.`);
	}

	const sourceId = resolveMgeSourceId(url);
	const adapter = mgeFor(sourceId);
	const { from, to } = parseDateRange(url);

	const [foes, activity, mostPlayedArenas] = await Promise.all([
		adapter.getTopFoes(parsed.steam2, { take: TOP_FOES_TAKE, from, to }),
		adapter.getActivity(parsed.steam2, { from, to }),
		adapter.getMostPlayedArenas(parsed.steam2, { take: ARENAS_TAKE, from, to })
	]);

	const avatars = await getSteamProfiles(foes.map((foe) => toSteamId64(foe.steamid)));
	const topFoes = foes.map((foe) => ({
		...foe,
		avatarUrl: avatars.get(toSteamId64(foe.steamid))?.avatarmedium
	}));

	return json({ topFoes, activity, mostPlayedArenas });
};
