# Roadmap

Ordered milestones for the rewrite. Each milestone should leave the app usable or clearly demoted (feature flagged), not half-migrated in production paths.

## M0 — Specs and foundation

- [x] Vision, architecture, module specs
- [x] Install shadcn-svelte, base theme tokens, app shell layout, shared Skeleton primitives
- [x] Env/config loading for SQLite panel DB + Steam
- [x] Source registry skeleton (config → `getSource`, capability helpers)
- [x] Signed Steam session (login / return / logout / `locals.user`)
- [x] Establish skeletons-first loading pattern (see [modules/loading.md](./modules/loading.md)); demo on one placeholder page

**Exit:** empty shell, auth works, sources resolve from config (even if unused by UI). Loading pattern agreed and reusable. Done 2026-07-19.

## M1 — Sources + MGE single-source core

- [x] `MgeAdapter` against `mgemod_stats` / `mgemod_duels`
- [x] Source switcher in UI (dynamic list)
- [x] Pages: home (lightweight), ranking, games browser, player profile, versus
- [x] Date-range filters (`from` / `to`, presets 7/30/90 days)
- [x] Steam profile enrichment for avatars/names where needed
- [x] Arena name canonicalization ported from old panel
- [x] Every M1 page uses skeletons-first loading (no blocking full-await `load`)

**Exit:** players can use the panel on any configured `mgemod` source the way they use AR/BR today. Navigating between those pages feels snappy. Done 2026-07-19.

## M2 — Richer player stats

- [x] Activity histograms (time-of-day / weekday)
- [x] Top foes, most-played arenas, trending arenas
- [x] Profile “also present on other sources” badges (dumb fan-out of existence checks)
- [x] Performance polish: fewer waterfalls, server `load` where it helps

**Exit:** profiles feel deeper than a W/L table; multi-source is only badges + tagged data, not merged ladders. Done 2026-07-20.

## M3 — Whois (staff)

- [x] `WhoisAdapter` per `whois`-capable source
- [x] Search by Steam / IP / vanity with multi-source fan-out
- [x] Session logs, name history, perm names
- [x] Alt linking (per-source first)
- [x] Role gates aligned (sidebar vs server)

**Exit:** staff can investigate across all whois sources with provenance. Done 2026-07-20.

## M4 — Admin

- [x] Admin: users/roles, site settings, module toggles (SQLite)
- [x] `sources` SQLite table + admin UI (create/edit/enable/disable, encrypted DSN per source)
- [x] Migrate `listSources`/`getSource` to read from SQLite; drop `PANEL_SOURCES` env parsing
- [x] One-time import of existing `PANEL_SOURCES` entries into the new table (manual or scripted)

