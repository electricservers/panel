import { getSteamProfiles } from '$lib/server/steam-profiles';
import { withDuelAvatars, type DuelWithAvatars } from '$lib/server/duel-avatars';
import type { Duel, MgeAdapter } from '$lib/server/sources/mgemod/types';
import type { Sourced } from '$lib/server/sources/types';

/** Cap for the full H2H set used to build the scoreline / arena bars. */
const SUMMARY_TAKE = 10_000;

export const VERSUS_PAGE_SIZE = 25;

type VersusArenaRow = { arena: string; aWins: number; bWins: number; matches: number };

export type VersusSummary = {
	aWins: number;
	bWins: number;
	matches: number;
	lastPlayed: Date | null;
	/** Sorted by matches desc, then arena name. */
	arenas: VersusArenaRow[];
};

export type VersusSide = {
	steam2: string;
	steam64: string;
	name: string;
	avatarUrl?: string;
	exists: boolean;
};

export type VersusData = {
	a: VersusSide;
	b: VersusSide;
	total: number;
	games: DuelWithAvatars[];
	page: number;
	pageSize: number;
	/** `null` when the pair has never played each other. */
	summary: VersusSummary | null;
};

function buildSummary(duels: Sourced<Duel>[], aSteam2: string): VersusSummary | null {
	if (duels.length === 0) return null;

	let aWins = 0;
	let lastPlayed: Date | null = null;
	const byArena = new Map<string, { aWins: number; bWins: number; matches: number }>();

	for (const duel of duels) {
		const isAWin = duel.winner === aSteam2;
		if (isAWin) aWins++;
		if (!lastPlayed || duel.endedAt > lastPlayed) lastPlayed = duel.endedAt;

		const arena = duel.arenaNameCanonical || 'Unknown';
		const entry = byArena.get(arena) ?? { aWins: 0, bWins: 0, matches: 0 };
		if (isAWin) entry.aWins++;
		else entry.bWins++;
		entry.matches++;
		byArena.set(arena, entry);
	}

	const matches = duels.length;
	return {
		aWins,
		bWins: matches - aWins,
		matches,
		lastPlayed,
		arenas: Array.from(byArena.entries())
			.map(([arena, counts]) => ({ arena, ...counts }))
			.sort((x, y) => y.matches - x.matches || x.arena.localeCompare(y.arena))
	};
}

/**
 * Loads everything the Versus page needs for a pair of players on one
 * source: existence + display info for each side, a paginated page of
 * their head-to-head games (with avatars), and an aggregated summary
 * built from the full H2H set (capped at `SUMMARY_TAKE`).
 */
export async function loadVersusData(
	adapter: MgeAdapter,
	a: { steam2: string; steam64: string },
	b: { steam2: string; steam64: string },
	opts: { page?: number; pageSize?: number } = {}
): Promise<VersusData> {
	const pageSize = opts.pageSize ?? VERSUS_PAGE_SIZE;
	const page = Math.max(1, opts.page ?? 1);
	const skip = (page - 1) * pageSize;

	const [playerA, playerB, pageGames, allGames, avatars] = await Promise.all([
		adapter.getPlayer(a.steam2),
		adapter.getPlayer(b.steam2),
		adapter
			.getGames({ steamid: a.steam2, opponent: b.steam2, take: pageSize, skip })
			.then(withDuelAvatars),
		adapter.getGames({ steamid: a.steam2, opponent: b.steam2, take: SUMMARY_TAKE }),
		getSteamProfiles([a.steam64, b.steam64])
	]);

	const sideA: VersusSide = {
		...a,
		name: playerA?.name ?? a.steam64,
		avatarUrl: avatars.get(a.steam64)?.avatarmedium,
		exists: Boolean(playerA)
	};
	const sideB: VersusSide = {
		...b,
		name: playerB?.name ?? b.steam64,
		avatarUrl: avatars.get(b.steam64)?.avatarmedium,
		exists: Boolean(playerB)
	};

	return {
		a: sideA,
		b: sideB,
		total: allGames.total,
		games: pageGames.items,
		page,
		pageSize,
		summary: buildSummary(allGames.items, a.steam2)
	};
}
