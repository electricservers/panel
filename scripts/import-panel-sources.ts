/**
 * One-time migration: reads the legacy PANEL_SOURCES env JSON and upserts
 * each entry into the panel SQLite `sources` table, encrypting the DSN from
 * the named env var. Run once with `bun run scripts/import-panel-sources.ts`,
 * then delete PANEL_SOURCES and SOURCE_*_URL from .env.
 *
 * Standalone (no SvelteKit `$env`/`$lib` aliases) so it can run outside the
 * Vite dev/build pipeline; talks to the same SQLite file the app uses via
 * PANEL_DB_URL, and duplicates the `sources` bootstrap DDL defensively in
 * case this runs against a fresh DB file before the app has started once.
 */
import { Database } from 'bun:sqlite';
import { deriveDsnKey, encryptDsn, parseMysqlDsn } from '../src/lib/server/secrets/dsn-crypto.ts';

type LegacySourceConfig = {
	id: string;
	label: string;
	dsnEnv?: string;
	dsn?: string;
	capabilities: string[];
	enabled: boolean;
};

function resolveDbFile(panelDbUrl: string): string {
	return panelDbUrl.startsWith('file:') ? panelDbUrl.slice('file:'.length) : panelDbUrl;
}

function tableColumns(db: Database, table: string): Set<string> {
	return new Set(
		(db.query(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
			(col) => col.name
		)
	);
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
	const sessionSecret = process.env.SESSION_SECRET;
	if (!sessionSecret) {
		throw new Error('SESSION_SECRET is not set. Needed to encrypt connection strings.');
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
			dsn_ciphertext TEXT NOT NULL,
			capabilities TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`);

	const names = tableColumns(db, 'sources');
	if (!names.has('dsn_ciphertext')) {
		db.exec(`ALTER TABLE sources ADD COLUMN dsn_ciphertext TEXT NOT NULL DEFAULT ''`);
	}
	const hasDsnEnv = tableColumns(db, 'sources').has('dsn_env');

	const key = deriveDsnKey(sessionSecret);
	const existingIds = new Set(
		db
			.query('SELECT id FROM sources')
			.all()
			.map((row) => (row as { id: string }).id)
	);

	const insert = hasDsnEnv
		? db.prepare(`
			INSERT INTO sources (id, label, dsn_env, dsn_ciphertext, capabilities, enabled, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`)
		: db.prepare(`
			INSERT INTO sources (id, label, dsn_ciphertext, capabilities, enabled, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`);

	let imported = 0;
	for (const config of configs) {
		if (existingIds.has(config.id)) {
			console.log(`Skipping "${config.id}" — already exists in sources table.`);
			continue;
		}
		const dsn = config.dsn?.trim() || (config.dsnEnv ? process.env[config.dsnEnv]?.trim() : '');
		if (!dsn) {
			console.warn(
				`Skipping "${config.id}" — no DSN on the entry and env var "${config.dsnEnv ?? ''}" is unset.`
			);
			continue;
		}
		try {
			parseMysqlDsn(dsn);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(`Skipping "${config.id}" — ${reason}`);
			continue;
		}

		const now = Date.now();
		const ciphertext = encryptDsn(dsn, config.id, key);
		if (hasDsnEnv) {
			insert.run(
				config.id,
				config.label,
				config.dsnEnv ?? '',
				ciphertext,
				JSON.stringify(config.capabilities),
				config.enabled ? 1 : 0,
				now,
				now
			);
		} else {
			insert.run(
				config.id,
				config.label,
				ciphertext,
				JSON.stringify(config.capabilities),
				config.enabled ? 1 : 0,
				now,
				now
			);
		}
		imported++;
		console.log(`Imported "${config.id}".`);
	}

	console.log(`Done. Imported ${imported} of ${configs.length} source(s).`);
	if (imported > 0) {
		console.log('You can now remove PANEL_SOURCES and SOURCE_*_URL from .env.');
	}
}

main();