**Exit:** owner/admin can manage panel config, roles, and sources entirely from the DB. `PANEL_SOURCES` env var is no longer read. Module toggles are enforced (hidden nav + 404'd routes), not decorative. Done 2026-07-20.

## M5 — Hardening

- [x] adapter-node + Docker path
- [x] CI check/lint/knip/build
- [x] Partial failure UX for multi-source
- [x] Remove leftover scaffold noise

**Exit:** app builds and runs from a container with a persisted SQLite volume; every push/PR runs `check` + `lint` + `knip` + `build`; multi-source partial failures (Whois search/alt, MGE presence badges) share one `source-error.svelte` treatment instead of bespoke per-page markup; the M0 `demo/loading` scaffold page is gone. Done 2026-07-20.

## M6 — Voice reconstruction (staff)

- [x] `docs/modules/voice.md` + `voice_demos` SQLite table
- [x] `voice-processor` Rust CLI (from steam-audio-codec) with per-utterance WAVs + manifest
- [x] Staff `/voice` upload/list/process + `/voice/[id]` timeline playback
- [x] Docker multi-stage build ships the CLI binary beside the Node app

**Exit:** staff can upload a TF2 demo, process voice, and replay a chronological reconstruction with a glowing speaker sidebar. Auth is existing Steam roles only.

## Next (player MGE)

- Profile versus CTA (“See my stats vs this player”), rating-over-time + peak, and class breakdown. Read-only from `mgemod_duels`. Not ELO reversion.

## Explicitly later

- Named seasons / frozen period leaderboards
- Cross-source merged MGE leaderboards
- Global alt graph across sources
- Additional capabilities (sourcebans, vip, …)
- 2v2 MGE, tf2pickup
- Automatic demo transfer from game servers
- Voice module async job queue / text-chat correlation

## Explicitly out

- MongoDB (or any remote DB) for panel app state
- ELO reversion and other panel writes into MGE rating tables

## Decision log

| Date       | Decision                                                                                                                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-19 | N sources via registry + capabilities; no hardcoded AR/BR clients                                                                                                                                                                                                                                                                                   |
| 2026-07-19 | Player MGE is single-source by default                                                                                                                                                                                                                                                                                                              |
| 2026-07-19 | Whois uses explicit multi-source fan-out                                                                                                                                                                                                                                                                                                            |
| 2026-07-19 | UI: shadcn-svelte + Tailwind 4                                                                                                                                                                                                                                                                                                                      |
| 2026-07-19 | Time scope v1: date-range filters, not seasons                                                                                                                                                                                                                                                                                                      |
| 2026-07-19 | Panel app state in local SQLite, not MongoDB                                                                                                                                                                                                                                                                                                        |
| 2026-07-19 | Drop ELO reversion from the rewrite                                                                                                                                                                                                                                                                                                                 |
| 2026-07-19 | Skeletons-first loading; do not block navigation on heavy `load` awaits                                                                                                                                                                                                                                                                             |
| 2026-07-19 | Panel SQLite via Drizzle ORM + better-sqlite3; startup-bootstrapped schema, drizzle-kit reserved for future migrations                                                                                                                                                                                                                              |
| 2026-07-19 | UI preset: shadcn-svelte "nova" style, zinc base, Space Grotesk + Oxanium heading, small radius, custom brand/success/danger tokens                                                                                                                                                                                                                 |
| 2026-07-19 | Pinned `typescript` to `^5.9.3` (scaffold shipped `^7.0.2`, the native-compiler preview, which crashes `svelte-check`)                                                                                                                                                                                                                              |
| 2026-07-19 | Navigation is a collapsible sidebar (player vs staff sections), not a top navbar; M0's navbar is scaffold-only                                                                                                                                                                                                                                      |
| 2026-07-19 | `PANEL_SOURCES` env JSON is a temporary M0–M3 bootstrap only; M4 migrates source metadata fully into SQLite and removes env parsing. No permanent env/DB hybrid for sources.                                                                                                                                                                        |
| 2026-07-20 | Added knip as a dead-code gate; vendored shadcn `ui/**` barrels are excluded via `knip.jsonc`, run after every milestone stage                                                                                                                                                                                                                      |
| 2026-07-20 | Confirmed against `whois.sp` (the SourceMod plugin that writes the whois tables): `whois_logs`/`whois_permname`/`whois_alt_links` all store `AuthId_Steam2` consistently, so whois lookups reuse `toSteamId2()` instead of a multi-format variant expansion                                                                                         |
| 2026-07-20 | Module toggles are one row per capability in `module_toggles` (missing row defaults to enabled), never a `mgeEnabled`/`whoisEnabled`-shaped column — a future capability needs no schema change to get a toggle                                                                                                                                     |
| 2026-07-20 | Capability cache invalidation is self-registered: each capability module (`mge.ts`, `whois.ts`) calls `registerCapability(...)` with its own adapter-cache-clearing hook; the admin sources action calls the generic `invalidateCapabilitiesForSource` plus `invalidateSourcesCache`/`invalidateSourcePool`, never naming `mgemod`/`whois` directly |
| 2026-07-20 | Favicon is stored as a SQLite blob (`site_settings.favicon_data`), not a static file, served back through `/favicon.ico/+server.ts`                                                                                                                                                                                                                 |
| 2026-07-20 | Deploy target is Docker only (`adapter-node`), no Railway/Nixpacks config; both Dockerfile stages pin `node:22-bookworm-slim` so the `better-sqlite3` native addon built at build time stays glibc-compatible at runtime                                                                                                                            |
| 2026-07-20 | CI hygiene gate runs sequentially on every push/PR to `master`: `check` → `lint` → `knip` → `build`; no test framework added in M5                                                                                                                                                                                                                  |
| 2026-07-20 | Multi-source partial failures (Whois search/alt, MGE presence badges) render through one shared `source-error.svelte` (`panel`/`inline`/`badge` variants); user-facing copy stays generic, raw adapter errors only surface via `title` for staff                                                                                                    |
| 2026-07-27 | Voice reconstruction is a staff module (`/voice`), not a MySQL `Capability`; processing is a panel-agnostic `voice-processor` CLI spawned as a subprocess, with demos/WAVs on the SQLite volume under `/app/data/voice`                                                                                                                             |
| 2026-08-25 | Source MySQL URLs are panel data, not env config: owners paste a `mysql://` DSN in `/admin/sources`; SQLite stores AES-256-GCM ciphertext keyed from `SESSION_SECRET`. Runtime does not read `SOURCE_*_URL` or `dsnEnv`.                                                                                                                            |
