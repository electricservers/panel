import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { getPanelEnv } from '$lib/server/env';
import * as schema from './schema';

function resolveDbFile(panelDbUrl: string): string {
	const withoutScheme = panelDbUrl.startsWith('file:')
		? panelDbUrl.slice('file:'.length)
		: panelDbUrl;
	return resolve(withoutScheme);
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
			dsn_env TEXT NOT NULL,
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
		)
	`);

	db = drizzle(sqlite, { schema });
	return db;
}
