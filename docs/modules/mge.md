# Module: MGE

Player-facing My Gaming ELO (MGEMod) stats.

## Goals

- Rankings, match browser, player profiles, head-to-head.
- Always scoped to **one source** unless a feature explicitly fan-outs.
- Date-range filters for games and derived stats.
- Port the useful analytics from the old panel without Flowbite layout debt.
- On Glicko-2 sources, the public ladder matches MGEMod / mge.tf: only players below the ranked RD bar with enough games.

## Non-goals (v1)

- Cross-source merged leaderboards.
- Treating ratings from different sources as one ladder.
- 2v2 tables.
- Named seasons (use date ranges).

## Capability

Requires source capability: `mgemod`.

Typical tables: `mgemod_stats`, `mgemod_duels` (and later `mgemod_duels_2v2` only if productized).

## Glicko-2

MGEMod can score a source with Elo or Glicko-2 (`mgemod_rating_engine`). The panel never writes ratings. It reads whatever the plugin stored.

`mgemod_stats.rd` / `volatility` are nullable. NULL means Elo (or a schema that predates migration 007). Non-NULL means Glicko-2 is active for that row. Adapters probe `information_schema` before selecting those columns so Elo-only MariaDB installs keep working.

Public-ladder rule, matching MGEMod `Rating_IsRankQualified` and mge-platform:

- `rd IS NULL` (Elo) **or** (`rd < 100` and `wins + losses >= 10`)
- Provisional HUD mark (not the ladder gate) is `rd > 200`

Home “Top players” and `/mge/ranking` default to this filter. `/mge/ranking?scope=all` is the raw-rating list (the old panel sort). Profiles always show the player; on Glicko-2 they also show RD, ranked/unranked/provisional, ranked position when qualified, and raw position by rating.

## Name encoding

Player display names live only in `mgemod_stats.name` (duels store SteamIDs). Historical rows may contain Windows-1252 mojibake from MySQL connections that were not `utf8mb4`.

- **Read path:** adapters run `maybeFixMojibake` (`src/lib/mge/mojibake.ts`) on names and duel map/arena strings so the UI can still show recoverable garbled rows. The heuristic also accepts Latin-1 C1 controls (`U+0080` to `U+009F`) that appear in phonetic/small-cap names when UTF-8 was decoded as Latin-1 instead of Windows-1252.
- **Plugin:** MGEMod must call `Database.SetCharset("utf8mb4")` after MySQL connect so new writes stay correct (requires SourceMod 1.10+).
- **One-time repair:** `bun run db:fix-mojibake` dry-runs repairs against every enabled `mgemod` source in the panel SQLite `sources` table (decrypts each stored DSN). Pass `--apply` to write. Override discovery with `--dsn mysql://...` (repeatable).

## User stories

1. As a player, I switch source and see that ladder’s ranking (ranked Glicko-2 players by default when the source uses that engine).
2. As a player, I open a profile by SteamID and see rating, W/L, recent games, and (on Glicko-2) RD plus whether they qualify for the public ladder.
3. As a player, I filter games by arena, player, opponent, and date range.
4. As a player, I compare two players (versus) on one source.
5. As a logged-in player, I jump to my profile on the current source.
6. As a player, I see which other sources also have my steamid (badge only).
7. As a player on someone else’s profile, I open head-to-head against them in one click (“See my stats vs this player”). Logged-out viewers are sent through Steam login and land on the same pair.
8. As a player, I see that profile’s rating over time in the selected window, including peak.
9. As a player, I see how many games that profile played on each TF2 class in the selected window.
10. As a player, I can switch the ranking between ranked (public ladder) and all (raw rating) on a Glicko-2 source.

## Routes (proposed)

| Route                                      | Scope                                                                                                                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                        | Home: recent duels + ranked leaderboard preview + source activity (quick stats, games-over-time) for selected source                                                              |
| `/mge/ranking`                             | Leaderboard. Glicko-2 sources default to `scope=ranked`; `scope=all` shows every player by raw rating. Elo sources ignore scope.                                                  |
| `/mge/games`                               | Match browser                                                                                                                                                                     |
| `/mge/versus`                              | Pick two players; scoreline, dual win-rate bars, per-arena breakdown, full match history                                                                                          |
| `/mge/players/[steamid]`                   | Profile                                                                                                                                                                           |
| `/mge/players/[steamid]/versus/[opponent]` | Same H2H summary + match history, entered via a canonical (lower SteamID64 first) pair                                                                                            |
| `/mge/players/[steamid]/versus/me`         | Alias: requires session (else Steam login with `returnTo`); replaces `me` with the viewer’s Steam64. Either path segment may be `me`. Same-player pair redirects to that profile. |
| `/mge/me`                                  | Redirect to logged-in profile                                                                                                                                                     |

