# Module: Admin

Owner-only panel management: users/roles, site branding, module toggles, and the sources registry.

## Goals

- Let an `owner` manage everything that used to require editing `.env` or the codebase: sources, roles, branding, and which modules are live.
- Module toggles are **enforced**, not decorative: disabling a module hides its nav and 404s its routes.
- Adding a future capability (`sourcebans`, `vip`, …) never requires editing the admin layer's plumbing — only the capability's own adapter files plus a `Capability` union entry.

## Non-goals

- Fine-grained permissions beyond `user` / `admin` / `owner` (see [modules/auth.md](./auth.md)).
- A plugin marketplace or runtime capability discovery — out of scope per [ARCHITECTURE.md](../ARCHITECTURE.md)'s YAGNI boundary. Capabilities are declared in code (`Capability` union); this module only toggles and configures them.
- Editing raw DSNs from the UI. `dsnEnv` is a pointer to an env var; the secret itself never enters SQLite or the admin forms.

## Permissions

Per [modules/auth.md](./auth.md)'s permission table, all of `/admin/*` requires role `owner`. `admin` gets Whois but not Admin — the sidebar and every `+layout.server.ts`/`+page.server.ts`/action under `/admin` use the same `requireRole(locals, ['owner'])` check so nav visibility and server enforcement can't drift apart.

## Sources admin (`/admin/sources`)

Source metadata (`id`, `label`, `dsnEnv`, `capabilities`, `enabled`) lives in the `sources` SQLite table (see [modules/sources.md](./sources.md)). The admin page is straightforward CRUD: create (id/label/dsnEnv/capability checkboxes), edit, enable/disable, delete.

### Cache invalidation contract

Three independent things are cached in memory per `sourceId` and must be invalidated whenever a source row changes:

| Cache                   | Owner                                                           | Invalidation                                |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| Sources list            | [sources/registry.ts](../../src/lib/server/sources/registry.ts) | `invalidateSourcesCache()`                  |
| MySQL connection pool   | [sources/pool.ts](../../src/lib/server/sources/pool.ts)         | `invalidateSourcePool(sourceId)`            |
| Per-capability adapters | one cache per capability module (`mge.ts`, `whois.ts`, …)       | `invalidateCapabilitiesForSource(sourceId)` |

The pool is shared infrastructure (one source can have multiple capabilities pointed at the same database), so it is invalidated directly, not through the capability registry. Every `/admin/sources` mutation calls all three, unconditionally, in that order:

```ts
invalidateSourcesCache();
invalidateCapabilitiesForSource(sourceId);
invalidateSourcePool(sourceId);
```

None of these three calls name `mgemod` or `whois` — the admin route stays capability-agnostic.

### Capability self-registration

Each capability module registers its own cache invalidation hook instead of the admin layer knowing about it:

```ts
// src/lib/server/sources/capability-registry.ts
type CapabilityHooks = { invalidate(sourceId: SourceId): void };
function registerCapability(capability: Capability, hooks: CapabilityHooks): void;
function invalidateCapabilitiesForSource(sourceId: SourceId): void; // calls every registered hook
```

`mge.ts` and `whois.ts` each call `registerCapability(...)` once, at module load, with a hook that clears their own adapter cache for that `sourceId`. `src/lib/server/sources/register-capabilities.ts` imports both modules purely for that side effect and is itself imported once from `hooks.server.ts`, so registration has always happened before any admin mutation runs — it doesn't depend on which routes happened to be hit first in that process.

**Adding a new capability touches exactly two spots:** add it to the `Capability` union in [sources/types.ts](../../src/lib/server/sources/types.ts), and call `registerCapability(...)` in the new module (plus adding it to the `register-capabilities.ts` barrel). The admin UI, the sources cache, and the invalidation contract need no changes.

## Module toggles (`/admin/settings`)

Toggles are stored as **one row per capability**, not one column per capability:

```ts
// site_settings-adjacent table
export const moduleToggles = sqliteTable('module_toggles', {
	capability: text('capability').primaryKey().$type<Capability>(),
	enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
```

- `isModuleEnabled(capability)`: missing row defaults to `true` — a brand-new capability with no row yet works with no migration or seed.
- `setModuleEnabled(capability, enabled)`: upsert.
- `listModuleToggles()`: iterates `KNOWN_CAPABILITIES`, left-joins stored overrides. `/admin/settings` renders one checkbox row per entry via a loop — never a hardcoded "mge checkbox" and "whois checkbox".

### Enforcement

`src/lib/server/require-module.ts` exports `requireModule(capability: Capability)`, throwing `error(404, ...)` when disabled. Every mge/whois route `load` and form `action` calls it as the first line (see [modules/mge.md](./mge.md) and [modules/whois.md](./whois.md) for the exact route list). The home page is the one exception: it reads the toggle instead of hard-failing, and skips the mge sections gracefully so the page still renders.

The root layout (`+layout.server.ts`) exposes `moduleToggles: listModuleToggles()` alongside the source list, so the sidebar can filter nav items without a DB round trip per page. A nav item still has to know which capability it belongs to (the Ranking link is inherently an MGE page) — that per-item mapping is unavoidable UI wiring, not a schema or cache hardcoding problem.

## Site settings (`/admin/settings`)

Branding only — no capability-specific fields. `siteName` and `siteDescription` drive the document title, meta description, sidebar brand, and home hero (not just the admin form):

```ts
export const siteSettings = sqliteTable('site_settings', {
	id: integer('id').primaryKey(), // singleton, always row id 1
	siteName: text('site_name').notNull().default('Electric Panel'),
	siteDescription: text('site_description'),
	faviconData: blob('favicon_data', { mode: 'buffer' }),
	faviconMimeType: text('favicon_mime_type'),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});
```

Favicon is uploaded (multipart form, validated size/mime) and stored as a blob in SQLite, not on disk — served back at `/favicon.ico` (`src/routes/favicon.ico/+server.ts`), falling back to the static default asset when no row is set. A "remove favicon" action clears the blob.

## Users admin (`/admin/users`)

Lists everyone who has ever logged in (`users` table — there's no external roster to reconcile against). Each row gets a role dropdown (`user` / `admin` / `owner`). The `updateRole` action rejects a mutation that would demote the last remaining `owner`, so the panel can't lock itself out of its own admin UI.

## Acceptance checks

- Creating, editing, disabling, and deleting a source via `/admin/sources` takes effect immediately, no restart, verified against a live source.
- Disabling `mgemod` hides player nav and 404s every `/mge/*` route (except the home page, which degrades gracefully); disabling `whois` does the same for `/whois/*`, even for an `owner`.
- An `admin`-role account gets 403 on every `/admin/*` route and never sees the Admin nav group.
- Demoting the only `owner` account is rejected with a clear error, not silently applied.
- Favicon upload/removal round-trips and is visible in the browser tab without a restart.
