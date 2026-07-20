# Module: Whois

Staff investigation across connection logs, names, and alt links.

## Goals

- Search players by SteamID, IP, or vanity URL.
- Query **all enabled sources with `whois` capability** by default.
- Show provenance (`sourceId`) on every block of results.
- Support alt linking and permanent names per source (v1).
- Align UI visibility with server-side role checks.

## Non-goals (v1)

- A single global alt graph that writes one canonical main across all DBs.
- Player-facing Whois.
- Assuming Whois exists on every MGE source.
- ELO reversion or any staff tool that mutates MGE ratings.

## Capability

Requires source capability: `whois`.

Typical tables: `whois_logs`, `whois_permname`, `whois_alt_links`.

## User stories

1. As staff, I search a SteamID and see sessions from every whois source that knows them.
2. As staff, I search an IP and see accounts seen on that IP, tagged by source.
3. As staff, I link an alt to a main **on a chosen source**.
4. As staff, a Steam search also surfaces confirmed alt links and scored alt **candidates** (shared IPs + name similarity) per source, so I know who to investigate before linking.

## Routes (proposed)

| Route        | Notes                               |
| ------------ | ----------------------------------- |
| `/whois`     | Search + results (multi-source)     |
| `/whois/alt` | Alt link management (source picker) |

## Adapter surface

```ts
interface WhoisAdapter {
	searchBySteam(steamid: SteamId, opts?: { take?: number }): Promise<WhoisPlayerView | null>;
	searchByIp(ip: string, opts?: { take?: number }): Promise<WhoisIpView>;
	listAltLinks(): Promise<AltLink[]>;
	/**
	 * Throws if `mainSteamId` has no `whois_permname` row, or if `steamid`
	 * already has a permname or an existing alt link (mirrors the `sm_link`
	 * admin command's validation in the whois SourceMod plugin).
	 */
	upsertAltLink(input: AltLinkInput): Promise<void>;
	deleteAltLink(steamid: SteamId): Promise<void>;
	getPermName(steamid: SteamId): Promise<string | null>;
	setPermName(steamid: SteamId, name: string): Promise<void>;
	/**
	 * Advisory alt-candidate scoring for a Steam search: other accounts seen
	 * on the subject's IPs in the window, ranked by shared-IP rarity + name
	 * similarity, plus their confirmed `whois_alt_links` rows. Never mutates
	 * anything; linking still goes through `upsertAltLink`.
	 */
	getAltInvestigation(steamid: SteamId, opts?: { days?: number }): Promise<AltInvestigation>;
}
```

DTOs:

```ts
type WhoisSessionLog = {
	steamid: SteamId;
	name: string | null;
	/** connect | disconnect | namechange | connect-late */
	action: string | null;
	at: Date | null; // `timestamp` if present, else `date`+`time`
	ip: string | null;
	serverIp: string | null;
	serverName: string | null;
};

type WhoisPlayerView = {
	steamid: SteamId;
	permName: string | null;
	knownNames: string[]; // distinct, most recent first
	distinctIps: string[];
	firstSeen: Date | null;
	lastSeen: Date | null;
	sessionCount: number;
	logs: WhoisSessionLog[]; // capped, most recent first
};

type WhoisIpAccount = {
	steamid: SteamId;
	name: string | null;
	firstSeen: Date | null;
	lastSeen: Date | null;
	sessionCount: number; // sessions from this account on this IP
};

type WhoisIpView = {
	ip: string;
	accounts: WhoisIpAccount[];
	logs: WhoisSessionLog[]; // capped, most recent first
};

type AltLink = {
	steamid: SteamId;
	mainSteamId: SteamId | null;
	linkedAt: Date;
	linkedBy: string | null;
};

type AltLinkInput = {
	steamid: SteamId;
	mainSteamId: SteamId;
	linkedBy: string | null;
};

type AltCandidate = {
	steamid: SteamId;
	score: number; // 0..1
	label: 'Likely' | 'Possible' | 'Unlikely'; // >=0.7 / >=0.4 / else
	sharedIps: string[];
	knownNames: string[];
	evidence: { ipOverlapScore: number; nameSimilarityScore: number };
	lastSeen: Date | null; // most recent whois_logs activity for this account
};

// AltLink + the account's most recent whois_logs activity.
type AltInvestigationLink = AltLink & { lastSeen: Date | null };

type AltInvestigation = {
	// Top 25 by score, then re-sorted most-recent-activity-first.
	candidates: AltCandidate[];
	linkedAlts: AltInvestigationLink[]; // subject is the main, most recent first
	linkedMain: AltInvestigationLink | null; // subject is an alt of this link
};
```

