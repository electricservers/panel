/**
 * One-time migration: reads the legacy PANEL_SOURCES env JSON and upserts
 * each entry into the panel SQLite `sources` table. Run once with
 * `bun run scripts/import-panel-sources.ts`, then delete PANEL_SOURCES from
 * .env — nothing in the app reads it anymore.
 *
 * Standalone (no SvelteKit `$env`/`$lib` aliases) so it can run outside the
 * Vite dev/build pipeline; talks to the same SQLite file the app uses via
 * PANEL_DB_URL, and duplicates the `sources` bootstrap DDL defensively in
 * case this runs against a fresh DB file before the app has started once.
 */
import { Database } from 'bun:sqlite';

type LegacySourceConfig = {
	id: string;
	label: string;
	dsnEnv: string;
	capabilities: string[];
	enabled: boolean;
};

function resolveDbFile(panelDbUrl: string): string {
	return panelDbUrl.startsWith('file:') ? panelDbUrl.slice('file:'.length) : panelDbUrl;
}

function main() {
	const raw = process.env.PANEL_SOURCES;
	if (!raw || raw.trim() === '') {
		console.log('PANEL_SOURCES is not set. Nothing to import.');
		return;
	}

	const panelDbUrl = process.env.PANEL_DB_URL;
	if (!panelDbUrl) {
		throw new Error('PANEL_DB_URL is not set.');
	}

	const configs = JSON.parse(raw) as LegacySourceConfig[];
	if (!Array.isArray(configs) || configs.length === 0) {
		console.log('PANEL_SOURCES parsed to an empty array. Nothing to import.');
		return;
	}

	const db = new Database(resolveDbFile(panelDbUrl));
	db.exec(`
		CREATE TABLE IF NOT EXISTS sources (
			id TEXT PRIMARY KEY,
			label TEXT NOT NULL,
			dsn_env TEXT NOT NULL,
			capabilities TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	const existingIds = new Set(
		db
			.query('SELECT id FROM sources')
			.all()
			.map((row) => (row as { id: string }).id)
	);

	const insert = db.prepare(`
		INSERT INTO sources (id, label, dsn_env, capabilities, enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);

	let imported = 0;
	for (const config of configs) {
		if (existingIds.has(config.id)) {
			console.log(`Skipping "${config.id}" — already exists in sources table.`);
			continue;
		}
		const now = Date.now();
		insert.run(
			config.id,
			config.label,
			config.dsnEnv,
			JSON.stringify(config.capabilities),
			config.enabled ? 1 : 0,
			now,
			now
		);
		imported++;
		console.log(`Imported "${config.id}".`);
	}

	console.log(`Done. Imported ${imported} of ${configs.length} source(s).`);
	if (imported > 0) {
		console.log('You can now remove PANEL_SOURCES from .env.');
	}
}

main();
