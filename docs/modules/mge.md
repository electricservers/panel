# Module: MGE

Player-facing My Gaming ELO (MGEMod) stats.

## Goals

- Rankings, match browser, player profiles, head-to-head.
- Always scoped to **one source** unless a feature explicitly fan-outs.
- Date-range filters for games and derived stats.
- Port the useful analytics from the old panel without Flowbite layout debt.

## Non-goals (v1)

- Cross-source merged leaderboards.
- Treating ratings from different sources as one ladder.
- 2v2 tables.
- Named seasons (use date ranges).

## Capability

Requires source capability: `mgemod`.

Typical tables: `mgemod_stats`, `mgemod_duels` (and later `mgemod_duels_2v2` only if productized).

## User stories

1. As a player, I switch source and see that ladder’s ranking.
2. As a player, I open a profile by SteamID and see rating, W/L, recent games.
3. As a player, I filter games by arena, player, opponent, and date range.
4. As a player, I compare two players (versus) on one source.
5. As a logged-in player, I jump to my profile on the current source.
6. As a player, I see which other sources also have my steamid (badge only).

## Routes (proposed)

| Route                                      | Scope                                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `/`                                        | Home: recent duels + ranking preview + source activity (quick stats, games-over-time) for selected source |
| `/mge/ranking`                             | Leaderboard                                                                                               |
| `/mge/games`                               | Match browser                                                                                             |
| `/mge/versus`                              | Pick two players; scoreline, dual win-rate bars, per-arena breakdown, full match history                  |
| `/mge/players/[steamid]`                   | Profile                                                                                                   |
| `/mge/players/[steamid]/versus/[opponent]` | Same H2H summary + match history, entered via a canonical (lower SteamID64 first) pair                    |
| `/mge/me`                                  | Redirect to logged-in profile                                                                             |

`source` via query or layout state; default = last used enabled `mgemod` source.

## Adapter surface

```ts
interface MgeAdapter {
	getLeaderboard(query: RankQuery): Promise<Sourced<RankRow>[]>;
	/** Includes `rank`/`totalPlayers`, this player's 1-based position on the rating leaderboard. */
	getPlayer(steamid: SteamId): Promise<Sourced<PlayerSummary> | null>;
	getGames(query: GamesQuery): Promise<{ items: Sourced<Duel>[]; total: number }>;
	getArenas(): Promise<string[]>;
	/** `mgemod_stats` row exists for this SteamID. Backs presence badges. */
	exists(steamid: SteamId): Promise<boolean>;
	/** Opponents faced, merged across wins-as-winner and wins-as-loser, sorted by matches desc. */
	getTopFoes(
		steamid: SteamId,
		opts: { take: number; from?: Date; to?: Date }
	): Promise<Sourced<FoeRow>[]>;
	/** Duel `endtime`s bucketed server-side into weekday/hour histograms. */
	getActivity(
		steamid: SteamId,
		opts: { from?: Date; to?: Date }
	): Promise<Sourced<ActivitySummary>>;
	/** This player's arenas, canonicalized and merged by name, sorted by matches desc. */
	getMostPlayedArenas(
		steamid: SteamId,
		opts: { take: number; from?: Date; to?: Date }
	): Promise<Sourced<ArenaStatRow>[]>;
	/** Source-wide arena popularity in a window, canonicalized, with share of window total. */
	getTrendingArenas(opts: {
		take: number;
		from?: Date;
		to?: Date;
	}): Promise<Sourced<TrendingArenaRow>[]>;
	/** Source-wide games/active players/arenas in a window, plus a zero-filled time series for a chart. */
	getSourceActivity(opts: { from: Date; to?: Date }): Promise<Sourced<SourceActivity>>;
}
```

DTOs added in M2:

```ts
interface FoeRow {
	steamid: SteamId;
	name: string | null;
	wins: number;
	losses: number;
	matches: number;
}

interface ActivitySummary {
	/** Sun=0..Sat=6, UI renders Mon-first. */
	byWeekday: number[]; // length 7
	byHour: number[]; // length 24
}

interface ArenaStatRow {
	arena: string; // canonicalized name
	wins: number;
	losses: number;
	matches: number;
}

interface TrendingArenaRow {
	arena: string; // canonicalized name
	matches: number;
	share: number; // 0..1 of the window total
}

interface SourceActivity {
	games: number;
	activePlayers: number; // distinct winner ∪ loser in the window
	arenasPlayed: number; // distinct canonicalized arena names in the window
	series: { label: string; count: number }[]; // zero-filled, chronological
	granularity: 'hour' | 'day'; // 'hour' when window <= 36h, else 'day'
}
```

Queries accept normalized SteamIDs. Adapters translate to the DB’s stored format (typically Steam2).

## Versus summary

Both versus routes call `loadVersusData(adapter, a, b, { page })` (`src/lib/server/versus-summary.ts`), a route-layer helper, not an adapter method: it runs `getPlayer` for each side, a paginated `getGames` page (25 per page) for the match table, and a separate full H2H fetch (capped at 10k) for the scoreline aggregation:

```ts
interface VersusSummary {
	aWins: number;
	bWins: number;
	matches: number;
	lastPlayed: Date | null;
	arenas: { arena: string; aWins: number; bWins: number; matches: number }[]; // matches desc
}
```

`summary` is `null` when the pair has never played; each side reports `exists` so the UI can distinguish "unknown player" from "never played". SteamID inputs also accept a `steamcommunity.com/profiles/<id64>` URL (see `tryParseSteamId` in `src/lib/mge/steam-id.ts`).

## Time filters

- Presets: 7 / 30 / 90 days, all-time.
- Custom `from` / `to` (inclusive bounds documented in API).
- Applied to duel `endtime` (unix seconds in legacy schema).
- Leaderboard “all-time” uses `mgemod_stats` as today; period-specific ratings are **derived from duels** only if we add that feature later (not required for M1).

## Arena names

Keep canonicalization from the old panel (strip numbered clones / tags like `[1v1 MGE]` for grouping) inside the MGE domain helper, shared by all sources.

## Multi-source (limited)

Allowed in M2:

- `exists` fan-out → “Also on: Argentina, Brasil” on profile.
- Optional combined **match history** view that concatenates duels from multiple sources, each row tagged with `sourceId`, sorted by time. Must not mix into one rating number.

Forbidden until productized:

- Single ranking table sorting ratings from mixed sources without labeling separate ladders.

## Permissions

| Action                       | Role          |
| ---------------------------- | ------------- |
| Read rankings/games/profiles | Public        |
| `/mge/me`                    | Authenticated |

## Acceptance checks

- Same UI works for any configured `mgemod` source.
- Versus and games filters never leak rows from another source.
- Profile badges call only `exists` on other sources; failure on one source does not blank the page.
- Ranking, games, profile, and versus paint skeletons on entry, then swap in data (see [loading.md](./loading.md)).