Application service for search:

```ts
function investigateSteam(steamid: SteamId): Promise<FanOutResult<WhoisPlayerView | null>[]>;
function investigateIp(ip: string): Promise<FanOutResult<WhoisIpView>[]>;
```

## Alt candidate presentation

`AltInvestigation` renders on the Steam result panel as a branching tree (`alt-network-tree.svelte`), not a flat badge list:

- Root node: the searched subject.
- Branch: **Confirmed** — `linkedMain`/`linkedAlts`, one leaf per linked SteamID.
- Branches: **Likely** / **Possible** / **Unlikely** — one leaf per `AltCandidate` in that label, each with its own sub-branches showing shared IPs and known names (the evidence behind the score). `Unlikely` collapses behind a disclosure by default since it is usually the largest, noisiest group.

Every node (subject, confirmed alts/main, candidates) is stamped server-side with a live Steam persona name + avatar (`src/lib/server/whois-alt-avatars.ts`, one batched `getSteamProfiles` call per search) so the tree shows recognizable identities instead of raw SteamIDs; the SteamID stays visible as a subtext/link. Within each branch, nodes are ordered **most recent `whois_logs` activity first** (`lastSeen`), not by score/link date, so the freshest sightings are always at the top.

## IP reputation filtering

Before scanning for shared-IP alt candidates, `getAltInvestigation` drops any subject IP that is a known VPN or datacenter address, so coinciding on a public VPN exit node never counts as alt evidence.

- Data sources (IPv4-only, no API key, no per-lookup network call):
  - [X4BNet/lists_vpn](https://github.com/X4BNet/lists_vpn) (MIT): `output/vpn/ipv4.txt` + `output/datacenter/ipv4.txt` (downloaded into `data/ip-ranges/`).
  - [Cloudflare ips-v4](https://www.cloudflare.com/ips-v4/) (downloaded).
  - Every `*.txt` under committed [`ip-ranges/`](../../ip-ranges/) (one CIDR per line, `#` comments allowed). Drop new files here for manually found proxy/VPN/CDN blocks without code changes. Ships the ARIN `CLOUDFLARENET` `104.16.0.0/12` supplement (WARP egress like `104.28.x` is outside Cloudflare’s published CDN edge list; X4BNet also omits Cloudflare).
- Implemented in `src/lib/server/ip-reputation.ts`: `classifyIp(ip): 'vpn' | 'datacenter' | null`. Downloaded lists refresh lazily at most once per 24h; manual `ip-ranges/` files are re-read on that same refresh. A failed download keeps the last-known-good cache and never throws — worst case, classification degrades to `null` (treated as clean) rather than breaking Whois.
- Effect is scoring-only for now: flagged IPs are excluded from the subject's IP set before the shared-account scan runs, so `AltCandidate.sharedIps` never contains a VPN/datacenter address. Not yet surfaced as a badge or filter elsewhere in the UI (e.g. direct IP search still shows all accounts as-is).

## Result shape

Every adapter return value is wrapped `Sourced<T>` (per [sources.md](./sources.md)) before reaching the UI, so each panel/row carries its `sourceId`.

Partial failure: show errors per source without discarding successful ones, using the shared `source-error.svelte` treatment (see [modules/loading.md](./loading.md)).

## Alt links policy (v1)

- Stored in the **selected source’s** `whois_alt_links`.
- UI requires an explicit source for mutations.
- Read path may fan-out and show links from all sources side by side.
- Cross-source “same main everywhere” sync is later.
- `getAltInvestigation` candidates are **advisory only**: shared-IP + name-similarity scoring, never auto-linked. Staff still confirm via `/whois/alt`. Default window is 365 days; rarer shared IPs (fewer distinct accounts seen there) weigh more than common ones.

## Permissions

| Action                   | Role (proposed)    |
| ------------------------ | ------------------ |
| View Whois search        | `admin` or `owner` |
| Mutate alts / perm names | `admin` or `owner` |

Server enforces the same rules as the nav. No “visible but 403” mismatch.

## Acceptance checks

- A source without `whois` never appears in Whois fan-out.
- Search against two whois sources returns tagged sections when both have data.
- One source timing out still renders the other.
- Mutations require `sourceId` and fail if that source lacks `whois`.
- Search/results regions use skeletons (or per-source pending panels) instead of freezing the shell (see [loading.md](./loading.md)).
- Alt candidates never include the subject itself or SteamIDs already linked (as alt or main) to the subject on that source.
