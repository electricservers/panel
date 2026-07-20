import { and, asc, desc, eq, gt, gte, inArray, like, lte, or, sql, type SQL } from 'drizzle-orm';
import { canonicalizeArenaName } from '$lib/mge/arena-names';
import { maybeFixMojibake } from '$lib/mge/mojibake';
import { looksLikeSteamId, toSteamId2, tryParseSteamId } from '$lib/mge/steam-id';
import type { Source } from '$lib/server/sources/types';
import type { Sourced } from '$lib/server/sources/types';
import { getMgemodDb } from './client';
import { mgemodDuels, mgemodStats } from './schema';
import type {
	ActivitySummary,
	ArenaStatRow,
	Duel,
	FoeRow,
	GamesQuery,
	MgeAdapter,
	PlayerSummary,
	RankQuery,
	RankRow,
	SourceActivity,
	TrendingArenaRow
} from './types';

function toDate(unixSeconds: number | string | null | undefined): Date | null {
	const n = Number(unixSeconds);
	return n > 0 ? new Date(n * 1000) : null;
}

function toUnixSeconds(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

function displayName(raw: string | null | undefined, steamid: string): string {
	return maybeFixMojibake(raw) || `Unknown (${steamid})`;
}

/** Builds an `MgeAdapter` backed by a source's MySQL `mgemod_stats`/`mgemod_duels` tables. */
export function buildMgeAdapter(source: Source): MgeAdapter {
	const db = getMgemodDb(source);

	function tag<T>(data: T): Sourced<T> {
		return { ...data, sourceId: source.id };
	}

	/** Resolves a free-text `q` to a set of matching steamid2s, or null if `q` is empty. */
	async function resolveNameOrIdFilter(q: string): Promise<string[]> {
		if (looksLikeSteamId(q)) {
			const parsed = tryParseSteamId(q);
			return parsed ? [parsed.steam2] : [];
		}
		const rows = await db
			.select({ steamid: mgemodStats.steamid })
			.from(mgemodStats)
			.where(like(mgemodStats.name, `%${q}%`));
		return rows.map((row) => row.steamid);
	}

	/** Expands a canonical arena name to the raw `arenaname` variants it groups. */
	async function resolveArenaVariants(canonical: string): Promise<string[]> {
		const rows = await db.selectDistinct({ arenaname: mgemodDuels.arenaname }).from(mgemodDuels);
		return rows
			.map((row) => row.arenaname)
			.filter((value): value is string => Boolean(value))
			.filter((value) => canonicalizeArenaName(value) === canonical);
	}

	async function buildGamesWhere(query: GamesQuery): Promise<SQL | undefined> {
		const conditions: SQL[] = [];

		if (query.steamid && query.opponent) {
			const a = toSteamId2(query.steamid);
			const b = toSteamId2(query.opponent);
			conditions.push(
				or(
					and(eq(mgemodDuels.winner, a), eq(mgemodDuels.loser, b))!,
					and(eq(mgemodDuels.winner, b), eq(mgemodDuels.loser, a))!
				)!
			);
		} else if (query.steamid) {
			const id2 = toSteamId2(query.steamid);
			if (query.outcome === 'win') {
				conditions.push(eq(mgemodDuels.winner, id2));
			} else if (query.outcome === 'loss') {
				conditions.push(eq(mgemodDuels.loser, id2));
			} else {
				conditions.push(or(eq(mgemodDuels.winner, id2), eq(mgemodDuels.loser, id2))!);
			}
		}

		if (query.q) {
			const ids = await resolveNameOrIdFilter(query.q);
			if (ids.length === 0) {
				conditions.push(sql`false`);
			} else if (query.outcome === 'win') {
				conditions.push(inArray(mgemodDuels.winner, ids));
			} else if (query.outcome === 'loss') {
				conditions.push(inArray(mgemodDuels.loser, ids));
			} else {
				conditions.push(or(inArray(mgemodDuels.winner, ids), inArray(mgemodDuels.loser, ids))!);
			}
		}

		if (query.arena) {
			const canonical = canonicalizeArenaName(query.arena);
			const variants = await resolveArenaVariants(canonical);
			conditions.push(
				variants.length > 0
					? inArray(mgemodDuels.arenaname, variants)
					: eq(mgemodDuels.arenaname, canonical)
			);
		}

		if (query.from) conditions.push(gte(mgemodDuels.endtime, toUnixSeconds(query.from)));
		if (query.to) conditions.push(lte(mgemodDuels.endtime, toUnixSeconds(query.to)));

		return conditions.length > 0 ? and(...conditions) : undefined;
	}

	function dateWindow(from?: Date, to?: Date): SQL[] {
		const conditions: SQL[] = [];
		if (from) conditions.push(gte(mgemodDuels.endtime, toUnixSeconds(from)));
		if (to) conditions.push(lte(mgemodDuels.endtime, toUnixSeconds(to)));
		return conditions;
	}

	async function enrichNames(steamids: string[]): Promise<Map<string, string>> {
		if (steamids.length === 0) return new Map();
		const rows = await db
			.select({ steamid: mgemodStats.steamid, name: mgemodStats.name })
			.from(mgemodStats)
			.where(inArray(mgemodStats.steamid, steamids));
		return new Map(rows.map((row) => [row.steamid, maybeFixMojibake(row.name) ?? '']));
	}

	return {
		async getLeaderboard(query: RankQuery) {
			const take = query.take ?? 250;
			const skip = query.skip ?? 0;
			const sortDir = query.sortDir ?? 'desc';
			const sortKey = query.sortKey ?? 'rating';

			let where: SQL | undefined;
			if (query.q) {
				const parsed = looksLikeSteamId(query.q) ? tryParseSteamId(query.q) : null;
				where = parsed
					? eq(mgemodStats.steamid, parsed.steam2)
					: like(mgemodStats.name, `%${query.q}%`);
			}

			const sortColumn =
				sortKey === 'games'
					? sql`COALESCE(${mgemodStats.wins}, 0) + COALESCE(${mgemodStats.losses}, 0)`
					: sortKey === 'wins'
						? mgemodStats.wins
						: sortKey === 'losses'
							? mgemodStats.losses
							: mgemodStats.rating;
			const orderBy = sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

			const [rows, [{ total }]] = await Promise.all([
				db.select().from(mgemodStats).where(where).orderBy(orderBy).limit(take).offset(skip),
				db
					.select({ total: sql<number>`count(*)` })
					.from(mgemodStats)
					.where(where)
			]);

			const items = rows.map((row) => {
				const wins = row.wins ?? 0;
				const losses = row.losses ?? 0;
				const totalGames = wins + losses;
				const rankRow: RankRow = {
					steamid: row.steamid,
					name: displayName(row.name, row.steamid),
					rating: row.rating ?? 0,
					wins,
					losses,
					lastPlayed: toDate(row.lastplayed),
					totalGames,
					winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0
				};
				return tag(rankRow);
			});

			return { items, total: Number(total) };
		},

		async getPlayer(steamid) {
			const id2 = toSteamId2(steamid);
			const [row] = await db
				.select()
				.from(mgemodStats)
				.where(eq(mgemodStats.steamid, id2))
				.limit(1);
			if (!row) return null;

			const [[{ ahead }], [{ total }]] = await Promise.all([
				db
					.select({ ahead: sql<number>`count(*)` })
					.from(mgemodStats)
					.where(gt(mgemodStats.rating, row.rating ?? 0)),
				db.select({ total: sql<number>`count(*)` }).from(mgemodStats)
			]);

			const summary: PlayerSummary = {
				steamid: row.steamid,
				name: displayName(row.name, row.steamid),
				rating: row.rating ?? 0,
				wins: row.wins ?? 0,
				losses: row.losses ?? 0,
				lastPlayed: toDate(row.lastplayed),
				rank: Number(ahead) + 1,
				totalPlayers: Number(total)
			};
			return tag(summary);
		},

		async getGames(query: GamesQuery) {
			const take = query.take ?? 50;
			const skip = query.skip ?? 0;
			const where = await buildGamesWhere(query);

			const [rows, [{ total }]] = await Promise.all([
				db
					.select()
					.from(mgemodDuels)
					.where(where)
					.orderBy(desc(mgemodDuels.id))
					.limit(take)
					.offset(skip),
				db
					.select({ total: sql<number>`count(*)` })
					.from(mgemodDuels)
					.where(where)
			]);

			const steamids = Array.from(
				new Set(
					rows.flatMap((row) => [row.winner, row.loser]).filter((id): id is string => Boolean(id))
				)
			);
			const names = await enrichNames(steamids);

			const items = rows.map((row) => {
				const duel: Duel = {
					id: row.id,
					winner: row.winner ?? '',
					winnerName: row.winner ? names.get(row.winner) || `Unknown (${row.winner})` : 'Unknown',
					loser: row.loser ?? '',
					loserName: row.loser ? names.get(row.loser) || `Unknown (${row.loser})` : 'Unknown',
					winnerScore: row.winnerscore !== null ? Number(row.winnerscore) : null,
					loserScore: row.loserscore !== null ? Number(row.loserscore) : null,
					winLimit: row.winlimit !== null ? Number(row.winlimit) : null,
					startedAt: toDate(row.starttime),
					endedAt: toDate(row.endtime) ?? new Date(0),
					mapName: maybeFixMojibake(row.mapname),
					arenaName: maybeFixMojibake(row.arenaname),
					arenaNameCanonical: canonicalizeArenaName(row.arenaname),
					winnerClass: row.winnerclass,
					loserClass: row.loserclass
				};
				return tag(duel);
			});

			return { items, total: Number(total) };
		},

		async exists(steamid) {
			const id2 = toSteamId2(steamid);
			const [row] = await db
				.select({ steamid: mgemodStats.steamid })
				.from(mgemodStats)
				.where(eq(mgemodStats.steamid, id2))
				.limit(1);
			return Boolean(row);
		},

		async getTopFoes(steamid, opts) {
			const id2 = toSteamId2(steamid);
			const window = dateWindow(opts.from, opts.to);

			const [winsAsWinner, winsAsLoser] = await Promise.all([
				db
					.select({ opponent: mgemodDuels.loser, count: sql<number>`count(*)` })
					.from(mgemodDuels)
					.where(and(eq(mgemodDuels.winner, id2), ...window))
					.groupBy(mgemodDuels.loser),
				db
					.select({ opponent: mgemodDuels.winner, count: sql<number>`count(*)` })
					.from(mgemodDuels)
					.where(and(eq(mgemodDuels.loser, id2), ...window))
					.groupBy(mgemodDuels.winner)
			]);

			const byOpponent = new Map<string, { wins: number; losses: number }>();
			for (const row of winsAsWinner) {
				if (!row.opponent) continue;
				byOpponent.set(row.opponent, { wins: Number(row.count), losses: 0 });
			}
			for (const row of winsAsLoser) {
				if (!row.opponent) continue;
				const existing = byOpponent.get(row.opponent) ?? { wins: 0, losses: 0 };
				existing.losses = Number(row.count);
				byOpponent.set(row.opponent, existing);
			}

			const names = await enrichNames(Array.from(byOpponent.keys()));

			const foes: FoeRow[] = Array.from(byOpponent.entries())
				.map(([opponentId, { wins, losses }]) => ({
					steamid: opponentId,
					name: names.get(opponentId) || `Unknown (${opponentId})`,
					wins,
					losses,
					matches: wins + losses
				}))
				.sort((a, b) => b.matches - a.matches)
				.slice(0, opts.take);

			return foes.map(tag);
		},

		async getActivity(steamid, opts) {
			const id2 = toSteamId2(steamid);
			const window = dateWindow(opts.from, opts.to);

			const rows = await db
				.select({ endtime: mgemodDuels.endtime })
				.from(mgemodDuels)
				.where(and(or(eq(mgemodDuels.winner, id2), eq(mgemodDuels.loser, id2)), ...window));

			const byWeekday = new Array(7).fill(0);
			const byHour = new Array(24).fill(0);
			for (const row of rows) {
				const date = toDate(row.endtime);
				if (!date) continue;
				byWeekday[date.getUTCDay()]++;
				byHour[date.getUTCHours()]++;
			}

			const summary: ActivitySummary = { byWeekday, byHour };
			return tag(summary);
		},

		async getMostPlayedArenas(steamid, opts) {
			const id2 = toSteamId2(steamid);
			const window = dateWindow(opts.from, opts.to);

			const rows = await db
				.select({ arenaname: mgemodDuels.arenaname, winner: mgemodDuels.winner })
				.from(mgemodDuels)
				.where(and(or(eq(mgemodDuels.winner, id2), eq(mgemodDuels.loser, id2)), ...window));

			const byArena = new Map<string, { wins: number; losses: number }>();
			for (const row of rows) {
				const canonical = canonicalizeArenaName(row.arenaname);
				if (!canonical) continue;
				const existing = byArena.get(canonical) ?? { wins: 0, losses: 0 };
				if (row.winner === id2) existing.wins++;
				else existing.losses++;
				byArena.set(canonical, existing);
			}

			const arenas: ArenaStatRow[] = Array.from(byArena.entries())
				.map(([arena, { wins, losses }]) => ({ arena, wins, losses, matches: wins + losses }))
				.sort((a, b) => b.matches - a.matches)
				.slice(0, opts.take);

			return arenas.map(tag);
		},

		async getTrendingArenas(opts) {
			const window = dateWindow(opts.from, opts.to);

			const rows = await db
				.select({ arenaname: mgemodDuels.arenaname })
				.from(mgemodDuels)
				.where(window.length > 0 ? and(...window) : undefined);

			const counts = new Map<string, number>();
			let total = 0;
			for (const row of rows) {
				const canonical = canonicalizeArenaName(row.arenaname);
				if (!canonical) continue;
				counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
				total++;
			}

			const arenas: TrendingArenaRow[] = Array.from(counts.entries())
				.map(([arena, matches]) => ({ arena, matches, share: total > 0 ? matches / total : 0 }))
				.sort((a, b) => b.matches - a.matches)
				.slice(0, opts.take);

			return arenas.map(tag);
		},

		async getSourceActivity(opts) {
			const window = dateWindow(opts.from, opts.to);
			const to = opts.to ?? new Date();

			const rows = await db
				.select({
					winner: mgemodDuels.winner,
					loser: mgemodDuels.loser,
					arenaname: mgemodDuels.arenaname,
					endtime: mgemodDuels.endtime
				})
				.from(mgemodDuels)
				.where(and(...window));

			const activePlayers = new Set<string>();
			const arenas = new Set<string>();
			for (const row of rows) {
				if (row.winner) activePlayers.add(row.winner);
				if (row.loser) activePlayers.add(row.loser);
				const canonical = canonicalizeArenaName(row.arenaname);
				if (canonical) arenas.add(canonical);
			}

			const windowMs = to.getTime() - opts.from.getTime();
			const granularity: SourceActivity['granularity'] =
				windowMs <= 36 * 60 * 60 * 1000 ? 'hour' : 'day';

			const buckets = new Map<string, number>();
			if (granularity === 'hour') {
				for (let h = 0; h < 24; h++) {
					buckets.set(String(h).padStart(2, '0') + ':00', 0);
				}
				for (const row of rows) {
					const date = toDate(row.endtime);
					if (!date) continue;
					const label = String(date.getUTCHours()).padStart(2, '0') + ':00';
					buckets.set(label, (buckets.get(label) ?? 0) + 1);
				}
			} else {
				const dayMs = 24 * 60 * 60 * 1000;
				const startDay = Math.floor(opts.from.getTime() / dayMs);
				const endDay = Math.floor(to.getTime() / dayMs);
				for (let d = startDay; d <= endDay; d++) {
					const label = new Date(d * dayMs).toISOString().slice(0, 10);
					buckets.set(label, 0);
				}
				for (const row of rows) {
					const date = toDate(row.endtime);
					if (!date) continue;
					const label = date.toISOString().slice(0, 10);
					if (buckets.has(label)) {
						buckets.set(label, (buckets.get(label) ?? 0) + 1);
					}
				}
			}

			const activity: SourceActivity = {
				games: rows.length,
				activePlayers: activePlayers.size,
				arenasPlayed: arenas.size,
				series: Array.from(buckets.entries()).map(([label, count]) => ({ label, count })),
				granularity
			};
			return tag(activity);
		},

		async getArenas() {
			const rows = await db.selectDistinct({ arenaname: mgemodDuels.arenaname }).from(mgemodDuels);
			const canonical = new Set<string>();
			for (const row of rows) {
				const name = canonicalizeArenaName(row.arenaname);
				if (name) canonical.add(name);
			}
			return Array.from(canonical).sort((a, b) => a.localeCompare(b));
		}
	};
}
