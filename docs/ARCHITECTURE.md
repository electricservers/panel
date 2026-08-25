# Architecture

## Stack (rewrite)

| Layer     | Choice                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------ |
| App       | SvelteKit 2, Svelte 5, TypeScript                                                                      |
| UI        | Tailwind 4 + shadcn-svelte (Bits UI). Own the components; theme for a game panel.                      |
| Game data | MySQL, one connection per **source**, accessed through plugin adapters                                 |
| App state | Local SQLite (users, roles, site settings, optional source registry overrides)                         |
| Auth      | Steam OpenID + signed session cookie (role lives server-side / in signed session, not raw client JSON) |
| Deploy    | Node adapter (Docker), same spirit as the previous panel                                               |

Charts and motion stay lightweight. Prefer small chart libs or custom SVG over heavy admin dashboard kits.

## Core concepts

### Source

A **source** is one game database the panel can query.

```ts
type SourceId = string; // e.g. "electric-ar", "electric-br"

type SourceConfig = {
	id: SourceId;
	label: string; // "Argentina", "Brasil"
	enabled: boolean;
	capabilities: Capability[];
};
```

Sources are loaded from a SQLite `sources` table, managed from `/admin/sources` (see [modules/sources.md](./modules/sources.md) and [modules/admin.md](./modules/admin.md)). The MySQL URL is pasted in that UI and stored as AES-256-GCM ciphertext in the same row. It is not an env var. Application code calls `getSource(id)`, never imports `prismaArg` / `prismaBr`.

### Capability (plugin)

A **capability** is a vertical slice of schema + queries a source may expose.

| Capability | Typical tables                                       | Audience |
| ---------- | ---------------------------------------------------- | -------- |
| `mgemod`   | `mgemod_stats`, `mgemod_duels`, …                    | Players  |
| `whois`    | `whois_logs`, `whois_permname`, `whois_alt_links`, … | Staff    |

Future capabilities (`sourcebans`, `vip`, …) register the same way. Absence of a capability means adapters for it are not created for that source.

### Scope

How a request selects data:

| Scope             | Meaning                              | v1 usage                                       |
| ----------------- | ------------------------------------ | ---------------------------------------------- |
| Single source     | One `sourceId`                       | All player MGE pages                           |
| Multi source      | Named set or “all with capability X” | Whois search; optional “also played on” badges |
| Mixed leaderboard | Merge ratings across sources         | **Out of scope** until explicitly productized  |

Every returned row that comes from game data carries `sourceId`.

### Join key

Cross-source correlation uses SteamID. Adapters normalize Steam2 / Steam3 / Steam64 at the boundary. The panel does not invent a global player primary key in MySQL.

## Layers

```text
UI (routes, components)
  → application services (use cases)
    → plugin adapters (MgeAdapter, WhoisAdapter, …)
      → source client (MySQL per SourceId)
  → app repositories (SQLite: users, settings)
```

Rules:

- Route handlers and `load` functions stay thin.
- Region/source switching is UI state that becomes a `sourceId` argument.
- No `switch (db) { case 'ar': … case 'br': … }` copies of query logic.
- Adapters may share SQL/Prisma schema fragments per capability, but each source gets its own client instance.

## Multi-source fan-out

When a use case needs more than one source:

1. Resolve target sources: explicit list, or `sources.withCapability('whois')`.
2. Run the same adapter method per source (parallel, bounded).
3. Return **tagged** results: `{ sourceId, … }` or `{ sourceId, items, error? }`.
4. Let the UI merge for display (timeline, tabs, badges). Do not hide provenance.

Failures are partial by default: one dead source should not fail the whole investigation page if others succeed.

## App state vs game state

| Store               | Owns                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| MySQL sources       | Authoritative game plugin data (stats, duels, whois logs)                                      |
| SQLite (local file) | Panel users/roles, site branding, enabled modules, source registry (metadata + encrypted DSNs) |

Panel DB is a single local file (e.g. `PANEL_DB_URL=file:./data/panel.db`). No MongoDB. Persist the file across deploys (Docker volume).

Game DBs remain read-mostly from the panel’s perspective. Panel writes into game DBs are limited to Whois staff tools (alt links, perm names) and always go through the owning source’s adapter. Rating / stats tables are never written by the panel.

## Auth and authorization

- Steam OpenID establishes identity.
- Panel role (`user` | `admin` | `owner`) stored in SQLite, attached to a **signed** session.
- Capability checks are separate from source checks: e.g. Whois UI requires staff role **and** at least one enabled `whois` source.

See [modules/auth.md](./modules/auth.md).

## UI direction

- shadcn-svelte for primitives (button, dialog, table, select, tabs, skeleton, …).
- Design tokens in CSS variables (brand, surfaces, danger/success for W/L).
- Navigation is a **collapsible sidebar**, not a top navbar. Sections split player-facing (Home, Ranking, Games, Versus, My Profile) from staff-only (Whois) and owner-only (Admin), with the source switcher pinned near the top.
- Layout: clear source switcher for MGE; staff tools emphasize multi-source results.
- Do not reintroduce Flowbite dashboard scaffolding.

## Loading and navigation

Navigation must not block on slow game-DB or Steam work. Pages render shell + **skeletons**, then replace regions as data arrives.

- Fast in `load`: auth, params, `sourceId`, source list for the switcher.
- Slow work: return streamed/deferred promises (or equivalent) so the client can show pending UI. Do not `await` everything before the page is sent.
- Keep root/layout `load` light. Heavy queries belong to the page (or page-scoped services), split by region when useful.

Details and acceptance checks: [modules/loading.md](./modules/loading.md).

## YAGNI boundary

**In architecture now**

- Source registry
- Capability declarations
- Per-capability adapters
- `sourceId` on domain DTOs
- Explicit multi-source fan-out helper

**Not in architecture now**

- Cross-database transactions
- Transparent global leaderboards
- Plugin marketplace / dynamic SQL discovery
- Shared sequence IDs across MySQL instances
- Named seasons as a storage model (date-range filters are enough until seasons are specified)

Litmus test: _If a third identical MGE+Whois server appeared tomorrow, would it work from `/admin/sources` with no code change?_ If not, the seam is wrong.

## Mapping from the old panel

| Old                           | New                                                         |
| ----------------------------- | ----------------------------------------------------------- |
| `Region = 'ar' \| 'br'`       | `SourceId` string from registry                             |
| `prismaArg` / `prismaBr`      | `getSource(id).client` via factory                          |
| `enabledRegions: ['ar','br']` | enabled sources in registry                                 |
| `enabledModules.mge/whois`    | module flags **and** whether any source has that capability |
| Whois always on AR            | Whois on every source with `whois` capability               |
| Client cookie JSON role       | Signed session + SQLite role                                |
| MongoDB app state             | Local SQLite file for panel config                          |
| ELO reversion staff tool      | Removed (not in rewrite)                                    |
