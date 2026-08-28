import type { Sourced } from '$lib/server/sources/types';
import type { SteamId } from '$lib/mge/steam-id';
import type { ActivitySummary } from '$lib/mge/activity';
import type { GlickoStatus, LeaderboardScope } from '$lib/mge/glicko';

export type { ActivitySummary };

export type RankQuery = {
	q?: string;
	sortKey?: 'rating' | 'wins' | 'losses' | 'games' | 'rd';
	sortDir?: 'asc' | 'desc';
	skip?: number;
	take?: number;
	/** Ranked is the public Glicko-2 ladder. Elo sources ignore this. */
	scope?: LeaderboardScope;
};

export type RankRow = {
	steamid: SteamId;
	name: string;
	rating: number;
	wins: number;
	losses: number;
	lastPlayed: Date | null;
	totalGames: number;
	winRate: number;
	rd: number | null;
	volatility: number | null;
	status: GlickoStatus;
};

export type PlayerSummary = {
	steamid: SteamId;
	name: string;
	rating: number;
	wins: number;
	losses: number;
	lastPlayed: Date | null;
	/** 1-based position on the public (ranked) ladder. Null when the player is not qualified. */
	rank: number | null;
	/** Players currently on the public ladder (everyone, on Elo). */
	totalRanked: number;
	/** 1-based position by raw rating among every player on this source. */
	rawRank: number;
	totalPlayers: number;
	rd: number | null;
	volatility: number | null;
	status: GlickoStatus;
};

export type GamesQuery = {
	/** Filter to games involving this player. */
	steamid?: SteamId;
	/** Combined with `steamid` to select head-to-head games between the two. */
	opponent?: SteamId;
	/** Only meaningful when `steamid` is set: win/loss relative to that player. */
	outcome?: 'win' | 'loss';
	/** Matched against the canonical grouping of `arenaname`, not the raw value. */
	arena?: string;
	/** Free-text search: player name, or a SteamID2/64 if it looks like one. */
	q?: string;
	from?: Date;
	to?: Date;
	skip?: number;
	take?: number;
};

export type Duel = {
	id: number;
	winner: SteamId;
	winnerName: string;
	loser: SteamId;
	loserName: string;
	winnerScore: number | null;
	loserScore: number | null;
	winLimit: number | null;
	startedAt: Date | null;
	endedAt: Date;
	mapName: string | null;
	arenaName: string | null;
	arenaNameCanonical: string;
	winnerClass: string | null;
	loserClass: string | null;
};

export type FoeRow = {
	steamid: SteamId;
	name: string;
	wins: number;
	losses: number;
	matches: number;
};

export type ArenaStatRow = {
	arena: string;
	wins: number;
	losses: number;
	matches: number;
};

export type TrendingArenaRow = {
	arena: string;
	matches: number;
	/** 0..1 share of the window total. */
	share: number;
};

export type SourceActivity = {
	games: number;
	/** Distinct winner ∪ loser in the window. */
	activePlayers: number;
	/** Distinct canonicalized arena names in the window. */
	arenasPlayed: number;
	/** Zero-filled, chronological. */
	series: { label: string; count: number }[];
	/** `hour` when the window is <= 36h, else `day`. */
	granularity: 'hour' | 'day';
};

export type RatingPoint = {
	at: Date;
	rating: number;
};

export type RatingHistory = {
	series: RatingPoint[];
	peak: RatingPoint | null;
	low: RatingPoint | null;
	/** Duels with ELO before downsample. */
	samples: number;
};

export type ClassStatRow = {
	classId: string;
	wins: number;
	losses: number;
	matches: number;
};

export interface MgeAdapter {
	getLeaderboard(
		query: RankQuery
	): Promise<{ items: Sourced<RankRow>[]; total: number; glicko: boolean }>;
	getPlayer(steamid: SteamId): Promise<Sourced<PlayerSummary> | null>;
	getGames(query: GamesQuery): Promise<{ items: Sourced<Duel>[]; total: number }>;
	getArenas(): Promise<string[]>;
	exists(steamid: SteamId): Promise<boolean>;
	getTopFoes(
		steamid: SteamId,
		opts: { take: number; from?: Date; to?: Date }
	): Promise<Sourced<FoeRow>[]>;
	getActivity(
		steamid: SteamId,
		opts: { from?: Date; to?: Date; timeZone?: string }
	): Promise<Sourced<ActivitySummary>>;
	getMostPlayedArenas(
		steamid: SteamId,
		opts: { take: number; from?: Date; to?: Date }
	): Promise<Sourced<ArenaStatRow>[]>;
	getTrendingArenas(opts: {
		take: number;
		from?: Date;
		to?: Date;
	}): Promise<Sourced<TrendingArenaRow>[]>;
	getSourceActivity(opts: { from: Date; to?: Date }): Promise<Sourced<SourceActivity>>;
	getRatingHistory(
		steamid: SteamId,
		opts: { from?: Date; to?: Date; maxPoints?: number }
	): Promise<Sourced<RatingHistory>>;
	getClassStats(
		steamid: SteamId,
		opts: { from?: Date; to?: Date }
	): Promise<Sourced<ClassStatRow>[]>;
}
