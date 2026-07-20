# Transcript: Rewrite kickoff (2026-07-19)

Planning session that produced the initial `docs/` specs, the source/capability architecture decision, and the first push to a private GitHub repo.

---

## 15:24 — Starting the rewrite, choosing a UI library, spec-driven approach

**User:** Wanted to rewrite the old panel (`panel`) inside `electric-panel` using SvelteKit, rethink architecture, and decide on a UI library that is solid and renowned but not "too enterprisey" for a videogame panel. Asked whether a spec-driven development document should guide the rewrite.

**Assistant:**

- Explored the old panel (`C:\Users\Maxi\Documents\GitHub\panel`): SvelteKit 2 + Svelte 5 + Flowbite-Svelte + Prisma (two MySQL datasources, AR/BR) + Mongo, Steam OpenID auth. Modules: MGE stats/rankings/games/profiles/versus, staff Whois (alt linking, ELO reversion), admin.
- Confirmed `electric-panel` was already a clean SvelteKit 5 + Tailwind 4 scaffold.
- Recommended **shadcn-svelte** (Bits UI + Tailwind) over Flowbite/Skeleton: components are owned/copied into the repo, accessible, themeable, avoids generic SaaS-dashboard look.
- Proposed a lean spec set: `VISION.md`, `ARCHITECTURE.md`, `modules/*.md`, `ROADMAP.md`.
- Asked two scoping questions: v1 scope (player core vs. player+staff) and what "period of time" should mean (date filters vs. named seasons).

## 15:32 — Rethinking hardcoded regions into N dynamic sources

**User:** Raised that the old panel hardcodes reading from two databases (AR/BR) and wanted to support N databases dynamically, including databases that mix capabilities (e.g. both `mgemod` and `whois`), with occasional cross-referencing of data. Also asked how to scope this without over-engineering (YAGNI concerns).

**Assistant:**

- Diagnosed the actual problem: `Region = 'ar' | 'br'` and direct `prismaArg` / `prismaBr` imports baked into route code, not just "two databases."
- Proposed a three-layer mental model: **Source** (one DB connection) → **Capability** (plugin surface like `mgemod` or `whois`, declared per source) → **Scope** (single-source default, explicit multi-source fan-out, mixed leaderboards out of scope).
- Recommended building now: config-driven sources, a `getSource(id)` factory, capability-scoped adapters (`MgeAdapter`, `WhoisAdapter`), single-source UI by default, `sourceId` tagged on every returned row.
- Recommended **not** building yet: automatic global leaderboards, transparent cross-DB merges, a generic query planner, shared cross-DB IDs, cross-DB transactions.
- Distinguished MGE (players, single-source by default, ladders not comparable across sources) from Whois (staff, naturally multi-source, tagged timelines, no fake unified table).
- Gave a scoping litmus test: _if a third identical MGE+Whois server appeared tomorrow, would today's code still work with only config changes?_

## 15:40 — Writing the docs

**User:** Asked to create those documents.

**Assistant:** Wrote the spec set into `electric-panel/docs/`:

- `docs/README.md` — index of all specs.
- `docs/VISION.md` — who it's for, product principles (game-native UI, sources first-class, capabilities vary per source, single-source by default, SteamID as join key, seams not federation), success criteria, non-goals.
- `docs/ARCHITECTURE.md` — stack table, `Source` / `Capability` / `Scope` types, layering (UI → application services → adapters → source client), multi-source fan-out pattern, app-state vs. game-state split, auth/authorization split, UI direction, explicit YAGNI boundary, and an old-panel-to-new mapping table.
- `docs/ROADMAP.md` — milestones M0 (specs + foundation) through M5 (hardening), an "explicitly later" list (seasons, cross-source leaderboards, global alt graph, extra capabilities, 2v2/tf2pickup), and a decision log.
- `docs/modules/sources.md` — source registry config shape (`PANEL_SOURCES` env JSON), public API (`listSources`, `getSource`, `sourceHas`, `fanOut`), adapter binding rules, schema strategy, UI contracts, acceptance checks.
- `docs/modules/mge.md` — player-facing MGE spec: user stories, routes, `MgeAdapter` surface, time filters, arena canonicalization, limited multi-source (existence badges only), permissions, acceptance checks.
- `docs/modules/whois.md` — staff investigation spec: multi-source fan-out by default, `WhoisAdapter` surface, tagged result shape, alt-link policy (per-source in v1), ELO reversion orchestration, permissions table, acceptance checks.
- `docs/modules/auth.md` — Steam OpenID + signed session (replacing the old panel's unsigned JSON cookie), session shape, permissions summary table, acceptance checks.
- Rewrote the root `README.md` to point at `docs/`.

## 20:04 — Off topic

**User:** Mentioned losing the 2026 World Cup final and feeling down about it.

**Assistant:** Acknowledged it briefly and noted the project would still be there at milestone M0 when ready to continue.

## 21:15 — Pushing to a private GitHub repository

**User:** Asked to push `electric-panel` to a private repository.

**Assistant:**

- Found no existing git repo and no GitHub CLI (`gh`) installed.
- Asked the user to choose between installing `gh` now vs. manually creating an empty repo. User chose to install `gh`.
- Installed GitHub CLI via `winget`, authenticated via device-code web login (user completed the browser approval), confirmed login as `maxijabase`.
- Ran `git init`, staged all files, verified no secrets were staged (`.env` ignored, `.cursor/mcp.json` and `.npmrc` inspected and clean), confirmed global git identity was already configured.
- Committed as "Initial commit: SvelteKit scaffold and rewrite specs".
- Created the private repo and pushed in one step: `gh repo create electric-panel --private --source=. --remote=origin --push`.
- Verified visibility via `gh repo view` → `"visibility":"PRIVATE"`.

Result: [github.com/maxijabase/electric-panel](https://github.com/maxijabase/electric-panel), private, `master` branch pushed.

## 21:22 — Versioning this transcript

**User:** Asked to version this conversation's transcript as well.

**Assistant:** Wrote this document and committed/pushed it to the same repository.
