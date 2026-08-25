import { error, json } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { getSteamProfiles } from '$lib/server/steam-profiles';
import { toSteamId64, tryParseSteamId } from '$lib/mge/steam-id';
import { parseDateRange } from '$lib/mge/date-range';
import { resolveTimeZone, TIMEZONE_COOKIE } from '$lib/mge/activity';
import { requireModule } from '$lib/server/require-module';
import type { RequestHandler } from './$types';

const TOP_FOES_TAKE = 5;
const ARENAS_TAKE = 5;

/**
 * Backs the profile's day-preset chips: re-fetches only the stats cluster
 * (top foes, activity, most-played arenas, rating history, class stats) for a
 * window, so the player header and recent games stay mounted while this
 * section re-skeletons.
 */
export const GET: RequestHandler = async ({ params, url, cookies }) => {
	requireModule('mgemod');
	const parsed = tryParseSteamId(params.steamid);
	if (!parsed) {
		error(400, `"${params.steamid}" is not a valid SteamID.`);
	}

	const sourceId = resolveMgeSourceId(cookies);
	const adapter = mgeFor(sourceId);
	const { from, to } = parseDateRange(url);

	const [foes, activity, mostPlayedArenas, ratingHistory, classStats] = await Promise.all([
		adapter.getTopFoes(parsed.steam2, { take: TOP_FOES_TAKE, from, to }),
		adapter.getActivity(parsed.steam2, {
			from,
			to,
			timeZone: resolveTimeZone(url.searchParams.get('tz') ?? cookies.get(TIMEZONE_COOKIE))
		}),
		adapter.getMostPlayedArenas(parsed.steam2, { take: ARENAS_TAKE, from, to }),
		adapter.getRatingHistory(parsed.steam2, { from, to }),
		adapter.getClassStats(parsed.steam2, { from, to })
	]);

	const avatars = await getSteamProfiles(foes.map((foe) => toSteamId64(foe.steamid)));
	const topFoes = foes.map((foe) => ({
		...foe,
		avatarUrl: avatars.get(toSteamId64(foe.steamid))?.avatarmedium
	}));

	return json({ topFoes, activity, mostPlayedArenas, ratingHistory, classStats });
};
