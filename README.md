# Electric Panel

Rewrite of the Electric Servers TF2 panel (SvelteKit 2, Svelte 5, Tailwind 4).

Product and architecture specs live in [docs/](./docs/README.md). Start there before adding features.

## Developing

```powershell
bun install
bun run dev
```

## Building

```powershell
bun run build
bun run preview
```

## Deploying (Docker)

The app runs on `@sveltejs/adapter-node`. Copy [.env.example](./.env.example) to `.env` and fill in real values first — `SESSION_SECRET`, `STEAM_API_KEY`, `STEAM_REALM`, `STEAM_RETURN_URL`, and one `SOURCE_*_URL` per MySQL source you'll add from `/admin/sources`.

```powershell
docker compose up --build -d
```

This builds the image, starts the app on port 3000, and persists the panel SQLite file in a named volume mounted at `/app/data` (`PANEL_DB_URL=file:./data/panel.db`), so it survives container recreation. Game data (MySQL) is never in this volume — it's connected to from the DSNs your `.env` supplies.

### Railway / fresh hosts

Your local `data/panel.db` is **not** uploaded with the image. A new deploy starts with an empty panel DB (no owners, no sources, default site settings).

1. Mount a **persistent volume** at `/app/data` and keep `PANEL_DB_URL=file:./data/panel.db` so users/sources survive redeploys.
2. Set `OWNER_STEAM_ID` to your Steam64. Log in once; that account becomes `owner`.
3. Set each source's MySQL URL env vars (`SOURCE_*_URL`), then recreate sources from `/admin/sources` (the `dsnEnv` pointer only, never the DSN itself in SQLite).
4. Point `STEAM_REALM` / `STEAM_RETURN_URL` at the public Railway URL.

### Repairing garbled MGEMod names

If `mgemod_stats.name` (or duel map/arena strings) were written through a non-utf8mb4 MySQL connection, dry-run then apply:

```powershell
bun run db:fix-mojibake
bun run db:fix-mojibake -- --apply
```

Requires `PANEL_DB_URL` plus each source's `SOURCE_*_URL`, or pass `--dsn-env SOURCE_ELECTRIC_AR_URL` explicitly. See [docs/modules/mge.md](./docs/modules/mge.md).
