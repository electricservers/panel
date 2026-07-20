# Module: Sources

Owns discovery and access to game databases. Every other game module depends on this.

## Goals

- Support **N** MySQL sources without code changes per source.
- Declare **capabilities** per source so missing plugins are normal.
- Provide one place to resolve clients and list sources for the UI.
- Make multi-source fan-out boring and explicit.

## Non-goals

- Auto-detecting schema/plugins by probing tables at runtime (optional later; config is enough).
- Merging incompatible schemas into one Prisma client.
- Cross-source transactions.

## Configuration

**SQLite-only (M4+).** Source metadata (`id`, `label`, `capabilities`, `enabled`, `dsnEnv`) lives in a `sources` table in the panel SQLite DB, managed through the admin UI (`/admin/sources`). DSNs stay out of the DB and out of git — `dsnEnv` only names an env var holding the real MySQL URL; the row stores the _pointer_, never the secret itself.

Before M4, `PANEL_SOURCES` env JSON was a temporary bootstrap. It is no longer read: `scripts/import-panel-sources.ts` is a one-time script that upserts any existing `PANEL_SOURCES` entries into the `sources` table, after which the env var can be deleted. There is no long-term env-and-DB hybrid — `listSources` never merges both.

Rules:

- `id` is stable and URL-safe (`electric-ar`, not display text).
- `dsnEnv` points at a secret URL; DSNs are never embedded in the `sources` table or committed to git.
- Unknown capability strings are rejected at write time (admin UI only offers `KNOWN_CAPABILITIES`).
- Changing a source's `dsnEnv`/`capabilities`/`enabled` takes effect immediately (no app restart): the admin mutation invalidates the in-memory sources cache, that source's capability adapter caches, and its MySQL pool. See [modules/admin.md](./admin.md) for the invalidation contract.

## Public API (application layer)

```ts
type Capability = 'mgemod' | 'whois'; // extend as plugins are added

type Source = {
	id: SourceId;
	label: string;
	enabled: boolean;
	capabilities: readonly Capability[];
};

function listSources(filter?: { capability?: Capability; enabled?: boolean }): Source[];
function getSource(id: SourceId): Source; // throws or Result if missing/disabled
function sourceHas(id: SourceId, capability: Capability): boolean;

// Client access is internal to adapters; routes do not take raw DB handles.
```

Fan-out helper:

```ts
type FanOutResult<T> =
	| {
			sourceId: SourceId;
			ok: true;
			data: T;
	  }
	| {
			sourceId: SourceId;
			ok: false;
			error: string;
	  };

function fanOut<T>(
	sources: Source[],
	run: (source: Source) => Promise<T>
): Promise<FanOutResult<T>[]>;
```

## Adapter binding

On boot (or lazy first use):

1. Load `SourceConfig[]`.
2. For each enabled source, open a MySQL client.
3. For each capability on that source, construct the matching adapter (`MgeAdapter`, `WhoisAdapter`).
4. Expose adapters only through a typed registry, e.g. `mge.for(sourceId)`, `whois.for(sourceId)`, `whois.all()`.

If a source lists `whois` but the schema is missing, fail that adapter loudly in logs; do not silently treat it as MGE-only.

## Schema strategy

Options considered:

| Approach                                                        | Verdict                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| One Prisma schema per source (old panel)                        | Reject for N sources                                          |
| One Prisma schema per **capability**, multiple client instances | Preferred                                                     |
| Raw SQL / Drizzle with capability modules                       | Acceptable alternative if Prisma multi-client packaging hurts |

v1 recommendation: **capability-scoped schema modules**, instantiate once per source that declares the capability. Sources that only have `mgemod` never load Whois models.

## UI contracts

- Source switcher reads `listSources({ capability: 'mgemod', enabled: true })`.
- Staff Whois landing can show which sources will be queried.
- Deep links may include `?source=electric-ar` (or path segment). Persist last player-selected source in localStorage by `id`, not by hardcoded enum.

## Domain DTO rule

Any game-originated DTO includes:

```ts
type Sourced<T> = T & { sourceId: SourceId };
```

## Acceptance checks

- Adding a third source via the admin UI plus its DSN env var makes it appear in the switcher with no TypeScript union edits and no restart.
- A source with only `mgemod` never breaks Whois module boot; Whois simply omits it.
- Disabling a source removes it from lists and fails closed on direct `getSource` for writes.
- `PANEL_SOURCES` is unset and unread; the app resolves sources from SQLite only.
