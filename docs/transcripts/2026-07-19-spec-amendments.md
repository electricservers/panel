# Transcript: Spec amendments (2026-07-19)

Follow-up on the rewrite kickoff specs after cloning the repo on another machine.

---

## Panel app state and ELO reversion

**User:** Wanted two changes for the rewritten app:

1. Ditch MongoDB; use a simple local SQL database for the panel’s own configuration.
2. Ditch the entire ELO reversion workflow.

**Assistant:** Updated the living specs (left the kickoff transcript as historical):

- **App state → SQLite:** `ARCHITECTURE.md`, `auth.md`, `sources.md`, `ROADMAP.md` M0/M4 now use a local SQLite file for users, roles, and site settings. Mapping table notes Mongo → SQLite.
- **ELO reversion removed:** Dropped from `VISION.md`, `whois.md` (route, story, section, permissions), `auth.md` permissions, and M4. Listed under roadmap “Explicitly out.” Non-goal: panel does not write MGE rating tables.
- Decision log entries added for both choices.

---

## Skeletons-first loading

**User:** Important caveat: every page should show skeletons for data about to arrive, then swap in real data. Past SvelteKit apps felt frozen while `load` fetched everything.

**Assistant:** Added cross-cutting [modules/loading.md](../modules/loading.md): paint chrome + skeletons immediately; keep only fast work in blocking `load`; stream/defer slow queries; per-region pending states. Linked from vision, architecture, M0/M1 roadmap, and MGE/Whois acceptance checks.
