import { getSteamProfiles } from '$lib/server/steam-profiles';
import { toSteamId64 } from '$lib/mge/steam-id';
import type { Duel } from '$lib/server/sources/mgemod/types';
import type { Sourced } from '$lib/server/sources/types';

export type DuelWithAvatars = Sourced<Duel> & {
	winnerAvatarUrl?: string;
	loserAvatarUrl?: string;
};

function safeSteamId64(steamid2: string): string | null {
	try {
		return toSteamId64(steamid2);
	} catch {
		return null;
	}
}

/** Enriches a page of duels with winner/loser Steam avatars via one batched lookup. */
export async function withDuelAvatars<T extends { items: Sourced<Duel>[] }>(
	result: T
): Promise<Omit<T, 'items'> & { items: DuelWithAvatars[] }> {
	const steam64Ids = Array.from(
		new Set(
			result.items
				.flatMap((duel) => [duel.winner, duel.loser])
				.filter(Boolean)
				.map(safeSteamId64)
				.filter((id): id is string => Boolean(id))
		)
	);
	const avatars = await getSteamProfiles(steam64Ids);

	function avatarFor(steamid2: string): string | undefined {
		const steam64 = safeSteamId64(steamid2);
		return steam64 ? avatars.get(steam64)?.avatarmedium : undefined;
	}

	return {
		...result,
		items: result.items.map((duel) => ({
			...duel,
			winnerAvatarUrl: avatarFor(duel.winner),
			loserAvatarUrl: avatarFor(duel.loser)
		}))
	};
}
