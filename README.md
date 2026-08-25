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

The app runs on `@sveltejs/adapter-node`. Copy [.env.example](./.env.example) to `.env` and fill in real values first — `SESSION_SECRET`, `STEAM_API_KEY`, `STEAM_REALM`, and `STEAM_RETURN_URL`. Game MySQL connection strings are not env vars. Paste them in `/admin/sources` after the first owner logs in.

```powershell
docker compose up --build -d
```

This builds the image, starts the app on port 3000, and persists the panel SQLite file in a named volume mounted at `/app/data` (`PANEL_DB_URL=file:./data/panel.db`), so it survives container recreation. Game data (MySQL) is never in this volume. Connection strings live encrypted in the panel DB.

`SESSION_SECRET` also wraps those stored DSNs (HKDF + AES-256-GCM). Use a long random value and do not rotate it unless you are ready to re-paste every source URL.

### Railway / fresh hosts

Your local `data/panel.db` is **not** uploaded with the image. A new deploy starts with an empty panel DB (no owners, no sources, default site settings).

1. Mount a **persistent volume** at `/app/data` and keep `PANEL_DB_URL=file:./data/panel.db` so users/sources survive redeploys.
2. Set `OWNER_STEAM_ID` to your Steam64. Log in once; that account becomes `owner`.
3. Open `/admin/sources` and paste each MySQL URL (`mysql://user:pass@host:3306/database`).
4. Point `STEAM_REALM` / `STEAM_RETURN_URL` at the public Railway URL.

### Repairing garbled MGEMod names

If `mgemod_stats.name` (or duel map/arena strings) were written through a non-utf8mb4 MySQL connection, dry-run then apply:

```powershell
bun run db:fix-mojibake
bun run db:fix-mojibake -- --apply
```

Requires `PANEL_DB_URL` and `SESSION_SECRET` so the script can decrypt stored DSNs, or pass `--dsn mysql://...` explicitly. See [docs/modules/mge.md](./docs/modules/mge.md).
