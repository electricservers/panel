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
