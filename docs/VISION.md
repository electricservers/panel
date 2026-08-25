# Vision

Electric Panel is the web home for Electric Servers TF2 players and staff.

Players use it to understand how they play MGE: ratings, match history, head-to-head, and performance over a chosen time window. Staff use it to investigate accounts across game servers (Whois, alts) and to run panel configuration.

## Who it is for

- **Players** — browse rankings, games, profiles, versus pages. Steam login unlocks “my profile” shortcuts and future personal views.
- **Staff (`admin` / `owner`)** — Whois investigation, alt linking, and panel settings.

## Product principles

1. **Game-native, not enterprise admin.** Solid UI primitives, custom theme. Avoid generic SaaS dashboard aesthetics.
2. **Sources are first-class.** Game data lives in N MySQL databases. The panel never hardcodes `ar` / `br` as types or imports.
3. **Capabilities vary per source.** A source may expose `mgemod`, `whois`, both, or future plugins. UI and APIs ask for a capability, not “all tables everywhere.”
4. **Single-source by default.** Player MGE views target one source at a time. Multi-source is explicit and tagged.
5. **SteamID is the join key.** Cross-source identity is Steam (and its format variants), not invented global player IDs.
6. **Ship seams, not federation.** Config + adapters + optional fan-out. No universal query planner.
7. **Snappy navigation.** Every data page paints chrome + skeletons immediately, then swaps in real data. No frozen wait while `load` finishes heavy queries.

## Success for the rewrite

- Adding a third game DB is an admin-UI action, not a route rewrite or a new env var.
- Player core (home, ranking, games, profile, versus, date filters, Steam login) works against any `mgemod` source.
- Staff Whois can search across all `whois`-capable sources with results tagged by source.
- Old Flowbite template debt and duplicated AR/BR handlers are gone.
- Route changes feel responsive: skeletons first, data second (see [modules/loading.md](./modules/loading.md)).

## Non-goals (near term)

- Public cross-region ELO leaderboards that pretend ladders are comparable.
- Named competitive seasons as a required v1 feature.
- tf2pickup or jump modules.
- Replacing MGEMod game logic or writing into rating / stats tables.
- ELO reversion or other staff tools that mutate player ratings.