`source` is a cookie (`panel_source`), not a query param. Default = last chosen enabled `mgemod` source, else the first enabled one. Whois search is multi-source and ignores this cookie.

## Adapter surface

```ts
interface MgeAdapter {
	getLeaderboard(
		query: RankQuery
	): Promise<{ items: Sourced<RankRow>[]; total: number; glicko: boolean }>;
	/** Includes `rank`/`totalPlayers`. On Glicko-2, `rank` is among ranked players (null if unranked) and `rawRank` is among everyone. */
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
	/**
	 * Rating samples from `mgemod_duels` ELO columns (read-only; not ELO reversion).
	 * Rows with NULL `*_new_elo` (pre-migration 004) are skipped. Peak/low use the
	 * full set; `series` is downsampled for the chart.
	 */
	getRatingHistory(
		steamid: SteamId,
		opts: { from?: Date; to?: Date; maxPoints?: number }
	): Promise<Sourced<RatingHistory>>;
	/**
	 * Games per TF2 class from `winnerclass` / `loserclass`. Comma-separated
	 * class-change values (`scout,soldier`) count each class in that duel.
	 * Null / empty / `unknown` are skipped.
	 */
	getClassStats(
		steamid: SteamId,
		opts: { from?: Date; to?: Date }
	): Promise<Sourced<ClassStatRow>[]>;
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

interface RatingPoint {
	at: Date;
	rating: number;
}

interface RatingHistory {
	series: RatingPoint[]; // chronological; long windows are last-per-day, then capped
	peak: RatingPoint | null;
	low: RatingPoint | null;
	samples: number; // duels with ELO before downsample
}

interface ClassStatRow {
	classId: string; // scout, soldier, pyro, demoman, heavy, engineer, medic, sniper, spy
	wins: number;
	losses: number;
	matches: number;
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

Profile CTA “See my stats vs this player” links to the pair route (logged in) or Steam login with `returnTo` the `versus/me` alias (logged out). Hidden on the viewer’s own profile. The versus picker prefills Player A with the session Steam64 when that field is empty.

The pair URL stays lower-Steam64-first. If the viewer is one of the two players, the H2H UI paints them on the left (success) and the match table uses that Steam64 as `perspective`.

## Time filters

- Presets: 7 / 30 / 90 days, all-time.
- Custom `from` / `to` (inclusive bounds documented in API).
- Applied to duel `endtime` (unix seconds in legacy schema).
- Leaderboard “all-time” uses `mgemod_stats` as today. Glicko-2 ranked scope still uses that table; it does not reconstruct RD from duels.
- Profile rating-over-time is **derived from duels** (`winner_new_elo` / `loser_new_elo`, plus `*_previous_elo` to seed the first point). Read-only. This is not ELO reversion and does not write rating tables. Peak/low are computed on the full window. The chart line uses last-per-day on long windows so play-session clusters do not scribble, then downsamples for the SVG.

## Arena names

Keep canonicalization from the old panel (strip numbered clones / tags like `[1v1 MGE]` for grouping) inside the MGE domain helper, shared by all sources.

## Multi-source (limited)

Allowed in M2:

- `exists` fan-out → “Also on: Argentina, Brasil” on profile.
- Optional combined **match history** view that concatenates duels from multiple sources, each row tagged with `sourceId`, sorted by time. Must not mix into one rating number.

Forbidden until productized:

- Single ranking table sorting ratings from mixed sources without labeling separate ladders.

## Permissions

| Action                       | Role                           |
| ---------------------------- | ------------------------------ |
| Read rankings/games/profiles | Public                         |
| `/mge/me`                    | Authenticated                  |
| `/versus/me` alias           | Authenticated (login redirect) |

## Acceptance checks

- Same UI works for any configured `mgemod` source.
- Glicko-2 home/ranking default lists match mge.tf (RD < 100, 10+ games). Elo sources still list everyone by rating.
- A source without `rd`/`volatility` columns does not 500; it behaves as Elo.
- Versus and games filters never leak rows from another source.
- Profile badges call only `exists` on other sources; failure on one source does not blank the page.
- Ranking, games, profile, and versus paint skeletons on entry, then swap in data (see [loading.md](./loading.md)).
- Profile versus CTA opens H2H without typing SteamIDs (login first when logged out).
- Rating chart and class stats skip NULL pre-migration duel rows; peak is from the full series, not the downsampled line.
