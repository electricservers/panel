import { error } from '@sveltejs/kit';
import { resolveMgeSourceId } from '$lib/server/sources/resolve-source';
import { mgeFor } from '$lib/server/sources/mge';
import { listSources, fanOut } from '$lib/server/sources/registry';
import { getSteamProfiles } from '$lib/server/steam-profiles';
import { withDuelAvatars } from '$lib/server/duel-avatars';
import { toSteamId64, tryParseSteamId } from '$lib/mge/steam-id';
import { parseDateRange } from '$lib/mge/date-range';
import { resolveTimeZone, TIMEZONE_COOKIE } from '$lib/mge/activity';
import { requireModule } from '$lib/server/require-module';
import type { PageServerLoad } from './$types';

const TOP_FOES_TAKE = 5;
const ARENAS_TAKE = 5;

export const load: PageServerLoad = ({ params, url, cookies }) => {
	requireModule('mgemod');
	const parsed = tryParseSteamId(params.steamid);
	if (!parsed) {
		throw error(400, `"${params.steamid}" is not a valid SteamID.`);
	}

	const sourceId = resolveMgeSourceId(cookies);
	const adapter = mgeFor(sourceId);
	const { from, to } = parseDateRange(url);

	const player = adapter.getPlayer(parsed.steam2).then(async (summary) => {
		if (!summary) return summary;
		const avatars = await getSteamProfiles([parsed.steam64]);
		return { ...summary, avatarUrl: avatars.get(parsed.steam64)?.avatarmedium };
	});
	const games = adapter.getGames({ steamid: parsed.steam2, take: 15 }).then(withDuelAvatars);

	const topFoes = adapter
		.getTopFoes(parsed.steam2, { take: TOP_FOES_TAKE, from, to })
		.then(async (foes) => {
			const avatars = await getSteamProfiles(foes.map((foe) => toSteamId64(foe.steamid)));
			return foes.map((foe) => ({
				...foe,
				avatarUrl: avatars.get(toSteamId64(foe.steamid))?.avatarmedium
			}));
		});
	const activity = adapter.getActivity(parsed.steam2, {
		from,
		to,
		timeZone: resolveTimeZone(url.searchParams.get('tz') ?? cookies.get(TIMEZONE_COOKIE))
	});
	const mostPlayedArenas = adapter.getMostPlayedArenas(parsed.steam2, {
		take: ARENAS_TAKE,
		from,
		to
	});
	const ratingHistory = adapter.getRatingHistory(parsed.steam2, { from, to });
	const classStats = adapter.getClassStats(parsed.steam2, { from, to });

	const otherMgeSources = listSources({ capability: 'mgemod', enabled: true }).filter(
		(source) => source.id !== sourceId
	);
	const presence = fanOut(otherMgeSources, (source) => mgeFor(source.id).exists(parsed.steam2));

	return {
		sourceId,
		sources: listSources({ capability: 'mgemod', enabled: true }),
		steam64: parsed.steam64,
		steam2: parsed.steam2,
		player,
		games,
		topFoes,
		activity,
		mostPlayedArenas,
		ratingHistory,
		classStats,
		presence
	};
};
