import { env } from '$env/dynamic/private';
import mysql from 'mysql2/promise';
import { getSourceDsnEnv } from '$lib/server/sources/registry';
import type { Source } from '$lib/server/sources/types';

const pools = new Map<string, mysql.Pool>();

/**
 * Lazily opens (and caches) one MySQL connection pool per source, shared by
 * every capability that source declares (`mgemod`, `whois`, ...). A source
 * with multiple capabilities points at one physical database, so capability
 * adapters wrap this same pool with their own Drizzle schema instead of each
 * opening their own connection.
 */
export function getSourcePool(source: Source): mysql.Pool {
	const existing = pools.get(source.id);
	if (existing) return existing;

	const dsnEnv = getSourceDsnEnv(source.id);
	const dsn = env[dsnEnv];
	if (!dsn) {
		throw new Error(`Source "${source.id}" has no DSN in env var "${dsnEnv}".`);
	}

	// utf8mb4 keeps `mgemod_stats` names decoding correctly; the mojibake
	// heuristic in $lib/mge/mojibake.ts covers older utf8-era rows.
	const pool = mysql.createPool({ uri: dsn, charset: 'utf8mb4' });
	pools.set(source.id, pool);
	return pool;
}

/** Closes and forgets a source's MySQL pool so admin edits to its DSN take effect immediately. */
export function invalidateSourcePool(sourceId: string): void {
	const pool = pools.get(sourceId);
	if (!pool) return;
	pools.delete(sourceId);
	void pool.end();
}
