import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { getPanelEnv } from '$lib/server/env';
import { deriveDsnKey, encryptDsn } from '$lib/server/secrets/dsn-crypto';
import * as schema from './schema';

function resolveDbFile(panelDbUrl: string): string {
	const withoutScheme = panelDbUrl.startsWith('file:')
		? panelDbUrl.slice('file:'.length)
		: panelDbUrl;
	return resolve(withoutScheme);
}

function tableColumns(sqlite: Database.Database, table: string): Set<string> {
	const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
	return new Set(cols.map((col) => col.name));
}

/**
 * Moves legacy `dsn_env` pointers into encrypted `dsn_ciphertext`, then drops
 * the env-pointer column. After this runs, runtime never reads SOURCE_*_URL.
 */
function migrateSourcesTable(sqlite: Database.Database) {
	const names = tableColumns(sqlite, 'sources');
	if (names.size === 0) return;

	if (!names.has('dsn_ciphertext')) {
		sqlite.exec(`ALTER TABLE sources ADD COLUMN dsn_ciphertext TEXT NOT NULL DEFAULT ''`);
	}

	if (!names.has('dsn_env')) return;

	const key = deriveDsnKey(getPanelEnv().SESSION_SECRET);
	const rows = sqlite.prepare(`SELECT id, dsn_env, dsn_ciphertext FROM sources`).all() as Array<{
		id: string;
		dsn_env: string;
		dsn_ciphertext: string;
	}>;
	const update = sqlite.prepare(`UPDATE sources SET dsn_ciphertext = ? WHERE id = ?`);
	let pending = 0;

	for (const row of rows) {
		if (row.dsn_ciphertext) continue;
		const dsn = env[row.dsn_env]?.trim();
		if (!dsn) {
			pending++;
			console.warn(
				`Source "${row.id}" has no encrypted DSN and env var "${row.dsn_env}" is unset. Paste the connection string in /admin/sources.`
			);
			continue;
		}
		try {
			update.run(encryptDsn(dsn, row.id, key), row.id);
		} catch (error) {
			pending++;
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(
				`Source "${row.id}": could not ingest the env DSN (${reason}). Paste the connection string in /admin/sources.`
			);
		}
	}

	if (pending > 0) return;

	sqlite.exec(`ALTER TABLE sources DROP COLUMN dsn_env`);
}

let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Lazily opens the panel SQLite file and returns a Drizzle client.
 * A single connection is reused for the lifetime of the process.
 */
export function getDb() {
	if (db) return db;

	const { PANEL_DB_URL } = getPanelEnv();
	const dbFile = resolveDbFile(PANEL_DB_URL);
	mkdirSync(dirname(dbFile), { recursive: true });

	sqlite = new Database(dbFile);
	sqlite.pragma('journal_mode = WAL');
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS users (
			steam_id TEXT PRIMARY KEY,
			role TEXT NOT NULL DEFAULT 'user',
			name TEXT,
			avatar TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS sources (
			id TEXT PRIMARY KEY,
			label TEXT NOT NULL,
			dsn_ciphertext TEXT NOT NULL,
			capabilities TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS site_settings (
			id INTEGER PRIMARY KEY,
			site_name TEXT NOT NULL DEFAULT 'Electric Panel',
			site_description TEXT,
			favicon_data BLOB,
			favicon_mime_type TEXT,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS module_toggles (
			capability TEXT PRIMARY KEY,
			enabled INTEGER NOT NULL DEFAULT 1,
			updated_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS voice_demos (
			id TEXT PRIMARY KEY,
			original_filename TEXT NOT NULL,
			uploader_steam_id TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'uploaded',
			map TEXT,
			duration_seconds INTEGER,
			error_message TEXT,
			recorded_at INTEGER,
			uploaded_at INTEGER NOT NULL,
			processed_at INTEGER
		)
	`);

	migrateSourcesTable(sqlite);

	const voiceCols = sqlite.prepare(`PRAGMA table_info(voice_demos)`).all() as Array<{
		name: string;
	}>;
	if (voiceCols.length > 0 && !voiceCols.some((col) => col.name === 'recorded_at')) {
		sqlite.exec(`ALTER TABLE voice_demos ADD COLUMN recorded_at INTEGER`);
	}

	db = drizzle(sqlite, { schema });
	return db;
}
