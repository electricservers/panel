# Electric Panel

Web panel for TF2 MGE stats, rankings, and admin tools. Built with SvelteKit, Tailwind CSS, Flowbite-Svelte, Prisma, and MySQL backends for multiple regions.

### Features
- Player profiles with rank, win/loss, activity heatmap, arenas, and top foes
- Head-to-head comparison and match history
- Regional data (Argentina, Brasil) with quick switching
- Steam OpenID login and profile integration
- Admin pages for users, modules, and settings

### Tech stack
- SvelteKit 2, Svelte 5, Vite 5
- Tailwind CSS 3, Flowbite-Svelte
- Prisma 6 with two MySQL datasources (`@prisma-arg`, `@prisma-br`)
- MongoDB for users/sessions and settings

## Getting started

### Prereqs
- Node 20+
- pnpm 9+
- MySQL databases for both regions
- MongoDB
- Steam API key

### Install
```powershell
pnpm install
```

### Configure environment
Set environment variables via your shell, `.env`, or container environment.

- DATABASE_URL_1: MySQL connection string for Argentina (used by `@prisma-arg`)
- DATABASE_URL_2: MySQL connection string for Brasil (used by `@prisma-br`)
- MONGODB_URI: Mongo connection string (e.g. mongodb://user:pass@host:27017/panel?authSource=admin)
- STEAM_API_KEY: Steam Web API key

Example `.env`:
```env
DATABASE_URL_1="mysql://user:pass@host:3306/db_arg"
DATABASE_URL_2="mysql://user:pass@host:3306/db_br"
MONGODB_URI="mongodb://user:pass@mongo:27017/panel?authSource=admin"
STEAM_API_KEY="your_steam_api_key"
```

### Generate Prisma clients
```powershell
pnpm prisma generate --schema prisma/schema_br.prisma
pnpm prisma generate --schema prisma/schema_arg.prisma
```

### Run in development
```powershell
pnpm dev
```

App listens on http://localhost:5173 by default (Vite dev server).

### Typecheck and lint
```powershell
pnpm check
pnpm lint
```

## Build
The build script generates both Prisma clients and compiles the app.
```powershell
pnpm build
```

### Preview production build
```powershell
pnpm preview
```

## Docker

Build and run the image:
```powershell
docker build -t electricpanel .
docker run -p 3000:3000 `
  -e HOST=0.0.0.0 -e PORT=3000 `
  -e MONGODB_URI="mongodb://user:pass@mongo:27017/panel?authSource=admin" `
  -e STEAM_API_KEY=your_steam_api_key `
  -e DATABASE_URL_1="mysql://user:pass@host:3306/db_arg" `
  -e DATABASE_URL_2="mysql://user:pass@host:3306/db_br" `
  --name electricpanel-app electricpanel
```

Or use docker-compose (edit placeholders first):
```powershell
docker compose up -d --build | cat
```